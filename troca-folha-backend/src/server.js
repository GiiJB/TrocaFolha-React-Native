require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const authRoutes = require("./routes/auth");
const produtosRoutes = require("./routes/produtos");
const pedidosRoutes = require("./routes/pedidos");
const webhooksRoutes = require("./routes/webhooks");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("troque_esta_chave")) {
  console.warn("AVISO: configure JWT_SECRET no .env antes de usar o backend.");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api/webhooks", webhooksRoutes);

app.get("/", (_req, res) => {
  res.json({ nome: "Troca Folha API", status: "online" });
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", banco: "conectado" });
  } catch {
    res.status(503).json({ status: "erro", banco: "indisponível" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/produtos", produtosRoutes);
app.use("/api/pedidos", pedidosRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ erro: "Já existe um registro com esses dados." });
  }
  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ erro: "Referência inválida no banco de dados." });
  }
  res.status(500).json({ erro: "Erro interno do servidor." });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => {
  console.log(`Troca Folha API rodando na porta ${port}`);
});
