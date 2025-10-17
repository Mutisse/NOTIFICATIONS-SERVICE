import { NotificationModel } from "../../models/Notification.model";
import { EmailChannel } from "./channels/Email.channel";
import { WhatsAppChannel } from "./channels/WhatsApp.channel";
import { SMSService } from "./channels/SMS.channel"; // ✅ CORREÇÃO: SMSService em vez de SMSChannel
import { AppError } from "../../utils/AppError";
import { internalClient } from "../../utils/httpClient";
import {
  NotificationRequest,
  NotificationChannel,
  NotificationType,
  UserRole,
} from "../../models/interfaces/Notification.interface"; // ✅ CORREÇÃO: caminho correto

export class NotificationService {
  private emailChannel: EmailChannel;
  private whatsappChannel: WhatsAppChannel;
  private smsService: SMSService; // ✅ CORREÇÃO: smsService em vez de smsChannel

  constructor() {
    this.emailChannel = new EmailChannel();
    this.whatsappChannel = new WhatsAppChannel();
    this.smsService = new SMSService(); // ✅ CORREÇÃO: SMSService
  }

  async sendNotification(request: NotificationRequest): Promise<{
    success: boolean;
    notificationId: string;
    channel: string;
  }> {
    try {
      // ✅ CRIA REGISTRO DA NOTIFICAÇÃO
      const notification = new NotificationModel({
        email: request.email,
        channel: request.channel,
        type: request.type,
        userRole: request.userRole,
        data: request.data,
        metadata: request.metadata,
        content: "", // Será preenchido pelo canal
        status: "pending",
      });

      await notification.save();

      // ✅ ENVIA PELO CANAL ESPECÍFICO
      let result: boolean;
      let content: string;

      switch (request.channel) {
        case NotificationChannel.EMAIL:
          ({ success: result, content } = await this.emailChannel.send(
            request
          ));
          break;

        case NotificationChannel.WHATSAPP:
          ({ success: result, content } = await this.whatsappChannel.send(
            request
          ));
          break;

        case NotificationChannel.SMS:
          ({ success: result, content } = await this.smsService.send(request)); // ✅ CORREÇÃO: smsService
          break;

        default:
          throw new AppError(`Canal não suportado: ${request.channel}`, 400);
      }

      // ✅ ATUALIZA NOTIFICAÇÃO
      notification.content = content;
      notification.status = result ? "sent" : "failed";
      notification.sentAt = result ? new Date() : undefined;
      notification.error = result ? undefined : "Falha no envio pelo canal";

      await notification.save();

      return {
        success: result,
        notificationId: notification._id.toString(),
        channel: request.channel,
      };
    } catch (error: unknown) {
      // ✅ CORREÇÃO: error como unknown
      throw new AppError(
        `Erro ao enviar notificação: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`, // ✅ CORREÇÃO: verificar tipo
        500,
        "NOTIFICATION_SEND_ERROR"
      );
    }
  }

  // ✅ MÉTODO PARA ENVIO MULTI-CANAL
  async sendMultiChannel(
    request: Omit<NotificationRequest, "channel"> & {
      channels: NotificationChannel[];
    }
  ): Promise<{
    success: boolean;
    results: Array<{
      channel: string;
      success: boolean;
      notificationId?: string;
    }>;
  }> {
    const promises = request.channels.map((channel) =>
      this.sendNotification({ ...request, channel })
        .then((result) => ({
          channel,
          success: result.success,
          notificationId: result.notificationId,
        }))
        .catch((error) => ({ channel, success: false, error: error.message }))
    );

    const results = await Promise.allSettled(promises);
    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    return {
      success: successfulResults.some((r) => r.success),
      results: successfulResults,
    };
  }

  // ✅ MÉTODO ESPECÍFICO PARA OTP (chamado pelo OTP service)
  async sendOTP(
    email: string,
    otpCode: string,
    name?: string,
    userRole?: UserRole
  ): Promise<boolean> {
    const request: NotificationRequest = {
      email,
      channel: NotificationChannel.EMAIL, // Canal padrão para OTP
      type: NotificationType.OTP,
      userRole,
      data: { otpCode, name },
      metadata: { source: "otp_service", internal: true },
    };

    const result = await this.sendNotification(request);
    return result.success;
  }

