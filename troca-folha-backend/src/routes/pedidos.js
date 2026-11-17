const express = require("express");
const pool = require("../db");
const { autenticar } = require("../middleware/auth");
const { preference } = require("../mercadoPago");

const router = express.Router();


const { payment } = require("../mercadoPago");

// Consultar o status de pagamento de um pedido
router.get("/:id/status", autenticar, async (req, res, next) => {
  let conexao;

  try {
    const idPedido = Number(req.params.id);
    const idUsuario = req.usuario.id_usuario;

    if (!Number.isInteger(idPedido) || idPedido <= 0) {
      return res.status(400).json({
        erro: "ID do pedido inválido.",
      });
    }

    conexao = await pool.getConnection();

    // Verificar se o pedido pertence ao usuário
    const [pedidos] = await conexao.query(
      `SELECT id_pedido, valor_total, status
       FROM pedidos
       WHERE id_pedido = ?
         AND id_usuario = ?`,
      [idPedido, idUsuario]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({
        erro: "Pedido não encontrado.",
      });
    }

    const pedido = pedidos[0];

    // Consultar pagamentos no Mercado Pago pela referência externa
    const respostaMP = await payment.search({
      options: {
        external_reference: String(idPedido),
        sort: "date_created",
        criteria: "desc",
      },
    });

    const pagamentosMP = respostaMP.results || [];

    if (pagamentosMP.length === 0) {
      return res.json({
        id_pedido: idPedido,
        status_pedido: pedido.status,
        status_pagamento: "pendente",
        mensagem: "Nenhum pagamento encontrado no Mercado Pago.",
      });
    }

    // Selecionar o pagamento mais recente
    const pagamentoMP = pagamentosMP[0];

    // Conferir o valor antes de atualizar o banco
    if (
      Math.abs(
        Number(pagamentoMP.transaction_amount) -
        Number(pedido.valor_total)
      ) > 0.01
    ) {
      return res.status(400).json({
        erro: "O valor do pagamento não corresponde ao pedido.",
      });
    }

    const statusMapeado = {
      approved: "aprovado",
      rejected: "recusado",
      cancelled: "cancelado",
      refunded: "estornado",
      charged_back: "estornado",
      pending: "pendente",
      in_process: "pendente",
      authorized: "pendente",
    };

    const novoStatus = statusMapeado[pagamentoMP.status];

    if (!novoStatus) {
      return res.json({
        id_pedido: idPedido,
        status_pedido: pedido.status,
        status_pagamento: pedido.status === "pago"
          ? "aprovado"
          : "pendente",
        mensagem: "Pagamento ainda não possui um status reconhecido.",
      });
    }

    // Atualizar os registros no banco
    await conexao.beginTransaction();

    await conexao.query(
      `UPDATE pagamentos
       SET mp_payment_id = ?,
           status = ?,
           data_pagamento = ?
       WHERE id_pedido = ?`,
      [
        String(pagamentoMP.id),
        novoStatus,
        pagamentoMP.date_approved
          ? pagamentoMP.date_approved.replace("T", " ").slice(0, 19)
          : null,
        idPedido,
      ]
    );

    if (novoStatus === "aprovado") {
      await conexao.query(
        `UPDATE pedidos
         SET status = 'pago'
         WHERE id_pedido = ?
           AND status <> 'cancelado'`,
        [idPedido]
      );
    } else if (novoStatus === "cancelado") {
      await conexao.query(
        `UPDATE pedidos
         SET status = 'cancelado'
         WHERE id_pedido = ?
           AND status = 'aguardando_pagamento'`,
        [idPedido]
      );
    }

    await conexao.commit();

    const [pedidoAtualizado] = await conexao.query(
      `SELECT status
   FROM pedidos
   WHERE id_pedido = ?`,
      [idPedido]
    );

    return res.json({
      id_pedido: idPedido,
      id_pagamento_mp: String(pagamentoMP.id),
      status_pagamento: novoStatus,
      status_pedido: pedidoAtualizado[0].status,
      mensagem: "Status consultado com sucesso.",
    });

  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }

    console.error("Erro ao consultar pagamento:", erro);
    return next(erro);

  } finally {
    if (conexao) {
      conexao.release();
    }
  }
});

