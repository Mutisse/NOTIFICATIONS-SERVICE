// src/config/server.ts - VERSÃO SIMPLIFICADA
import dotenv from "dotenv";
dotenv.config();

import app from "../app";
import { 
  connectDB, 
  disconnectDB, 
  getDatabaseStatus,
  healthCheck 
} from"./database.config";
import chalk from "chalk";

const getTimestamp = () => chalk.gray(`[${new Date().toISOString()}]`);

const PORT = process.env.PORT || 3006;
const NODE_ENV = process.env.NODE_ENV || "development";

// ✅ CORREÇÃO: Tipo mais simples
let server: any = null;

/**
 * Inicializa e inicia o servidor
 */
const startServer = async (): Promise<void> => {
  try {
    console.log(
      `${getTimestamp()} ${chalk.blue("🚀")} Starting Notification Service...`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("⚡")} Environment: ${NODE_ENV}`
    );

    // ✅ Conectar ao DB
    try {
      await connectDB();
      
      const dbStatus = getDatabaseStatus();
      console.log(
        `${getTimestamp()} ${chalk.green("✅")} Database: ${dbStatus.database} - ${dbStatus.readyStateDescription}`
      );
      
      // ✅ Health check adicional
      const health = await healthCheck();
      console.log(
        `${getTimestamp()} ${chalk.green("❤️")} Health check: ${health.status}`
      );
    } catch (error) {
      console.log(
        `${getTimestamp()} ${chalk.yellow("⚠️")} Continuing without MongoDB connection`
      );
    }

    // ✅ Iniciar servidor HTTP
    server = app.listen(PORT, () => {
      const dbStatus = getDatabaseStatus();
      
      console.log(
        `${getTimestamp()} ${chalk.green("✅")} Notification Service running on port ${PORT}`
      );
      console.log(
        `${getTimestamp()} ${chalk.blue("🌐")} URL: http://localhost:${PORT}`
      );
      console.log(
        `${getTimestamp()} ${chalk.blue("🗄️")} Database: ${dbStatus.database} - ${
          dbStatus.isConnected ? chalk.green('CONNECTED') : chalk.yellow('DISCONNECTED')
        }`
      );
    });

    // 🛑 Configuração de Graceful Shutdown
    const shutdown = async (): Promise<void> => {
      console.log(`${getTimestamp()} ${chalk.yellow("🛑")} Shutting down gracefully...`);
      
      if (server) {
        server.close(async () => {
          console.log(`${getTimestamp()} ${chalk.green("✅")} HTTP server closed`);
          await disconnectDB();
          console.log(`${getTimestamp()} ${chalk.green("🎯")} Service stopped`);
          process.exit(0);
        });

        setTimeout(() => {
          console.error(`${getTimestamp()} ${chalk.red("💥")} Forcing shutdown`);
          process.exit(1);
        }, 10000);
      } else {
        await disconnectDB();
        process.exit(0);
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    
    process.on("unhandledRejection", (reason: unknown) => {
      console.error(`${getTimestamp()} ${chalk.red("⚠️")} Unhandled Rejection:`, reason);
    });
    
    process.on("uncaughtException", (err: Error) => {
      console.error(`${getTimestamp()} ${chalk.red("💥")} Uncaught Exception:`, err);
      shutdown();
    });

  } catch (error) {
    console.error(
      `${getTimestamp()} ${chalk.red("❌")} Error starting server:`,
      error
    );
    process.exit(1);
  }
};

// ✅ Iniciar o servidor
if (require.main === module) {
  startServer();
}

export default startServer;