  // ✅ MÉTODO PARA BOAS-VINDAS MULTI-CANAL
  async sendWelcome(
    email: string,
    userRole: UserRole,
    userData: any
  ): Promise<boolean> {
    // ✅ DETERMINA CANAIS BASEADO NO TIPO DE USUÁRIO
    const channelConfig: Record<UserRole, NotificationChannel[]> = {
      [UserRole.CLIENT]: [
        NotificationChannel.EMAIL,
        NotificationChannel.WHATSAPP,
      ],
      [UserRole.EMPLOYEE]: [
        NotificationChannel.EMAIL,
        NotificationChannel.SYSTEM,
      ],
      [UserRole.SALON_OWNER]: [
        NotificationChannel.EMAIL,
        NotificationChannel.WHATSAPP,
        NotificationChannel.SYSTEM,
      ],
      [UserRole.ADMIN_SYSTEM]: [
        NotificationChannel.EMAIL,
        NotificationChannel.SYSTEM,
      ],
    };

    const channels = channelConfig[userRole] || [NotificationChannel.EMAIL];

    const result = await this.sendMultiChannel({
      email,
      channels,
      type: NotificationType.WELCOME,
      userRole,
      data: userData,
      metadata: { source: "user_registration", internal: true },
    });

    return result.success;
  }

  // ✅ COMUNICAÇÃO INTERNA: BUSCAR PREFERÊNCIAS DO USUÁRIO
  async getUserPreferences(email: string): Promise<{ channels: string[] }> {
    try {
      // ✅ CHAMADA INTERNA PARA USER SERVICE
      const response = await internalClient.get(
        `/api/internal/users/${email}/preferences`
      );
      const userData = response as { preferences: { channels: string[] } }; // ✅ CORREÇÃO: type assertion

      return userData.preferences;
    } catch (error: unknown) {
      // ✅ CORREÇÃO: error como unknown
      // ✅ FALLBACK: retorna canais padrão
      console.warn(`Falha ao buscar preferências de ${email}, usando padrão`);
      return { channels: ["email"] };
    }
  }

  // ✅ ADICIONE ESTES MÉTODOS QUE ESTÃO FALTANDO PARA O CONTROLLER:

  async getUserNotificationHistory(
    userId: string,
    options: { page: number; limit: number; channel?: string; type?: string }
  ): Promise<any> {
    // Simulação - em produção, buscar do banco
    return {
      email: userId,
      notifications: [
        {
          id: "1",
          channel: "email",
          type: "welcome",
          status: "sent",
          sentAt: new Date(),
          content: "Email de boas-vindas",
        },
      ],
      total: 1,
      page: options.page,
      pages: 1,
    };
  }

  async updateUserPreferences(userId: string, channels: any): Promise<any> {
    // Simulação - em produção, salvar no banco
    return {
      channels: channels || {
        email: true,
        whatsapp: true,
        sms: false,
        push: true,
      },
      updatedAt: new Date(),
    };
  }

  async getTemplates(type?: string, channel?: string): Promise<any> {
    // Simulação - em produção, buscar templates do banco
    const templates = {
      welcome: {
        email: "Template de boas-vindas por email",
        whatsapp: "Template de boas-vindas por WhatsApp",
        sms: "Template de boas-vindas por SMS",
      },
      otp: {
        email: "Template de OTP por email",
        whatsapp: "Template de OTP por WhatsApp",
        sms: "Template de OTP por SMS",
      },
    };

    return templates;
  }

  async getAnalytics(options: {
    startDate?: string;
    endDate?: string;
    channel?: string;
  }): Promise<any> {
    // Simulação - em produção, gerar analytics do banco
    return {
      period: {
        start: options.startDate || new Date().toISOString(),
        end: options.endDate || new Date().toISOString(),
      },
      totalSent: 150,
      byChannel: {
        email: 90,
        whatsapp: 45,
        sms: 15,
      },
      successRate: 96.2,
    };
  }

  async getStats(): Promise<any> {
    // Simulação - em produção, calcular stats do banco
    return {
      total: 1250,
      byChannel: {
        email: 750,
        whatsapp: 375,
        sms: 125,
      },
      successRate: 95,
    };
  }

  async getNotificationById(id: string): Promise<any> {
    // Simulação - em produção, buscar do banco
    return {
      id: id,
      email: "user@example.com",
      channel: "email",
      type: "welcome",
      status: "sent",
      content: "Conteúdo da notificação",
      sentAt: new Date(),
    };
  }
}
