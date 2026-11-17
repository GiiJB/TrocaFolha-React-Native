const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { autenticar } = require("../middleware/auth");

const router = express.Router();

function tokenPara(usuario) {
  return jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      nome: usuario.nome,
      email: usuario.email,
      is_admin: Boolean(usuario.is_admin)
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

router.post("/cadastro", async (req, res, next) => {
  try {
    const {
      nome, email, senha, telefone,
      dataNascimento, estado, cidade
    } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        erro: "Nome, e-mail e senha são obrigatórios."
      });
    }

    if (String(senha).length < 6) {
      return res.status(400).json({
        erro: "A senha precisa ter pelo menos 6 caracteres."
      });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    const [existentes] = await pool.execute(
      "SELECT id_usuario FROM usuarios WHERE email = ?",
      [emailNormalizado]
    );

    if (existentes.length) {
      return res.status(409).json({
        erro: "Este e-mail já está cadastrado."
      });
    }

    let nascimentoSQL = null;

    if (dataNascimento) {
      const match = String(dataNascimento).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

      if (match) {
        nascimentoSQL = `${match[3]}-${match[2]}-${match[1]}`;
      }
    }

    const hash = await bcrypt.hash(String(senha), 10);

    const [resultado] = await pool.execute(
      `INSERT INTO usuarios
       (nome, email, senha_hash, telefone, data_nascimento, estado, cidade)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(nome).trim(),
        emailNormalizado,
        hash,
        telefone || null,
        nascimentoSQL,
        estado || null,
        cidade || null
      ]
    );

    const usuario = {
      id_usuario: resultado.insertId,
      nome: String(nome).trim(),
      email: emailNormalizado,
      is_admin: false
    };

    return res.status(201).json({
      mensagem: "Cadastro realizado.",
      usuario,
      token: tokenPara(usuario)
    });
  } catch (erro) {
    next(erro);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        erro: "Informe e-mail e senha."
      });
    }

    const [linhas] = await pool.execute(
      `SELECT id_usuario, nome, email, senha_hash, is_admin
       FROM usuarios
       WHERE email = ?`,
      [String(email).trim().toLowerCase()]
    );

    if (
      !linhas.length ||
      !(await bcrypt.compare(String(senha), linhas[0].senha_hash))
    ) {
      return res.status(401).json({
        erro: "E-mail ou senha incorretos."
      });
    }

    const usuario = {
      id_usuario: linhas[0].id_usuario,
      nome: linhas[0].nome,
      email: linhas[0].email,
      is_admin: Boolean(linhas[0].is_admin)
    };

    return res.json({
      mensagem: "Login realizado.",
      usuario,
      token: tokenPara(usuario)
    });
  } catch (erro) {
    next(erro);
  }
});

router.get("/me", autenticar, async (req, res, next) => {
  try {
    const [linhas] = await pool.execute(
      `SELECT id_usuario, nome, email, telefone, estado,
              cidade, data_cadastro, is_admin
       FROM usuarios
       WHERE id_usuario = ?`,
      [req.usuario.id_usuario]
    );

    if (!linhas.length) {
      return res.status(404).json({
        erro: "Usuário não encontrado."
      });
    }

    const usuario = {
      ...linhas[0],
      is_admin: Boolean(linhas[0].is_admin)
    };

    res.json({ usuario });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;