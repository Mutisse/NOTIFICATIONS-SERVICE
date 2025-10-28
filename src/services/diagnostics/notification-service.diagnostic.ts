import mongoose from "mongoose";
import os from "os";
import chalk from "chalk";

// 🕐 Utilitário de timestamp padronizado
const getTimestamp = () => chalk.gray(`[${new Date().toISOString()}]`);

class NotificationServiceDiagnostic {
  private serviceName = "Notification Service";

  /**
   * Diagnóstico completo do microserviço
   */
  public async fullDiagnostic(): Promise<any> {
    console.log(
      `\n${getTimestamp()} ${chalk.blue("🔍")} Starting full diagnostic for ${
        this.serviceName
      }...`
    );

    const diagnostic = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      status: "healthy",
      checks: {
        database: await this.checkDatabase(),
        memory: this.checkMemory(),
        system: this.checkSystem(),
        environment: this.checkEnvironment(),
        notificationProviders: await this.checkNotificationProviders(),
        queue: await this.checkQueueStatus(),
        api: await this.checkAPI(),
      },
      summary: {},
    };

    diagnostic.summary = this.generateSummary(diagnostic.checks);
    this.printDiagnosticResults(diagnostic);
    return diagnostic;
  }

  /**
   * Verifica provedores de notificação
   */
  private async checkNotificationProviders(): Promise<any> {
    const providers = {
      email: await this.checkEmailProvider(),
      sms: await this.checkSMSProvider(),
      push: await this.checkPushProvider(),
    };

    const availableProviders = Object.values(providers).filter(
      (p) => p.available
    ).length;
    console.log(
      `${getTimestamp()} ${chalk.green(
        "✅"
      )} Notification Providers: ${availableProviders}/3 available`
    );

    return providers;
  }

  /**
   * Verifica provedor de email
   */
  private async checkEmailProvider(): Promise<any> {
    // Simular verificação do provedor de email
    return {
      name: "Email Provider",
      available: !!process.env.EMAIL_SERVICE,
      status: process.env.EMAIL_SERVICE ? "configured" : "not configured",
    };
  }

  /**
   * Verifica provedor de SMS
   */
  private async checkSMSProvider(): Promise<any> {
    // Simular verificação do provedor de SMS
    return {
      name: "SMS Provider",
      available: !!process.env.SMS_SERVICE,
      status: process.env.SMS_SERVICE ? "configured" : "not configured",
    };
  }

  /**
   * Verifica provedor de Push
   */
  private async checkPushProvider(): Promise<any> {
    // Simular verificação do provedor de Push
    return {
      name: "Push Provider",
      available: !!process.env.PUSH_SERVICE,
      status: process.env.PUSH_SERVICE ? "configured" : "not configured",
    };
  }

  /**
   * Verifica status da fila
   */
  private async checkQueueStatus(): Promise<any> {
    // Simular verificação de fila (se usar Redis, RabbitMQ, etc.)
    return {
      name: "Notification Queue",
      available: true, // Implementar lógica real
      pending: 0,
      processed: 0,
      failed: 0,
    };
  }

  private async checkDatabase(): Promise<any> {
    try {
      const db = mongoose.connection;
      const readyState = db.readyState;
      const states = [
        "disconnected",
        "connected",
        "connecting",
        "disconnecting",
      ];

      const dbInfo = {
        status: readyState === 1 ? "connected" : "disconnected",
        readyState: states[readyState] || "unknown",
        databaseName: db.db?.databaseName || "unknown",
        host: db.host || "unknown",
        port: db.port || "unknown",
        models: Object.keys(mongoose.models || {}),
      };

      console.log(
        `${getTimestamp()} ${
          dbInfo.status === "connected" ? chalk.green("✅") : chalk.red("❌")
        } Database: ${dbInfo.status}`
      );

      return dbInfo;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log(
        `${getTimestamp()} ${chalk.red("❌")} Database check failed:`,
        errorMessage
      );
      return { status: "error", error: errorMessage };
    }
  }

  private checkMemory(): any {
    const memoryUsage = process.memoryUsage();
    const formatMemory = (bytes: number) => Math.round(bytes / 1024 / 1024);

    return {
      heapUsed: formatMemory(memoryUsage.heapUsed),
      heapTotal: formatMemory(memoryUsage.heapTotal),
      rss: formatMemory(memoryUsage.rss),
    };
  }

  private checkSystem(): any {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      cpu: os.cpus().length,
    };
  }

  private checkEnvironment(): any {
    return {
      NODE_ENV: process.env.NODE_ENV || "not set",
      PORT: process.env.PORT || "not set",
      MONGODB_URI: process.env.MONGODB_URI ? "set" : "not set",
      EMAIL_SERVICE: process.env.EMAIL_SERVICE ? "set" : "not set",
      SMS_SERVICE: process.env.SMS_SERVICE ? "set" : "not set",
    };
  }

  private async checkAPI(): Promise<any> {
    return {
      health: { status: "available" },
      routes: [
        "/health",
        "/api/notifications",
        "/api/notifications/email",
        "/api/notifications/sms",
      ],
    };
  }

  private generateSummary(checks: any): any {
    const totalChecks = Object.keys(checks).length;
    const passedChecks = Object.values(checks).filter(
      (check: any) =>
        !check.status ||
        (check.status !== "error" && check.status !== "unavailable")
    ).length;

    return {
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      successRate: Math.round((passedChecks / totalChecks) * 100),
      overallStatus: passedChecks === totalChecks ? "healthy" : "degraded",
    };
  }

  private printDiagnosticResults(diagnostic: any): void {
    console.log(
      `\n${getTimestamp()} ${chalk.cyan("📊")} DIAGNOSTIC RESULTS for ${
        this.serviceName
      }`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("├──")} Overall Status: ${
        diagnostic.summary.overallStatus === "healthy"
          ? chalk.green("✅ HEALTHY")
          : chalk.yellow("⚠️ DEGRADED")
      }`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("├──")} Database: ${
        diagnostic.checks.database.status === "connected"
          ? chalk.green("✅")
          : chalk.red("❌")
      }`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("├──")} Memory: ${chalk.blue(
        diagnostic.checks.memory.heapUsed + "MB"
      )}`
    );

    // Providers de notificação
    const providers = diagnostic.checks.notificationProviders;
    const availableProviders = Object.values(providers).filter(
      (p: any) => p.available
    ).length;
    console.log(
      `${getTimestamp()} ${chalk.gray("├──")} Providers: ${chalk.blue(
        availableProviders + "/3 available"
      )}`
    );
    console.log(
      `${getTimestamp()} ${chalk.gray("└──")} Queue: ${chalk.blue("Active")}`
    );
  }

  public async quickDiagnostic(): Promise<any> {
    const criticalChecks = {
      database: await this.checkDatabase(),
      memory: this.checkMemory(),
      notificationProviders: await this.checkNotificationProviders(),
    };

    const allCritical = Object.values(criticalChecks).every(
      (check) =>
        !check.status ||
        (check.status !== "error" && check.status !== "unavailable")
    );

    console.log(
      `${getTimestamp()} ${
        allCritical ? chalk.green("✅") : chalk.red("❌")
      } Quick diagnostic: ${
        allCritical
          ? "ALL CRITICAL SYSTEMS OK"
          : "SOME CRITICAL SYSTEMS FAILING"
      }`
    );

    return {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      status: allCritical ? "healthy" : "degraded",
      criticalChecks,
    };
  }
}

export const notificationDiagnostic = new NotificationServiceDiagnostic();
export default notificationDiagnostic;