// Criar pedido e preferência de pagamento
router.post("/", autenticar, async (req, res, next) => {
  const { itens } = req.body;
  const idUsuario = req.usuario.id_usuario;

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({
      erro: "O carrinho está vazio.",
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    let valorTotal = 0;
    const itensValidados = [];

    // Validar anúncios e buscar informações no banco
    for (const item of itens) {
      const idAnuncio = Number(item.id);
      const quantidade = Number(item.quantidade);

      if (
        !Number.isInteger(idAnuncio) ||
        idAnuncio <= 0 ||
        !Number.isInteger(quantidade) ||
        quantidade <= 0
      ) {
        const erro = new Error("Item ou quantidade inválida.");
        erro.status = 400;
        throw erro;
      }

      const [anuncios] = await conexao.query(
        `SELECT
           a.id_anuncio,
           a.preco,
           COALESCE(a.titulo_anuncio, l.titulo) AS titulo
         FROM anuncios a
         INNER JOIN livros l ON l.id_livro = a.id_livro
         WHERE a.id_anuncio = ?
           AND a.status = 'ativo'
         FOR UPDATE`,
        [idAnuncio]
      );

      if (anuncios.length === 0) {
        const erro = new Error(
          `O anúncio ${idAnuncio} não existe ou não está disponível.`
        );
        erro.status = 400;
        throw erro;
      }

      const precoUnitario = Number(anuncios[0].preco);

      valorTotal += precoUnitario * quantidade;

      itensValidados.push({
        idAnuncio,
        titulo: anuncios[0].titulo,
        quantidade,
        precoUnitario,
      });
    }

    // Criar o pedido no banco
    const [resultadoPedido] = await conexao.query(
      `INSERT INTO pedidos (id_usuario, valor_total)
       VALUES (?, ?)`,
      [idUsuario, valorTotal]
    );

    const idPedido = resultadoPedido.insertId;

    // Registrar os livros do pedido
    for (const item of itensValidados) {
      await conexao.query(
        `INSERT INTO itens_pedido
         (id_pedido, id_anuncio, quantidade, preco_unitario)
         VALUES (?, ?, ?, ?)`,
        [
          idPedido,
          item.idAnuncio,
          item.quantidade,
          item.precoUnitario,
        ]
      );
    }

    // Criar preferência no Mercado Pago
    const respostaMP = await preference.create({
      body: {
        items: itensValidados.map((item) => ({
          id: String(item.idAnuncio),
          title: item.titulo,
          quantity: item.quantidade,
          currency_id: "BRL",
          unit_price: item.precoUnitario,
        })),

        external_reference: String(idPedido),
      },
    });

    // Registrar o pagamento no banco
    await conexao.query(
      `INSERT INTO pagamentos
       (id_pedido, valor, status, mp_preference_id)
       VALUES (?, ?, 'pendente', ?)`,
      [
        idPedido,
        valorTotal,
        respostaMP.id,
      ]
    );

    // Confirmar todas as operações no banco
    await conexao.commit();

    return res.status(201).json({
      mensagem: "Pedido e preferência de pagamento criados com sucesso.",
      pedido: {
        id_pedido: idPedido,
        valor_total: Number(valorTotal.toFixed(2)),
        status: "aguardando_pagamento",
      },
      pagamento: {
        mp_preference_id: respostaMP.id,
        checkout_url:
          respostaMP.sandbox_init_point || respostaMP.init_point,
      },
    });

  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }

    if (erro.status) {
      return res.status(erro.status).json({
        erro: erro.message,
      });
    }

    console.error("Erro ao criar pedido/pagamento:", erro);
    return next(erro);

  } finally {
    if (conexao) {
      conexao.release();
    }
  }
});

module.exports = router;