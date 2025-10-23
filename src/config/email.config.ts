import nodemailer from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "edilson.mutisse.dev@gmail.com",
    pass: process.env.SMTP_PASS || "",
  },
  from: process.env.SMTP_FROM || "BeautyTime <edilson.mutisse.dev@gmail.com>",
};

// Criar transporter de email
export const emailTransporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.port === 465,
  auth: {
    user: emailConfig.auth.user,
    pass: emailConfig.auth.pass,
  },
});

// Verificar conexão SMTP
export const verifySMTPConnection = async (): Promise<boolean> => {
  try {
    await emailTransporter.verify();
    console.log("✅ SMTP Connection verified successfully");
    return true;
  } catch (error) {
    console.error("❌ SMTP Connection failed:", error);
    return false;
  }
};
