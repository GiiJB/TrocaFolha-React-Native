const express = require("express");
const pool = require("../db");
const { autenticar } = require("../middleware/auth");

const router = express.Router();

// LISTAR ANÚNCIOS
router.get("/", async (req, res, next) => {
  try {
    const { busca, categoria, area, min, max } = req.query;
    const where = ["a.status = 'ativo'"];
    const params = [];

    if (busca) {
      where.push("(l.titulo LIKE ? OR l.autor LIKE ?)");
      params.push(`%${busca}%`, `%${busca}%`);
    }

    if (categoria) {
      where.push("a.categoria = ?");
      params.push(categoria);
    }

    if (req.query.colecao === "true") {
      where.push("a.colecao = 1");
    }

    if (area) {
      where.push("a.area = ?");
      params.push(area);
    }

    if (req.query.desapega === "true") {
      where.push("a.area IS NOT NULL");
    }

    if (min !== undefined && min !== "") {
      const n = Number(min);

      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({
          erro: "Preço mínimo inválido."
        });
      }

      where.push("a.preco >= ?");
      params.push(n);
    }

    if (max !== undefined && max !== "") {
      const n = Number(max);

      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({
          erro: "Preço máximo inválido."
        });
      }

      where.push("a.preco <= ?");
      params.push(n);
    }

    const sql = `
      SELECT a.id_anuncio AS id_produto,
             COALESCE(a.titulo_anuncio, l.titulo) AS titulo,
             l.autor, l.editora,
             l.ano_publicacao AS anoPublicacao,
             l.descricao,
             l.imagem_url AS imagem_url,
             a.preco, a.categoria, a.area,
             a.conservacao, a.colecao,
             a.id_usuario,
             u.nome AS nome_dono
      FROM anuncios a
      JOIN livros l ON l.id_livro = a.id_livro
      LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
      WHERE ${where.join(" AND ")}
      ORDER BY a.data_publicacao DESC
    `;

    const [linhas] = await pool.execute(sql, params);

    const produtos = linhas.map((p) => ({
      ...p,
      imagem: p.imagem_url,
      imagemBase64: null,
      dono: p.id_usuario
        ? {
          id_usuario: p.id_usuario,
          nome: p.nome_dono
        }
        : null
    }));
    res.json({ produtos });
  } catch (erro) {
    next(erro);
  }
});

// CADASTRAR ANÚNCIO
router.post("/", autenticar, async (req, res, next) => {
  const conn = await pool.getConnection();

  try {
    const {
      titulo, autor, editora, anoPublicacao, preco,
      conservacao, categoria, area, descricao, imagem, colecao
    } = req.body;

    if (
      !titulo || !autor || !anoPublicacao ||
      preco === undefined || !categoria || !conservacao
    ) {
      return res.status(400).json({
        erro: "Preencha título, autor, ano, preço, categoria e conservação."
      });
    }

    const precoNumero = Number(String(preco).replace(",", "."));
    const anoNumero = Number(anoPublicacao);

    if (
      !Number.isFinite(precoNumero) ||
      precoNumero < 0 ||
      !Number.isInteger(anoNumero)
    ) {
      return res.status(400).json({
        erro: "Preço ou ano de publicação inválido."
      });
    }

    const imagemValor =
      typeof imagem === "string" &&
        (imagem.startsWith("http://") || imagem.startsWith("https://"))
        ? imagem
        : null;

    await conn.beginTransaction();

    const [livro] = await conn.execute(
      `INSERT INTO livros
       (titulo, autor, editora, ano_publicacao, descricao, imagem_url, genero)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        titulo,
        autor,
        editora || null,
        anoNumero,
        descricao || null,
        imagemValor,
        categoria
      ]
    );

    const [anuncio] = await conn.execute(
      `INSERT INTO anuncios
       (id_usuario, id_livro, titulo_anuncio, preco,
        categoria, area, conservacao, colecao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.usuario.id_usuario,
        livro.insertId,
        titulo,
        precoNumero,
        categoria,
        area || null,
        conservacao,
        Boolean(colecao)
      ]
    );

    await conn.commit();

    res.status(201).json({
      mensagem: "Anúncio salvo.",
      id_produto: anuncio.insertId,
      id_livro: livro.insertId
    });
  } catch (erro) {
    await conn.rollback();
    next(erro);
  } finally {
    conn.release();
  }
});

