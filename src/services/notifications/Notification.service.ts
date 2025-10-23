import { NotificationModel } from "../../models/Notification.model";
import { EmailChannel } from "./channels/Email.channel";
import { WhatsAppChannel } from "./channels/WhatsApp.channel";
import { SMSService } from "./channels/SMS.channel";
import { AppError } from "../../utils/AppError";
import { internalClient } from "../../utils/httpClient";
import {
  NotificationRequest,
  NotificationChannel,
  NotificationType,
  UserRole,
  NotificationPriority,
  NotificationMetadata,
} from "../../models/interfaces/Notification.interface";

export class NotificationService {
  private emailChannel: EmailChannel;
  private whatsappChannel: WhatsAppChannel;
  private smsService: SMSService;

  constructor() {
    this.emailChannel = EmailChannel.getInstance();
    this.whatsappChannel = new WhatsAppChannel();
    this.smsService = new SMSService();
  }

  async sendNotification(request: NotificationRequest): Promise<{
    success: boolean;
    notificationId: string;
    channel: string;
  }> {
    try {
      // ✅ GERA CONTEÚDO ANTES DE CRIAR A NOTIFICAÇÃO
      let content = "";
      let result = false;

      switch (request.channel) {
        case NotificationChannel.EMAIL:
          const emailResult = await this.emailChannel.send(request);
          content = emailResult.content || this.generateDefaultContent(request);
          result = emailResult.success;
          break;

        case NotificationChannel.WHATSAPP:
          const whatsappResult = await this.whatsappChannel.send(request);
          content =
            whatsappResult.content || this.generateDefaultContent(request);
          result = whatsappResult.success;
          break;

        case NotificationChannel.SMS:
          const smsResult = await this.smsService.send(request);
          content = smsResult.content || this.generateDefaultContent(request);
          result = smsResult.success;
          break;

        default:
          throw new AppError(`Canal não suportado: ${request.channel}`, 400);
      }

      // ✅ CRIA NOTIFICAÇÃO COM CONTEÚDO JÁ GERADO
      const notification = new NotificationModel({
        email: request.email,
        channel: request.channel,
        type: request.type,
        userRole: request.userRole,
        data: request.data,
        metadata: request.metadata,
        content: content, // ✅ CONTEÚDO JÁ PREENCHIDO
        status: "pending",
      });

      await notification.save();

      // ✅ ATUALIZA STATUS
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
      throw new AppError(
        `Erro ao enviar notificação: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
        500,
        "NOTIFICATION_SEND_ERROR"
      );
    }
  }

  // ✅ MÉTODO PARA GERAR CONTEÚDO PADRÃO
  private generateDefaultContent(request: NotificationRequest): string {
    const { type, data, userRole } = request;

    switch (type) {
      case NotificationType.OTP:
        return `Seu código de verificação é: ${data.otpCode}. Use este código para completar sua verificação.`;

      case NotificationType.WELCOME:
        return `Bem-vindo(a) à BeautyTime Platform! Sua conta ${userRole} foi criada com sucesso.`;

      case NotificationType.REMINDER:
        return `Lembrete: ${
          data.message || "Não se esqueça do seu compromisso."
        }`;

      case NotificationType.SECURITY_ALERT:
        return `Alerta de Segurança: ${
          data.message || "Atividade suspeita detectada na sua conta."
        }`;

      case NotificationType.APPOINTMENT_CONFIRMATION:
        return `Seu agendamento foi confirmado para ${data.date} às ${data.time}.`;

      case NotificationType.PAYMENT_CONFIRMATION:
        return `Pagamento confirmado no valor de ${data.amount}. Obrigado!`;

      default:
        return `Notificação do tipo: ${type}. Dados: ${JSON.stringify(data)}`;
    }
  }

  // ✅ MÉTODO PARA ENVIO DE OTP (CORRIGIDO)
  async sendOTP(
    email: string,
    otpCode: string,
    name?: string,
    userRole?: UserRole
  ): Promise<boolean> {
    const metadata: NotificationMetadata = {
      source: "otp_service",
      internal: true,
      timestamp: new Date().toISOString(), // ✅ AGORA É VÁLIDO
    };

    const request: NotificationRequest = {
      email,
      channel: NotificationChannel.EMAIL,
      type: NotificationType.OTP,
      userRole: userRole || UserRole.CLIENT,
      data: {
        otpCode,
        name: name || "Usuário",
        expiresIn: "15 minutos",
      },
      metadata: metadata, // ✅ METADATA CORRETA
    };

    const result = await this.sendNotification(request);
    return result.success;
  }

  // ✅ MÉTODO PARA ENVIO DE ALERTA DE SEGURANÇA (CORRIGIDO)
  async sendSecurityAlert(
    email: string,
    alertData: any,
    userRole: UserRole = UserRole.CLIENT
  ): Promise<boolean> {
    const metadata: NotificationMetadata = {
      source: "security_service",
      internal: true,
      priority: NotificationPriority.HIGH, // ✅ AGORA É VÁLIDO
      timestamp: new Date().toISOString(),
    };

    const request: NotificationRequest = {
      email,
      channel: NotificationChannel.EMAIL,
      type: NotificationType.SECURITY_ALERT, // ✅ AGORA É VÁLIDO
      userRole,
      data: alertData,
      metadata: metadata,
    };

    const result = await this.sendNotification(request);
    return result.success;
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

  // ✅ MÉTODO PARA BOAS-VINDAS
  async sendWelcome(
    email: string,
    userRole: UserRole,
    userData: any
  ): Promise<boolean> {
    const channelConfig: Record<UserRole, NotificationChannel[]> = {
      [UserRole.CLIENT]: [NotificationChannel.EMAIL],
      [UserRole.EMPLOYEE]: [NotificationChannel.EMAIL],
      [UserRole.SALON_OWNER]: [NotificationChannel.EMAIL],
      [UserRole.ADMIN_SYSTEM]: [NotificationChannel.EMAIL],
    };

    const channels = channelConfig[userRole] || [NotificationChannel.EMAIL];

    const result = await this.sendMultiChannel({
      email,
      channels,
      type: NotificationType.WELCOME,
      userRole,
      data: userData,
      metadata: {
        source: "user_registration",
        internal: true,
        timestamp: new Date().toISOString(),
      },
    });

    return result.success;
  }

  // ✅ MÉTODO PARA ENVIO DE LEMBRETES
  async sendReminder(
    email: string,
    reminderData: any,
    userRole: UserRole = UserRole.CLIENT
  ): Promise<boolean> {
    const request: NotificationRequest = {
      email,
      channel: NotificationChannel.EMAIL,
      type: NotificationType.REMINDER,
      userRole,
      data: reminderData,
      metadata: {
        source: "reminder_service",
        internal: true,
        timestamp: new Date().toISOString(),
      },
    };

    const result = await this.sendNotification(request);
    return result.success;
  }

  // ✅ MÉTODOS AUXILIARES PARA O CONTROLLER
  async getUserNotificationHistory(
    email: string,
    options: { page: number; limit: number; channel?: string; type?: string }
  ): Promise<any> {
    const skip = (options.page - 1) * options.limit;

    const filter: any = { email: email };
    if (options.channel) filter.channel = options.channel;
    if (options.type) filter.type = options.type;

    const [notifications, total] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit),
      NotificationModel.countDocuments(filter),
    ]);

    return {
      email: email,
      notifications: notifications.map((notif) => ({
        id: notif._id.toString(),
        channel: notif.channel,
        type: notif.type,
        status: notif.status,
        sentAt: notif.sentAt,
        content: notif.content,
        subject: notif.subject,
      })),
      total,
      page: options.page,
      pages: Math.ceil(total / options.limit),
    };
  }

  async updateUserPreferences(email: string, channels: any): Promise<any> {
    // Em produção, integrar com User Service
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

  // ✅ MÉTODO getTemplates ATUALIZADO COM NOVA ASSINATURA
  async getTemplates(
    type?: NotificationType,
    channel?: NotificationChannel
  ): Promise<any> {
    // ✅ DEFINIR TEMPLATES PARA TODOS OS TIPOS EXISTENTES
    const templates: Record<
      NotificationType,
      Record<NotificationChannel, string>
    > = {
      [NotificationType.OTP]: {
        [NotificationChannel.EMAIL]: "Template de OTP por email",
        [NotificationChannel.WHATSAPP]: "Template de OTP por WhatsApp",
        [NotificationChannel.SMS]: "Template de OTP por SMS",
        [NotificationChannel.PUSH]: "Template de OTP por Push",
      },
      [NotificationType.WELCOME]: {
        [NotificationChannel.EMAIL]: "Template de boas-vindas por email",
        [NotificationChannel.WHATSAPP]: "Template de boas-vindas por WhatsApp",
        [NotificationChannel.SMS]: "Template de boas-vindas por SMS",
        [NotificationChannel.PUSH]: "Template de boas-vindas por Push",
      },
      [NotificationType.REMINDER]: {
        [NotificationChannel.EMAIL]: "Template de lembrete por email",
        [NotificationChannel.WHATSAPP]: "Template de lembrete por WhatsApp",
        [NotificationChannel.SMS]: "Template de lembrete por SMS",
        [NotificationChannel.PUSH]: "Template de lembrete por Push",
      },
      [NotificationType.SECURITY_ALERT]: {
        [NotificationChannel.EMAIL]:
          "Template de alerta de segurança por email",
        [NotificationChannel.WHATSAPP]:
          "Template de alerta de segurança por WhatsApp",
        [NotificationChannel.SMS]: "Template de alerta de segurança por SMS",
        [NotificationChannel.PUSH]: "Template de alerta de segurança por Push",
      },
      [NotificationType.APPOINTMENT_CONFIRMATION]: {
        [NotificationChannel.EMAIL]:
          "Template de confirmação de agendamento por email",
        [NotificationChannel.WHATSAPP]:
          "Template de confirmação de agendamento por WhatsApp",
        [NotificationChannel.SMS]:
          "Template de confirmação de agendamento por SMS",
        [NotificationChannel.PUSH]:
          "Template de confirmação de agendamento por Push",
      },
      [NotificationType.APPOINTMENT_REMINDER]: {
        [NotificationChannel.EMAIL]:
          "Template de lembrete de agendamento por email",
        [NotificationChannel.WHATSAPP]:
          "Template de lembrete de agendamento por WhatsApp",
        [NotificationChannel.SMS]:
          "Template de lembrete de agendamento por SMS",
        [NotificationChannel.PUSH]:
          "Template de lembrete de agendamento por Push",
      },
      [NotificationType.PAYMENT_CONFIRMATION]: {
        [NotificationChannel.EMAIL]:
          "Template de confirmação de pagamento por email",
        [NotificationChannel.WHATSAPP]:
          "Template de confirmação de pagamento por WhatsApp",
        [NotificationChannel.SMS]:
          "Template de confirmação de pagamento por SMS",
        [NotificationChannel.PUSH]:
          "Template de confirmação de pagamento por Push",
      },
      [NotificationType.PASSWORD_RESET]: {
        [NotificationChannel.EMAIL]:
          "Template de redefinição de senha por email",
        [NotificationChannel.WHATSAPP]:
          "Template de redefinição de senha por WhatsApp",
        [NotificationChannel.SMS]: "Template de redefinição de senha por SMS",
        [NotificationChannel.PUSH]: "Template de redefinição de senha por Push",
      },
      [NotificationType.NEW_MESSAGE]: {
        [NotificationChannel.EMAIL]: "Template de nova mensagem por email",
        [NotificationChannel.WHATSAPP]:
          "Template de nova mensagem por WhatsApp",
        [NotificationChannel.SMS]: "Template de nova mensagem por SMS",
        [NotificationChannel.PUSH]: "Template de nova mensagem por Push",
      },
    };

    // ✅ SE ESPECIFICOU TIPO E CANAL, RETORNA O TEMPLATE ESPECÍFICO
    if (type && channel) {
      const template = templates[type]?.[channel];
      return template || "Template não encontrado";
    }

    // ✅ SE ESPECIFICOU APENAS O TIPO, RETORNA TODOS OS CANAIS DISPONÍVEIS
    if (type) {
      return templates[type] || {};
    }

    // ✅ SE NÃO ESPECIFICOU NADA, RETORNA TODOS OS TEMPLATES
    return templates;
  }
  async getAnalytics(options: {
    startDate?: string;
    endDate?: string;
    channel?: string;
  }): Promise<any> {
    const filter: any = {};

    if (options.startDate && options.endDate) {
      filter.createdAt = {
        $gte: new Date(options.startDate),
        $lte: new Date(options.endDate),
      };
    }

    if (options.channel) {
      filter.channel = options.channel;
    }

    const totalSent = await NotificationModel.countDocuments(filter);
    const sent = await NotificationModel.countDocuments({
      ...filter,
      status: "sent",
    });
    const successRate = totalSent > 0 ? (sent / totalSent) * 100 : 0;

    const byChannel = await NotificationModel.aggregate([
      { $match: filter },
      { $group: { _id: "$channel", count: { $sum: 1 } } },
    ]);

    const byType = await NotificationModel.aggregate([
      { $match: filter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    return {
      period: {
        start: options.startDate || new Date().toISOString(),
        end: options.endDate || new Date().toISOString(),
      },
      totalSent,
      byChannel: byChannel.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {} as Record<string, number>),
      byType: byType.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {} as Record<string, number>),
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  async getStats(): Promise<any> {
    const total = await NotificationModel.countDocuments();
    const sent = await NotificationModel.countDocuments({ status: "sent" });
    const failed = await NotificationModel.countDocuments({ status: "failed" });
    const successRate = total > 0 ? (sent / total) * 100 : 0;

    const byChannel = await NotificationModel.aggregate([
      { $group: { _id: "$channel", count: { $sum: 1 } } },
    ]);

    const byType = await NotificationModel.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const byStatus = await NotificationModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return {
      total,
      byChannel: byChannel.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {} as Record<string, number>),
      byType: byType.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {} as Record<string, number>),
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {} as Record<string, number>),
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  async getNotificationById(id: string): Promise<any> {
    const notification = await NotificationModel.findById(id);

    if (!notification) {
      throw new AppError(
        "Notificação não encontrada",
        404,
        "NOTIFICATION_NOT_FOUND"
      );
    }

    return {
      id: notification._id.toString(),
      email: notification.email,
      channel: notification.channel,
      type: notification.type,
      status: notification.status,
      content: notification.content,
      subject: notification.subject,
      sentAt: notification.sentAt,
      data: notification.data,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  async getUserPreferences(email: string): Promise<{ channels: string[] }> {
    try {
      const response = await internalClient.get(
        `/api/internal/users/${email}/preferences`
      );
      return (response as any).preferences;
    } catch (error: unknown) {
      console.warn(`Falha ao buscar preferências de ${email}, usando padrão`);
      return { channels: ["email"] };
    }
  }

  // ✅ MÉTODO PARA LIMPEZA DE NOTIFICAÇÕES ANTIGAS
  async cleanupOldNotifications(
    days: number = 30
  ): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await NotificationModel.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: { $in: ["sent", "failed"] },
    });

    return { deleted: result.deletedCount || 0 };
  }

  // ✅ MÉTODO PARA REENVIO DE NOTIFICAÇÕES FALHAS
  async retryFailedNotifications(): Promise<{
    retried: number;
    successful: number;
  }> {
    const failedNotifications = await NotificationModel.find({
      status: "failed",
      attempts: { $lt: 3 },
    });

    let successful = 0;

    for (const notification of failedNotifications) {
      try {
        const request: NotificationRequest = {
          email: notification.email,
          channel: notification.channel as NotificationChannel,
          type: notification.type as NotificationType,
          userRole: notification.userRole as UserRole,
          data: notification.data,
          metadata: notification.metadata,
        };

        const result = await this.sendNotification(request);

        if (result.success) {
          successful++;
        }

        await NotificationModel.findByIdAndUpdate(notification._id, {
          attempts: notification.attempts + 1,
        });
      } catch (error) {
        console.error(`Falha no reenvio para ${notification.email}:`, error);
      }
    }

    return {
      retried: failedNotifications.length,
      successful,
    };
  }

  // ✅ MÉTODO PARA VERIFICAR STATUS DE ENVIO
  async getNotificationStatus(notificationId: string): Promise<{
    status: string;
    sentAt?: Date;
    error?: string;
  }> {
    const notification = await NotificationModel.findById(notificationId);

    if (!notification) {
      throw new AppError(
        "Notificação não encontrada",
        404,
        "NOTIFICATION_NOT_FOUND"
      );
    }

    return {
      status: notification.status,
      sentAt: notification.sentAt,
      error: notification.error,
    };
  }

  // ✅ MÉTODO PARA BUSCAR NOTIFICAÇÕES POR STATUS
  async getNotificationsByStatus(
    status: string,
    options: { page: number; limit: number } = { page: 1, limit: 50 }
  ): Promise<any> {
    const skip = (options.page - 1) * options.limit;

    const [notifications, total] = await Promise.all([
      NotificationModel.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit),
      NotificationModel.countDocuments({ status }),
    ]);

    return {
      status,
      notifications: notifications.map((notif) => ({
        id: notif._id.toString(),
        email: notif.email,
        channel: notif.channel,
        type: notif.type,
        sentAt: notif.sentAt,
        createdAt: notif.createdAt,
      })),
      total,
      page: options.page,
      pages: Math.ceil(total / options.limit),
    };
  }
  // ✅ MÉTODO: Marcar notificação como lida
  async markAsRead(notificationId: string, userId: string): Promise<any> {
    const notification = await NotificationModel.findOne({
      _id: notificationId,
      email: userId,
    });

    if (!notification) {
      throw new AppError("Notificação não encontrada", 404);
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return {
      id: notification._id.toString(),
      read: true,
      readAt: notification.readAt,
    };
  }

  // ✅ MÉTODO: Marcar todas como lidas
  async markAllAsRead(userId: string): Promise<{ markedCount: number }> {
    const result = await NotificationModel.updateMany(
      {
        email: userId,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    return {
      markedCount: result.modifiedCount || 0,
    };
  }

  // ✅ MÉTODO: Excluir notificação
  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<any> {
    const notification = await NotificationModel.findOneAndDelete({
      _id: notificationId,
      email: userId,
    });

    if (!notification) {
      throw new AppError("Notificação não encontrada", 404);
    }

    return {
      id: notificationId,
      deleted: true,
      deletedAt: new Date(),
    };
  }

  // ✅ MÉTODO: Limpar histórico
  async clearHistory(
    userId: string,
    filters?: { channel?: string; type?: string }
  ): Promise<{ deletedCount: number }> {
    const query: any = { email: userId };

    if (filters?.channel) {
      query.channel = filters.channel;
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    const result = await NotificationModel.deleteMany(query);

    return {
      deletedCount: result.deletedCount || 0,
    };
  }
}
