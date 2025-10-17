import {
  NotificationRequest,
  NotificationType,
  UserRole,
} from "../../../models/interfaces/Notification.interface";

export class WhatsAppChannel {
  private apiKey: string;
  private phoneNumber: string;

  constructor() {
    this.apiKey = process.env.WHATSAPP_API_KEY || "";
    this.phoneNumber = process.env.WHATSAPP_PHONE_NUMBER || "";
  }

  async send(
    request: NotificationRequest
  ): Promise<{ success: boolean; content: string }> {
    try {
      if (!this.isConfigured()) {
        console.warn("WhatsApp não configurado - enviando para fallback");
        return {
          success: false,
          content: "WhatsApp não configurado",
        };
      }

      const message = this.generateMessage(request);
      const result = await this.sendWhatsAppMessage(request.email, message);

      return {
        success: result,
        content: message,
      };
    } catch (error: unknown) {
      console.error("Erro no canal WhatsApp:", error);
      return {
        success: false,
        content: `Erro WhatsApp: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
      };
    }
  }

  private generateMessage(request: NotificationRequest): string {
    // ✅ CORREÇÃO: Interface mais específica para garantir que default sempre existe
    interface TemplateConfig {
      default: string;
      [key: string]: string;
    }

    const templates: Record<NotificationType, TemplateConfig> = {
      [NotificationType.OTP]: {
        default: `🔐 *BeautyTime - Código de Verificação*\n\nOlá! Seu código de verificação é: *${request.data.otpCode}*\n\nEste código expira em 10 minutos.\n\n_Não compartilhe este código com ninguém._`,
        [UserRole.ADMIN_SYSTEM]: `🔐 *BeautyTime - Código Admin*\n\nCódigo de verificação: *${request.data.otpCode}*\n\nExpira em 10 minutos.`,
      },
      [NotificationType.WELCOME]: {
        default: `🎉 *Bem-vindo ao BeautyTime!*\n\nOlá ${
          request.data.name || "usuário"
        }! Sua conta foi criada com sucesso.\n\nAcesse o app para começar a usar nossos serviços.`,
        [UserRole.CLIENT]: `🎉 *Bem-vindo ao BeautyTime!*\n\nOlá ${request.data.name}! Agora você pode agendar serviços, gerenciar seus horários e muito mais!\n\n📱 Baixe nosso app para melhor experiência.`,
        [UserRole.SALON_OWNER]: `🎉 *Bem-vindo ao BeautyTime!*\n\nOlá ${request.data.name}! Sua conta de proprietário foi ativada.\n\n💼 Acesse o painel admin para configurar seu salão.`,
        [UserRole.EMPLOYEE]: `🎉 *Bem-vindo ao BeautyTime!*\n\nOlá ${request.data.name}! Sua conta de profissional foi criada.\n\n✂️ Acesse o painel para ver seus agendamentos.`,
      },
      [NotificationType.REMINDER]: {
        default: `⏰ *Lembrete BeautyTime*\n\n${
          request.data.message || "Lembrete do sistema BeautyTime."
        }`,
        appointment: `⏰ *Lembrete de Agendamento*\n\nOlá ${
          request.data.name
        }! Você tem um agendamento:\n\n📅 ${
          request.data.appointment?.service
        }\n🕐 ${request.data.appointment?.date} às ${
          request.data.appointment?.time
        }\n👨‍💼 ${request.data.appointment?.professional}\n\n📍 ${
          request.data.appointment?.location || "Nosso salão"
        }`,
      },
      [NotificationType.SECURITY]: {
        default: `🛡️ *BeautyTime - Segurança*\n\n${
          request.data.message || "Notificação de segurança."
        }`,
      },
      [NotificationType.MARKETING]: {
        default: `📢 *BeautyTime*\n\n${
          request.data.message || "Promoção especial!"
        }`,
      },
    };

    const templateType = templates[request.type];

    if (!templateType) {
      return `*BeautyTime*\n\n${
        request.data.message || "Notificação do sistema"
      }`;
    }

    // ✅ CORREÇÃO: Garantir que sempre retorne uma string
    const userRole = request.userRole || "default";
    const template = templateType[userRole] || templateType.default;

    return template;
  }

  private async sendWhatsAppMessage(
    email: string,
    message: string
  ): Promise<boolean> {
    try {
      console.log(`[WHATSAPP SIMULADO] Para: ${email}, Mensagem: ${message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return true;
    } catch (error: unknown) {
      console.error("Falha ao enviar WhatsApp:", error);
      return false;
    }
  }

  private isConfigured(): boolean {
    return !!(this.apiKey && this.phoneNumber);
  }

  async getServiceStatus(): Promise<{ connected: boolean; service: string }> {
    return {
      connected: this.isConfigured(),
      service: "whatsapp",
    };
  }
}