// EDITAR ANÚNCIO
router.put("/:id", autenticar, async (req, res, next) => {
  const conn = await pool.getConnection();

  try {
    const idAnuncio = Number(req.params.id);

    if (!Number.isInteger(idAnuncio) || idAnuncio <= 0) {
      return res.status(400).json({
        erro: "ID do anúncio inválido."
      });
    }

    const {
      titulo, autor, editora, anoPublicacao, preco,
      conservacao, categoria, area, descricao, imagem, colecao
    } = req.body;

    if (
      !titulo || !autor || !anoPublicacao ||
      preco === undefined || !categoria || !conservacao
    ) {
      return res.status(400).json({
        erro: "Preencha título, autor, ano, preço, categoria e conservação."
      });
    }

    const precoNumero = Number(String(preco).replace(",", "."));
    const anoNumero = Number(anoPublicacao);

    if (
      !Number.isFinite(precoNumero) ||
      precoNumero < 0 ||
      !Number.isInteger(anoNumero) ||
      anoNumero < 0 ||
      anoNumero > 65535
    ) {
      return res.status(400).json({
        erro: "Preço ou ano de publicação inválido."
      });
    }

    await conn.beginTransaction();

    // Busca o anúncio, o livro e a permissão atual do usuário.
    const [linhas] = await conn.execute(
      `SELECT a.id_anuncio, a.id_usuario, a.id_livro,
              l.imagem_url, u.is_admin
       FROM anuncios a
       LEFT JOIN livros l ON l.id_livro = a.id_livro
       LEFT JOIN usuarios u ON u.id_usuario = ?
       WHERE a.id_anuncio = ?
       FOR UPDATE`,
      [req.usuario.id_usuario, idAnuncio]
    );

    if (!linhas.length) {
      await conn.rollback();

      return res.status(404).json({
        erro: "Anúncio não encontrado."
      });
    }

    const anuncio = linhas[0];

    const ehAdmin = Number(anuncio.is_admin) === 1;
    const ehDono =
      Number(anuncio.id_usuario) === Number(req.usuario.id_usuario);

    if (!ehAdmin && !ehDono) {
      await conn.rollback();

      return res.status(403).json({
        erro: "Você não tem permissão para editar este anúncio."
      });
    }

    if (!anuncio.id_livro) {
      await conn.rollback();

      return res.status(404).json({
        erro: "Livro relacionado ao anúncio não encontrado."
      });
    }

    // Se a imagem não foi enviada, mantém a imagem anterior.
    const imagemValor =
      imagem === undefined
        ? anuncio.imagem_url
        : typeof imagem === "string" &&
          (imagem.startsWith("http://") || imagem.startsWith("https://"))
          ? imagem
          : null;

    await conn.execute(
      `UPDATE livros
       SET titulo = ?,
           autor = ?,
           editora = ?,
           ano_publicacao = ?,
           descricao = ?,
           imagem_url = ?,
           genero = ?
       WHERE id_livro = ?`,
      [
        titulo,
        autor,
        editora || null,
        anoNumero,
        descricao || null,
        imagemValor,
        categoria,
        anuncio.id_livro
      ]
    );

    await conn.execute(
      `UPDATE anuncios
       SET titulo_anuncio = ?,
           preco = ?,
           categoria = ?,
           area = ?,
           conservacao = ?,
           colecao = ?
       WHERE id_anuncio = ?`,
      [
        titulo,
        precoNumero,
        categoria,
        area || null,
        conservacao,
        Boolean(colecao),
        idAnuncio
      ]
    );

    await conn.commit();

    res.json({
      mensagem: "Anúncio atualizado com sucesso."
    });
  } catch (erro) {
    await conn.rollback();
    next(erro);
  } finally {
    conn.release();
  }
});

// EXCLUIR ANÚNCIO (EXCLUSÃO LÓGICA)
router.delete("/:id", autenticar, async (req, res, next) => {
  const conn = await pool.getConnection();

  try {
    const idAnuncio = Number(req.params.id);

    if (!Number.isInteger(idAnuncio) || idAnuncio <= 0) {
      return res.status(400).json({
        erro: "ID do anúncio inválido."
      });
    }

    await conn.beginTransaction();

    const [linhas] = await conn.execute(
      `SELECT a.id_anuncio, a.id_usuario, u.is_admin
       FROM anuncios a
       LEFT JOIN usuarios u ON u.id_usuario = ?
       WHERE a.id_anuncio = ?
       FOR UPDATE`,
      [req.usuario.id_usuario, idAnuncio]
    );

    if (!linhas.length) {
      await conn.rollback();

      return res.status(404).json({
        erro: "Anúncio não encontrado."
      });
    }

    const anuncio = linhas[0];

    const ehAdmin = Number(anuncio.is_admin) === 1;
    const ehDono =
      Number(anuncio.id_usuario) === Number(req.usuario.id_usuario);

    if (!ehAdmin && !ehDono) {
      await conn.rollback();

      return res.status(403).json({
        erro: "Você não tem permissão para excluir este anúncio."
      });
    }

    await conn.execute(
      `UPDATE anuncios
       SET status = 'inativo'
       WHERE id_anuncio = ?`,
      [idAnuncio]
    );

    await conn.commit();

    res.json({
      mensagem: "Anúncio excluído com sucesso."
    });
  } catch (erro) {
    await conn.rollback();
    next(erro);
  } finally {
    conn.release();
  }
});

module.exports = router;