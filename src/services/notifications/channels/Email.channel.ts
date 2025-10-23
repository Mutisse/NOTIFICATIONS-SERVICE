import {
  NotificationRequest,
  NotificationType,
  UserRole,
} from "../../../models/interfaces/Notification.interface";
import { generateOTPTemplate } from "../templates/OTP.template";
import { generateWelcomeTemplate } from "../templates/Welcome.template";
import { generatePasswordResetTemplate } from "../templates/Security.template";
import { generateAppointmentReminderTemplate } from "../templates/Reminder.template";
import * as nodemailer from "nodemailer";

export class EmailChannel {
  private static instance: EmailChannel;
  private transporter: any;
  private configVerified = false;

  private constructor() {
    this.initializeTransporter();
  }

  public static getInstance(): EmailChannel {
    if (!EmailChannel.instance) {
      EmailChannel.instance = new EmailChannel();
    }
    return EmailChannel.instance;
  }

  private initializeTransporter(): void {
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
      console.error("❌ Falha na verificação de email:", error.message);
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
      return {
        success: false,
        content: `Erro: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
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
            request.userRole || UserRole.CLIENT,
            request.data
          ),
        };

      case NotificationType.SECURITY_ALERT:
        return {
          subject: "🛡️ Redefinição de Senha - BeautyTime",
          html: generatePasswordResetTemplate(
            request.data.resetToken,
            request.data.name
          ),
        };

      case NotificationType.REMINDER:
        return {
          subject: "⏰ Lembrete de Agendamento - BeautyTime",
          html: generateAppointmentReminderTemplate(request.data),
        };

      case NotificationType.APPOINTMENT_CONFIRMATION:
        return {
          subject: "✅ Agendamento Confirmado - BeautyTime",
          html: this.generateAppointmentConfirmationTemplate(request.data),
        };

      case NotificationType.PAYMENT_CONFIRMATION:
        return {
          subject: "💳 Pagamento Confirmado - BeautyTime",
          html: this.generatePaymentConfirmationTemplate(request.data),
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
      console.error(`❌ Falha ao enviar email para ${to}:`, error.message);
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

  private generateAppointmentConfirmationTemplate(data: any): string {
    const { name, service, date, time, professional, location } = data;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #10B981, #059669); padding: 30px; border-radius: 10px 10px 0 0; color: white; }
          .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .appointment-details { 
            background: #F0FDF4; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #10B981;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #6B7280; 
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✅ BeautyTime</div>
            <h1 style="margin: 10px 0 0 0; font-size: 24px;">Agendamento Confirmado!</h1>
          </div>
          
          <p style="font-size: 16px; color: #374151;">Olá <strong>${name}</strong>,</p>
          
          <p style="color: #6B7280; line-height: 1.6;">
            Seu agendamento foi confirmado com sucesso! Estamos ansiosos para atendê-lo(a).
          </p>
          
          <div class="appointment-details">
            <h3 style="margin: 0 0 15px 0; color: #374151;">📅 Detalhes do Agendamento</h3>
            <p style="margin: 8px 0; color: #6B7280;"><strong>Serviço:</strong> ${service}</p>
            <p style="margin: 8px 0; color: #6B7280;"><strong>Data:</strong> ${date}</p>
            <p style="margin: 8px 0; color: #6B7280;"><strong>Horário:</strong> ${time}</p>
            <p style="margin: 8px 0; color: #6B7280;"><strong>Profissional:</strong> ${professional}</p>
            ${location ? `<p style="margin: 8px 0; color: #6B7280;"><strong>Local:</strong> ${location}</p>` : ''}
          </div>
          
          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>💡 Lembrete:</strong> Chegue com 10 minutos de antecedência. 
            Cancelamentos devem ser feitos com pelo menos 2 horas de antecedência.
          </div>
          
          <div class="footer">
            <p>© 2024 BeautyTime. Todos os direitos reservados.</p>
            <p>Email: ${process.env.SMTP_USER} | Desenvolvido por Edilson Mutisse</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePaymentConfirmationTemplate(data: any): string {
    const { name, amount, paymentMethod, date, transactionId } = data;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #10B981, #059669); padding: 30px; border-radius: 10px 10px 0 0; color: white; }
          .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .payment-details { 
            background: #F0FDF4; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #10B981;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #6B7280; 
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">💳 BeautyTime</div>
            <h1 style="margin: 10px 0 0 0; font-size: 24px;">Pagamento Confirmado!</h1>
          </div>
          
          <p style="font-size: 16px; color: #374151;">Olá <strong>${name}</strong>,</p>
          
          <p style="color: #6B7280; line-height: 1.6;">
            Seu pagamento foi processado com sucesso! Obrigado por escolher a BeautyTime.
          </p>
          
          <div class="payment-details">
            <h3 style="margin: 0 0 15px 0; color: #374151;">💳 Detalhes do Pagamento</h3>
            <p style="margin: 8px 0; color: #6B7280;"><strong>Valor:</strong> ${amount}</p>
            <p style="margin: 8px 0; color: #6B7280;"><strong>Método:</strong> ${paymentMethod}</p>
            <p style="margin: 8px 0; color: #6B7280;"><strong>Data:</strong> ${date}</p>
            <p style="margin: 8px 0; color: #6B7280;"><strong>ID da Transação:</strong> ${transactionId}</p>
          </div>
          
          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>📧 Comprovante:</strong> Este email serve como comprovante de pagamento. 
            Guarde-o para sua referência.
          </div>
          
          <div class="footer">
            <p>© 2024 BeautyTime. Todos os direitos reservados.</p>
            <p>Email: ${process.env.SMTP_USER} | Desenvolvido por Edilson Mutisse</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}