import { Request, Response, NextFunction } from "express";

// ✅ TIPOS DE LOG
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "SUCCESS";
type LogContext = Record<string, any>;

// ✅ CORES PARA TERMINAL (opcional)
const Colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Cores principais
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Cores de fundo
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

// ✅ EMOJIS E ÍCONES
const Emojis = {
  INFO: "📝",
  WARN: "⚠️",
  ERROR: "❌",
  DEBUG: "🐛",
  SUCCESS: "✅",
  DATABASE: "🗄️",
  SERVER: "🚀",
  REQUEST: "📡",
  RESPONSE: "📨",
};

// ✅ FORMATADOR DE LOGS
class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  private static getColor(level: LogLevel): string {
    const colors = {
      INFO: Colors.cyan,
      WARN: Colors.yellow,
      ERROR: Colors.red,
      DEBUG: Colors.magenta,
      SUCCESS: Colors.green,
    };
    return colors[level] || Colors.white;
  }

  private static formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = this.getTimestamp();
    const color = this.getColor(level);
    const emoji = Emojis[level];

    // Formatação principal
    let logMessage = `${Colors.dim}${timestamp}${Colors.reset} `;
    logMessage += `${color}${emoji} ${level.padEnd(7)}${Colors.reset} `;
    logMessage += `${Colors.bright}${message}${Colors.reset}`;

    // Contexto adicional
    if (context && Object.keys(context).length > 0) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${Colors.dim}${key}=${Colors.reset}${value}`)
        .join(" ");
      logMessage += ` ${contextStr}`;
    }

    return logMessage;
  }

  // ✅ MÉTODOS PÚBLICOS
  static info(message: string, context?: LogContext): void {
    console.log(this.formatMessage("INFO", message, context));
  }

  static success(message: string, context?: LogContext): void {
    console.log(this.formatMessage("SUCCESS", message, context));
  }

  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("WARN", message, context));
  }

  static error(message: string, error?: any, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error(this.formatMessage("ERROR", message, errorContext));
  }

  static debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.log(this.formatMessage("DEBUG", message, context));
    }
  }

  // ✅ LOGS ESPECIALIZADOS
  static database(message: string, context?: LogContext): void {
    console.log(
      `${Colors.dim}${this.getTimestamp()}${Colors.reset} ${Colors.blue}${
        Emojis.DATABASE
      } DATABASE${Colors.reset} ${Colors.bright}${message}${Colors.reset}`,
      context || ""
    );
  }

  static server(message: string, context?: LogContext): void {
    console.log(
      `${Colors.dim}${this.getTimestamp()}${Colors.reset} ${Colors.green}${
        Emojis.SERVER
      } SERVER  ${Colors.reset} ${Colors.bright}${message}${Colors.reset}`,
      context || ""
    );
  }

  static request(message: string, context?: LogContext): void {
    console.log(
      `${Colors.dim}${this.getTimestamp()}${Colors.reset} ${Colors.cyan}${
        Emojis.REQUEST
      } REQUEST ${Colors.reset} ${Colors.bright}${message}${Colors.reset}`,
      context || ""
    );
  }

  static response(message: string, context?: LogContext): void {
    console.log(
      `${Colors.dim}${this.getTimestamp()}${Colors.reset} ${Colors.magenta}${
        Emojis.RESPONSE
      } RESPONSE${Colors.reset} ${Colors.bright}${message}${Colors.reset}`,
      context || ""
    );
  }
}

// ✅ MIDDLEWARE DE LOG HTTP MELHORADO
export const httpLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusColor =
      res.statusCode >= 400
        ? Colors.red
        : res.statusCode >= 300
        ? Colors.yellow
        : Colors.green;

    Logger.request(`${req.method} ${req.originalUrl}`, {
      status: `${statusColor}${res.statusCode}${Colors.reset}`,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent")?.substring(0, 50),
    });
  });

  next();
};

export { Logger };
