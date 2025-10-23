import express from "express";
import chalk from "chalk";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import diagnostic from "./utils/diagnostic.utils";
import notifyRoutes from"./routes/all-notification.routes";

dotenv.config();

const app = express();

// Configurações básicas de segurança
app.use(helmet());
app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ✅ CORREÇÃO: Logger manual simples (sem Morgan)
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor =
      status >= 500 ? chalk.red : status >= 400 ? chalk.yellow : chalk.green;

    console.log(
      chalk.gray(`[${new Date().toISOString()}]`),
      chalk.blue(req.method),
      req.url,
      statusColor(status.toString()),
      chalk.magenta(`${duration}ms`)
    );
  });

  next();
});

// Timeout
app.use((req, res, next) => {
  req.socket.setTimeout(parseInt(process.env.REQUEST_TIMEOUT || "30000"));
  next();
});

app.use(notifyRoutes)
// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Notification Service",
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Rota raiz
app.get("/notify", (req, res) => {
  res.json({
    message: "🔔 Notification Service",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: "Endpoint não encontrado",
    path: req.url,
  });
});

// No startup
//diagnostic.fullDiagnostic();
// Endpoint de diagnóstico
app.get("/diagnostic", async (req, res) => {
  try {
    const diagnosticResult = await diagnostic.fullDiagnostic();
    res.json(diagnosticResult);
  } catch (error) {
    res.status(500).json({ error: "Diagnostic failed" });
  }
});

// Endpoint rápido
app.get("/diagnostic/quick", async (req, res) => {
  try {
    const diagnosticResult = await diagnostic.quickDiagnostic();
    res.json(diagnosticResult);
  } catch (error) {
    res.status(500).json({ error: "Quick diagnostic failed" });
  }
});

export default app;
