import { Logger } from "../utils/logger";

export const validateEnvironment = (): void => {
  const requiredEnvVars = [
    "MONGODB_URI",
    "JWT_SECRET",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    Logger.error("❌ Variáveis de ambiente faltando:", {
      missing: missingVars,
    });
    throw new Error(
      `Variáveis de ambiente necessárias: ${missingVars.join(", ")}`
    );
  }

  Logger.info("✅ Variáveis de ambiente validadas com sucesso", {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    database: process.env.MONGODB_URI ? "configurada" : "faltando",
  });
};

export const getConfig = () => {
  return {
    // Server
    server: {
      port: parseInt(process.env.PORT || "3000"),
      nodeEnv: process.env.NODE_ENV || "development",
      isProduction: process.env.NODE_ENV === "production",
      isDevelopment:
        process.env.NODE_ENV === "development" || !process.env.NODE_ENV,
    },

    // Database
    database: {
      uri: process.env.MONGODB_URI || "mongodb://localhost:27017/beautytime",
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    },

    // JWT
    jwt: {
      secret: process.env.JWT_SECRET || "fallback-secret",
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },

    // Email
    email: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      secure: process.env.SMTP_SECURE === "true",
    },

    // WhatsApp
    whatsapp: {
      apiKey: process.env.WHATSAPP_API_KEY,
      phoneNumber: process.env.WHATSAPP_PHONE_NUMBER,
      enabled: !!(
        process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_NUMBER
      ),
    },

    // SMS
    sms: {
      apiKey: process.env.SMS_API_KEY,
      from: process.env.SMS_FROM_NUMBER,
      enabled: !!(process.env.SMS_API_KEY && process.env.SMS_FROM_NUMBER),
    },

    // App
    app: {
      url: process.env.APP_URL || "http://localhost:3000",
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
      ],
      name: "BeautyTime Gateway",
      version: "1.0.0",
    },

    // OTP
    otp: {
      length: 6,
      expiresIn: 10, // minutos
      maxAttempts: 5,
      resendDelay: 60, // segundos
    },
  };
};

// ✅ VALIDA CONFIGURAÇÃO DE EMAIL
export const validateEmailConfig = (): boolean => {
  const { email } = getConfig();
  return !!(email.host && email.user && email.pass);
};

// ✅ VALIDA CONFIGURAÇÃO DE WHATSAPP
export const validateWhatsAppConfig = (): boolean => {
  const { whatsapp } = getConfig();
  return whatsapp.enabled;
};

// ✅ VALIDA CONFIGURAÇÃO DE SMS
export const validateSMSConfig = (): boolean => {
  const { sms } = getConfig();
  return sms.enabled;
};
