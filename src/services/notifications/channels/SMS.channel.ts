import {
  NotificationRequest,
  NotificationType,
  UserRole,
} from "../../../models/interfaces/Notification.interface";

export class SMSService {
  private apiKey: string;
  private fromNumber: string;

  constructor() {
    this.apiKey = process.env.SMS_API_KEY || "";
    this.fromNumber = process.env.SMS_FROM_NUMBER || "";
  }

  async send(
    request: NotificationRequest
  ): Promise<{ success: boolean; content: string }> {
    try {
      // ✅ VERIFICA CONFIGURAÇÃO
      if (!this.isConfigured()) {
        console.warn("SMS não configurado - enviando para fallback");
        return {
          success: false,
          content: "SMS não configurado",
        };
      }

      const message = this.generateMessage(request);
      const result = await this.sendSMS(request.email, message);

      return {
        success: result,
        content: message,
      };
    } catch (error: unknown) {
      console.error("Erro no canal SMS:", error);
      return {
        success: false,
        content: `Erro SMS: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
      };
    }
  }

  private generateMessage(request: NotificationRequest): string {
    // ✅ CORREÇÃO: Interface mais específica para templates
    interface TemplateConfig {
      default: string;
      [key: string]: string;
    }

    // ✅ CORREÇÃO: Usar Partial para não precisar definir todos os tipos
    const templates: Partial<Record<NotificationType, TemplateConfig>> = {
      [NotificationType.OTP]: {
        default: `BeautyTime - Codigo: ${request.data.otpCode}. Valido por 10 min. Nao compartilhe.`,
        [UserRole.ADMIN_SYSTEM]: `BeautyTime Admin - Codigo: ${request.data.otpCode}. 10 min.`,
      },
      [NotificationType.WELCOME]: {
        default: `Bem-vindo ao BeautyTime! Acesse o app para comecar.`,
        [UserRole.CLIENT]: `Bem-vindo ao BeautyTime! Agende servicos pelo app.`,
        [UserRole.SALON_OWNER]: `Conta proprietario ativada. Acesse o painel admin.`,
        [UserRole.EMPLOYEE]: `Conta profissional criada. Acesse seus agendamentos.`,
      },
      [NotificationType.REMINDER]: {
        default: `Lembrete BeautyTime: ${
          request.data.message || "Lembrete do sistema"
        }`,
        appointment: `Lembrete: ${request.data.appointment?.service} em ${request.data.appointment?.date} as ${request.data.appointment?.time}`,
      },
      [NotificationType.SECURITY_ALERT]: {
        default: `Alerta Seguranca: ${
          request.data.message || "Atividade suspeita detectada"
        }`,
      },
      [NotificationType.APPOINTMENT_CONFIRMATION]: {
        default: `Agendamento confirmado: ${request.data.service} em ${request.data.date} as ${request.data.time}`,
      },
      [NotificationType.APPOINTMENT_REMINDER]: {
        default: `Lembrete: ${request.data.service} amanha as ${request.data.time}`,
      },
      [NotificationType.PAYMENT_CONFIRMATION]: {
        default: `Pagamento confirmado: R$ ${request.data.amount}. Obrigado!`,
      },
      [NotificationType.PASSWORD_RESET]: {
        default: `Redefinir senha: Codigo ${request.data.otpCode}. Valido 15 min.`,
      },
      [NotificationType.NEW_MESSAGE]: {
        default: `Nova mensagem: ${request.data.messageContent?.substring(0, 50)}...`,
      },
    };

    const templateType = templates[request.type];

    if (!templateType) {
      return `BeautyTime: ${request.data.message || "Notificacao"}`;
    }

    // ✅ CORREÇÃO: Garantir que template nunca seja undefined
    const userRole = request.userRole || "default";
    const template = templateType[userRole] || templateType.default;

    // ✅ LIMITA TAMANHO PARA SMS (160 caracteres)
    return template.length > 160
      ? template.substring(0, 157) + "..."
      : template;
  }

  private async sendSMS(email: string, message: string): Promise<boolean> {
    try {
      // ✅ IMPLEMENTAÇÃO SIMULADA - Substituir por API real
      console.log(`[SMS SIMULADO] Para: ${email}, Mensagem: ${message}`);

      // Simula delay de envio
      await new Promise((resolve) => setTimeout(resolve, 500));

      // ✅ EM PRODUÇÃO, IMPLEMENTAR AQUI:
      // - Twilio API
      // - AWS SNS
      // - Outro provedor SMS

      return true;
    } catch (error: unknown) {
      console.error("Falha ao enviar SMS:", error);
      return false;
    }
  }

  private isConfigured(): boolean {
    return !!(this.apiKey && this.fromNumber);
  }

  // ✅ MÉTODO PARA VERIFICAR CRÉDITOS/SALDO
  async getBalance(): Promise<{ balance: number; currency: string }> {
    // Simulação - implementar chamada real à API do provedor SMS
    return {
      balance: 100, // Simulado
      currency: "BRL",
    };
  }

  // ✅ MÉTODO PARA VERIFICAR STATUS DO SERVIÇO
  async getServiceStatus(): Promise<{ connected: boolean; service: string }> {
    return {
      connected: this.isConfigured(),
      service: "sms",
    };
  }
}