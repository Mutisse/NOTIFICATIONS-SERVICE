import mongoose from "mongoose";
import { Logger } from "../utils/logger";

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/beautytime-gateway";

    const connection = await mongoose.connect(mongoUri, {
      // Configurações modernas do Mongoose 6+ (não precisa mais das opções antigas)
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    Logger.info("✅ MongoDB conectado com sucesso", {
      host: connection.connection.host,
      database: connection.connection.name,
    });

    setupDatabaseEventListeners();
  } catch (error: unknown) {
    Logger.error(
      "❌ Falha ao conectar com MongoDB:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};

const setupDatabaseEventListeners = (): void => {
  mongoose.connection.on("error", (error: Error) => {
    Logger.error("❌ Erro na conexão MongoDB:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    Logger.warn("📡 MongoDB desconectado");
  });

  mongoose.connection.on("reconnected", () => {
    Logger.info("🔁 MongoDB reconectado");
  });

  mongoose.connection.on("connected", () => {
    Logger.info("🔗 MongoDB conectado");
  });
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    Logger.info("✅ MongoDB desconectado com sucesso");
  } catch (error: unknown) {
    Logger.error(
      "❌ Erro ao desconectar MongoDB:",
      error instanceof Error ? error.message : String(error)
    );
  }
};

// ✅ HEALTH CHECK DA DATABASE
export const checkDatabaseHealth = async (): Promise<{
  status: "healthy" | "unhealthy";
  details: any;
}> => {
  try {
    // Verifica se está conectado
    if (mongoose.connection.readyState !== 1) {
      return {
        status: "unhealthy",
        details: {
          readyState: mongoose.connection.readyState,
          message: "Database não conectada",
        },
      };
    }

    // Testa uma operação simples
    await mongoose.connection.db.admin().ping();

    return {
      status: "healthy",
      details: {
        readyState: mongoose.connection.readyState,
        database: mongoose.connection.name,
        host: mongoose.connection.host,
      },
    };
  } catch (error: unknown) {
    return {
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : String(error),
        readyState: mongoose.connection.readyState,
      },
    };
  }
};
