const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : null;
  console.log("Authorization recebido:", !!cabecalho);
  console.log("Token extraído:", !!token);

  if (!token) {
    return res.status(401).json({ erro: "Faça login para realizar esta ação." });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}

module.exports = { autenticar };