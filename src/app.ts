// ✅ CARREGA VARIÁVEIS DE AMBIENTE NO TOPO
import "dotenv/config";

// Configurações
import { connectDatabase } from "./config/database";
import { validateEnvironment } from "./config/environment";
import { createServer, setupRoutes, startServer } from "./config/server";

// ✅ INICIALIZAÇÃO DO SISTEMA
const initializeApp = async () => {
  try {
    // 1. Valida ambiente
    validateEnvironment();

    // 2. Conecta database (apenas para logs do gateway)
    await connectDatabase();

    // 3. Cria servidor
    const { app, config } = createServer();

    // 4. Configura rotas
    setupRoutes(app);

    // 5. Inicia servidor
    const server = startServer(app, config.server.port);

    // 6. Graceful shutdown
    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    console.error("❌ Falha ao inicializar aplicação:", error);
    process.exit(1);
  }
};

// ✅ CONFIGURAÇÃO DE SHUTDOWN GRACEFUL
const setupGracefulShutdown = (server: any) => {
  const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];

  signals.forEach((signal) => {
    process.on(signal, () => {
      console.log(`\n📡 Recebido ${signal}, encerrando servidor...`);
      server.close(() => {
        console.log("✅ Servidor encerrado com sucesso");
        process.exit(0);
      });
    });
  });
};

// ✅ INICIA APLICAÇÃO
initializeApp().catch(console.error);

export default initializeApp;
