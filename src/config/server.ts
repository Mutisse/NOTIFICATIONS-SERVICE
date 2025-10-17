import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { httpLogger } from "../utils/logger";
import { getConfig } from "./environment";

// ✅ IMPORTAÇÃO DAS ROTAS DE PROXY
import userRoutes from "../routes/users.routes";
import notificationRoutes from "../routes/notifications.routes";
import otpRoutes from "../routes/otp.routes";
import internalRoutes from "../routes/internal.routes";

export const createServer = () => {
  const app = express();
  const config = getConfig();

  // ✅ MIDDLEWARES BÁSICOS
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
      ],
      credentials: true,
    })
  );

  // ✅ RATE LIMITING
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Limite maior para gateway
    message: {
      success: false,
      error: "Muitas requisições deste IP",
    },
  });
  app.use(limiter);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(httpLogger);

  return { app, config };
};

export const setupRoutes = (app: express.Application) => {
  // ✅ ROTAS DE PROXY PARA MICROSERVIÇOS
  app.use("/api/users", userRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/otp", otpRoutes);

  // ✅ ROTAS INTERNAS DO GATEWAY
  app.use("/api/internal", internalRoutes);

  // ✅ HEALTH CHECK
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "beautytime-gateway",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  // ✅ ROTA 404
  app.use("*", (req, res) => {
    res.status(404).json({
      success: false,
      error: "Rota não encontrada",
      availableRoutes: [
        "/api/users/*",
        "/api/notifications/*",
        "/api/otp/*",
        "/api/internal/health",
        "/api/internal/services",
      ],
    });
  });
};

export const startServer = (app: express.Application, port: number) => {
  return app.listen(port, () => {
    console.log(`
🚀 BeautyTime GATEWAY iniciado!
📍 Porta: ${port}
🌍 Ambiente: ${process.env.NODE_ENV || "development"}
📡 Proxy para microserviços
📅 ${new Date().toISOString()}
    `);
  });
};
