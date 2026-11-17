const express = require("express");
const crypto = require("crypto");
const pool = require("../db");

const { MercadoPagoConfig, Payment } = require("mercadopago");

const router = express.Router();

const clienteMP = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
});

const pagamentoMP = new Payment(clienteMP);

// Receber notificações do Mercado Pago
router.post("/mercadopago", async (req, res) => {
    let conexao;

    try {
        const segredo = process.env.MP_WEBHOOK_SECRET;

        if (!segredo) {
            console.error("MP_WEBHOOK_SECRET não configurado.");
            return res.sendStatus(500);
        }

        // Dados usados para validar a assinatura
        const assinatura = req.headers["x-signature"] || "";
        const requestId = req.headers["x-request-id"];

        const dataId = String(req.query["data.id"] || "");

        const partes = Object.fromEntries(
            assinatura.split(",").map((parte) => {
                const [chave, ...valor] = parte.split("=");
                return [chave, valor.join("=")];
            })
        );

        const ts = partes.ts;
        const v1 = partes.v1;

        if (!dataId || !requestId || !ts || !v1) {
            return res.sendStatus(401);
        }

        const manifesto =
            `id:${dataId};request-id:${requestId};ts:${ts};`;

        const assinaturaEsperada = crypto
            .createHmac("sha256", segredo)
            .update(manifesto)
            .digest("hex");

        const assinaturaBuffer = Buffer.from(v1, "hex");
        const esperadaBuffer = Buffer.from(assinaturaEsperada, "hex");

        if (
            assinaturaBuffer.length !== esperadaBuffer.length ||
            !crypto.timingSafeEqual(assinaturaBuffer, esperadaBuffer)
        ) {
            return res.sendStatus(401);
        }

        // Só processaremos notificações de pagamento
        if (req.body.type !== "payment") {
            return res.sendStatus(200);
        }

        // Consultar o pagamento diretamente no Mercado Pago

        let pagamento;
        try {
            pagamento = await pagamentoMP.get({
                id: dataId,
            });
        } catch (erroMP) {
            const causas = erroMP.causes || erroMP.cause || [];

            const pagamentoNaoEncontrado =
                erroMP.status === 404 ||
                causas.some(
                    (causa) => Number(causa.code) === 2000
                );

            if (pagamentoNaoEncontrado) {
                console.warn(
                    `Pagamento ${dataId} não encontrado. Notificação de teste ou pagamento inexistente.`
                );

                return res.sendStatus(200);
            }

            throw erroMP;
        }

        const idPedido = Number(pagamento.external_reference);

        if (!Number.isInteger(idPedido) || idPedido <= 0) {
            console.error("Referência de pedido inválida.");
            return res.sendStatus(400);
        }

        const idPagamentoMP = String(pagamento.id);

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

        const novoStatus = statusMapeado[pagamento.status];

        if (!novoStatus) {
            return res.sendStatus(200);
        }

        const metodo =
            pagamento.payment_type_id === "bank_transfer"
                ? "pix"
                : ["credit_card", "debit_card"].includes(
                    pagamento.payment_type_id
                )
                    ? "cartao"
                    : "outro";

        // Identificador único da notificação
        const idEvento = String(
            req.body.id || `payment:${idPagamentoMP}:${req.body.action || "updated"}`
        );

        conexao = await pool.getConnection();
        await conexao.beginTransaction();

        // Evitar processar a mesma notificação duas vezes
        const [notificacoesExistentes] = await conexao.query(
            `SELECT id_notificacao
       FROM pagamento_notificacoes
       WHERE mp_event_id = ?
       FOR UPDATE`,
            [idEvento]
        );

        if (notificacoesExistentes.length > 0) {
            await conexao.commit();
            return res.sendStatus(200);
        }

        // Localizar o pagamento correspondente ao pedido
        const [pagamentos] = await conexao.query(
            `SELECT id_pagamento, id_pedido, valor
       FROM pagamentos
       WHERE mp_payment_id = ?
          OR (
            id_pedido = ?
            AND status = 'pendente'
          )
       ORDER BY
         CASE WHEN mp_payment_id = ? THEN 0 ELSE 1 END,
         data_criacao DESC
       LIMIT 1
       FOR UPDATE`,
            [idPagamentoMP, idPedido, idPagamentoMP]
        );

        if (pagamentos.length === 0) {
            await conexao.rollback();
            return res.sendStatus(404);
        }

        const registro = pagamentos[0];

        // Conferir se o valor recebido corresponde ao valor registrado
        if (
            Math.abs(
                Number(pagamento.transaction_amount) - Number(registro.valor)
            ) > 0.01
        ) {
            await conexao.rollback();
            console.error("Valor do pagamento diferente do pedido.");
            return res.sendStatus(400);
        }

        // Atualizar pagamento
        await conexao.query(
            `UPDATE pagamentos
       SET mp_payment_id = ?,
           status = ?,
           metodo = ?,
           data_pagamento = ?
       WHERE id_pagamento = ?`,
            [
                idPagamentoMP,
                novoStatus,
                metodo,
                pagamento.date_approved
                    ? pagamento.date_approved.replace("T", " ").slice(0, 19)
                    : null,
                registro.id_pagamento,
            ]
        );

        // Atualizar o pedido conforme o resultado
        if (novoStatus === "aprovado") {
            await conexao.query(
                `UPDATE pedidos
         SET status = 'pago'
         WHERE id_pedido = ?
           AND status <> 'cancelado'`,
                [registro.id_pedido]
            );
        } else if (novoStatus === "cancelado") {
            await conexao.query(
                `UPDATE pedidos
         SET status = 'cancelado'
         WHERE id_pedido = ?
           AND status = 'aguardando_pagamento'`,
                [registro.id_pedido]
            );
        }

        // Registrar a notificação processada
        await conexao.query(
            `INSERT INTO pagamento_notificacoes
       (id_pagamento, mp_event_id, tipo_evento, processada)
       VALUES (?, ?, ?, 1)`,
            [
                registro.id_pagamento,
                idEvento,
                req.body.action || "payment.updated",
            ]
        );

        await conexao.commit();

        console.log(
            `Pagamento ${idPagamentoMP} atualizado: ${novoStatus}`
        );

        return res.sendStatus(200);
    } catch (erro) {
        if (conexao) {
            await conexao.rollback();
        }

        console.error("Erro no webhook Mercado Pago:", erro);
        return res.sendStatus(500);
    } finally {
        if (conexao) {
            conexao.release();
        }
    }
});

module.exports = router;