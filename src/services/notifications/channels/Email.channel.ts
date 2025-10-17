import {
  NotificationRequest,
  NotificationType,
  UserRole,
} from "../../../models/interfaces/Notification.interface"; // ✅ CORREÇÃO: interfaces em vez de models
import { generateOTPTemplate } from "../templates/OTP.template";
import { generateWelcomeTemplate } from "../templates/Welcome.template";
import { generatePasswordResetTemplate } from "../templates/Reminder.template";
import * as nodemailer from "nodemailer";

export class EmailChannel {
  private transporter: any;
  private configVerified = false;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.verifyConfiguration().catch((error) => {
      console.error("Falha na verificação inicial de email:", error.message);
    });
  }

  async send(
    request: NotificationRequest
  ): Promise<{ success: boolean; content: string }> {
    try {
      if (!this.configVerified) {
        const isConfigured = await this.verifyConfiguration();
        if (!isConfigured) {
          return {
            success: false,
            content: "Configuração de email não verificada",
          };
        }
      }

      const { subject, html } = this.generateEmailContent(request);

      const result = await this.sendEmail(request.email, subject, html);

      return {
        success: result,
        content: html,
      };
    } catch (error: unknown) {
      // ✅ CORREÇÃO: error como unknown
      return {
        success: false,
        content: `Erro: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`, // ✅ CORREÇÃO: verificar tipo
      };
    }
  }

  private generateEmailContent(request: NotificationRequest): {
    subject: string;
    html: string;
  } {
    switch (request.type) {
      case NotificationType.OTP:
        return {
          subject: "🔐 Seu Código de Verificação - BeautyTime",
          html: generateOTPTemplate(
            request.data.otpCode,
            request.data.name,
            request.userRole
          ),
        };

      case NotificationType.WELCOME:
        return {
          subject: "🎉 Bem-vindo ao BeautyTime!",
          html: generateWelcomeTemplate(
            request.userRole || UserRole.CLIENT, // ✅ CORREÇÃO: valor padrão
            request.data
          ),
        };

      case NotificationType.SECURITY:
        return {
          subject: "🛡️ Ação de Segurança Requerida - BeautyTime",
          html: generatePasswordResetTemplate(
            request.data.resetToken,
            request.data.name
          ),
        };

      case NotificationType.REMINDER:
        return {
          subject: "⏰ Lembrete - BeautyTime",
          html: this.generateReminderTemplate(request.data),
        };

      default:
        return {
          subject: "Notificação BeautyTime",
          html: `<p>${
            request.data.message || "Notificação do sistema BeautyTime"
          }</p>`,
        };
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"BeautyTime" <${
          process.env.SMTP_FROM || process.env.SMTP_USER
        }>`,
        to: to,
        subject: subject,
        html: html,
      });

      return true;
    } catch (error: any) {
      console.error(`Falha ao enviar email para ${to}:`, error.message);
      return false;
    }
  }

  private async verifyConfiguration(): Promise<boolean> {
    try {
      if (this.configVerified) {
        return true;
      }

      await this.transporter.verify();
      this.configVerified = true;
      console.log("✅ Configuração de email verificada com sucesso");

      return true;
    } catch (error: any) {
      console.error("❌ Falha na verificação de email:", error.message);
      return false;
    }
  }

  private generateReminderTemplate(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #10B981, #059669); padding: 30px; border-radius: 10px 10px 0 0; color: white; }
          .content { padding: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; border-top: 1px solid #E5E7EB; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 28px; font-weight: bold;">💅 BeautyTime</div>
            <h1 style="margin: 10px 0 0 0; font-size: 24px;">Lembrete Importante</h1>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; color: #374151;">Olá <strong>${
              data.name || "usuário"
            }</strong>,</p>
            <p style="color: #6B7280; line-height: 1.6;">${
              data.message || "Este é um lembrete do sistema BeautyTime."
            }</p>
            
            ${
              data.appointment
                ? `
            <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #374151;">📅 Detalhes do Agendamento</h3>
              <p style="margin: 5px 0; color: #6B7280;"><strong>Serviço:</strong> ${data.appointment.service}</p>
              <p style="margin: 5px 0; color: #6B7280;"><strong>Data:</strong> ${data.appointment.date}</p>
              <p style="margin: 5px 0; color: #6B7280;"><strong>Horário:</strong> ${data.appointment.time}</p>
              <p style="margin: 5px 0; color: #6B7280;"><strong>Profissional:</strong> ${data.appointment.professional}</p>
            </div>
            `
                : ""
            }
          </div>
          
          <div class="footer">
            <p>© 2024 BeautyTime. Todos os direitos reservados.</p>
            <p>Email: ${
              process.env.SMTP_USER
            } | Desenvolvido por Edilson Mutisse</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
