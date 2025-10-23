import { Request, Response } from "express";
import { NotificationService } from "../../services/notifications/Notification.service";
import { OTPService } from "../../services/otp/OTP.service";
import { AppError } from "../../utils/AppError";
import {
  NotificationChannel,
  NotificationType,
  UserRole,
} from "../../models/interfaces/Notification.interface";

export class NotificationController {
  private notificationService: NotificationService;
  private otpService: OTPService;

  constructor() {
    this.notificationService = new NotificationService();
    this.otpService = new OTPService();
  }

  // ✅ ENVIAR EMAIL DE VERIFICAÇÃO
  sendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, name, userRole } = req.body;

      if (!email) {
        throw new AppError("Email é obrigatório", 400);
      }

      const result = await this.notificationService.sendOTP(
        email,
        "123456",
        name,
        userRole
      );

      res.json({
        success: result,
        message: result
          ? "Email de verificação enviado com sucesso"
          : "Falha ao enviar email de verificação",
      });
    } catch (error: any) {
      console.error("Erro ao enviar email de verificação:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ✅ VERIFICAR EMAIL VIA OTP
  verifyEmailOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, otpCode } = req.body;

      if (!email || !otpCode) {
        throw new AppError("Email e código OTP são obrigatórios", 400);
      }

      const result = await this.otpService.verifyOTP(
        email,
        otpCode,
        "registration"
      );

      res.json({
        success: result.success,
        message: result.message,
        verified: result.success,
      });
    } catch (error: any) {
      console.error("Erro ao verificar OTP:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ✅ ENVIAR EMAIL DE BOAS-VINDAS
  sendWelcomeEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, userRole, userData } = req.body;

      if (!email) {
        throw new AppError("Email é obrigatório", 400);
      }

      const result = await this.notificationService.sendWelcome(
        email,
        userRole || UserRole.CLIENT,
        userData || {}
      );

      res.json({
        success: result,
        message: result
          ? "Email de boas-vindas enviado com sucesso"
          : "Falha ao enviar email de boas-vindas",
      });
    } catch (error: any) {
      console.error("Erro ao enviar email de boas-vindas:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ✅ ENVIAR NOTIFICAÇÃO
  sendNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, channel, type, userRole, data, metadata } = req.body;

      if (!email || !channel || !type) {
        throw new AppError("Email, channel e type são obrigatórios", 400);
      }

      const result = await this.notificationService.sendNotification({
        email,
        channel: channel as NotificationChannel,
        type: type as NotificationType,
        userRole: userRole as UserRole,
        data: data || {},
        metadata: metadata || {},
      });

      res.json({
        success: result.success,
        notificationId: result.notificationId,
        channel: result.channel,
        message: result.success
          ? "Notificação enviada com sucesso"
          : "Falha ao enviar notificação",
      });
    } catch (error: any) {
      console.error("Erro ao enviar notificação:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ✅ ENVIAR NOTIFICAÇÕES EM MASSA
  sendBulkNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { notifications } = req.body;

      if (!Array.isArray(notifications) || notifications.length === 0) {
        throw new AppError("Array de notificações é obrigatório", 400);
      }

      const results = await Promise.allSettled(
        notifications.map((notification) =>
          this.notificationService.sendNotification(notification)
        )
      );

      const successful = results.filter(
        (result): result is PromiseFulfilledResult<any> =>
          result.status === "fulfilled" && result.value.success
      ).length;

      const failed = results.length - successful;

      res.json({
        success: failed === 0,
        total: notifications.length,
        successful,
        failed,
        results: results.map((result, index) => ({
          index,
          success: result.status === "fulfilled" && result.value.success,
          notificationId:
            result.status === "fulfilled" ? result.value.notificationId : null,
          error: result.status === "rejected" ? result.reason.message : null,
        })),
      });
    } catch (error: any) {
      console.error("Erro ao enviar notificações em massa:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ✅ OBTER HISTÓRICO DE NOTIFICAÇÕES
  getNotificationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = (req as any).user;
      const { page = 1, limit = 20, channel, type } = req.query;

      const history = await this.notificationService.getUserNotificationHistory(
        email,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          channel: channel as string,
          type: type as string,
        }
      );

      res.json(history);
    } catch (error: any) {
      console.error("Erro ao buscar histórico de notificações:", error);
      res.status(error.statusCode || 500).json({
        error: error.message,
      });
    }
  };

  // ✅ OBTER PREFERÊNCIAS DO USUÁRIO
  getPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = (req as any).user;

      const preferences = await this.notificationService.getUserPreferences(
        email
      );

      res.json({
        email,
        preferences,
      });
    } catch (error: any) {
      console.error("Erro ao buscar preferências:", error);
      res.status(error.statusCode || 500).json({
        error: error.message,
      });
    }
  };

  // ✅ ATUALIZAR PREFERÊNCIAS DO USUÁRIO
  updatePreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = (req as any).user;
      const { channels } = req.body;

      if (!channels) {
        throw new AppError("Canais são obrigatórios", 400);
      }

      const preferences = await this.notificationService.updateUserPreferences(
        email,
        channels
      );

      res.json({
        email,
        preferences,
        message: "Preferências atualizadas com sucesso",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar preferências:", error);
      res.status(error.statusCode || 500).json({
        error: error.message,
      });
    }
  };

  // ✅ OBTER TEMPLATES (CORRIGIDO)
  getTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { channel, type } = req.query;

      const templates = await this.notificationService.getTemplates(
        type as NotificationType,
        channel as NotificationChannel
      );

      res.json({
        templates,
        total: typeof templates === 'object' ? Object.keys(templates).length : 1,
        filters: {
          channel: channel || "all",
          type: type || "all",
        },
      });
    } catch (error: any) {
      console.error("Erro ao buscar templates:", error);
      res.status(error.statusCode || 500).json({
        error: error.message,
      });
    }
  };

  // ✅ OBTER ANALYTICS
  getAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, channel } = req.query;

      const analytics = await this.notificationService.getAnalytics({
        startDate: startDate as string,
        endDate: endDate as string,
        channel: channel as string,
      });

      res.json(analytics);
    } catch (error: any) {
      console.error("Erro ao buscar analytics:", error);
      res.status(error.statusCode || 500).json({
        error: error.message,
      });
    }
  };

  // ✅ OBTER ESTATÍSTICAS
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.notificationService.getStats();

      res.json(stats);
    } catch (error: any) {
      console.error("Erro ao buscar estatísticas:", error);
      res.status(error.statusCode || 500).json({
        error: error.message,
      });
    }
  };

  // ✅ OBTER NOTIFICAÇÃO POR ID
  getNotificationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError("ID da notificação é obrigatório", 400);
      }

      const notification = await this.notificationService.getNotificationById(
        id
      );

      res.json(notification);
    } catch (error: any) {
      console.error("Erro ao buscar notificação:", error);
      res.status(error.statusCode || 500).json({
        error: error.message,
      });
    }
  };

  // ✅ MARCAR NOTIFICAÇÃO COMO LIDA
  markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { email } = (req as any).user;

      if (!id) {
        throw new AppError("ID da notificação é obrigatório", 400);
      }

      const result = await this.notificationService.markAsRead(id, email);

      res.json({
        success: true,
        message: "Notificação marcada como lida",
        ...result,
      });
    } catch (error: any) {
      console.error("Erro ao marcar notificação como lida:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ✅ MARCAR TODAS COMO LIDAS
  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = (req as any).user;

      const result = await this.notificationService.markAllAsRead(email);

      res.json({
        success: true,
        message: `${result.markedCount} notificações marcadas como lidas`,
        ...result,
      });
    } catch (error: any) {
      console.error("Erro ao marcar todas como lidas:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ✅ EXCLUIR NOTIFICAÇÃO
  deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { email } = (req as any).user;

      if (!id) {
        throw new AppError("ID da notificação é obrigatório", 400);
      }

      const result = await this.notificationService.deleteNotification(id, email);

      res.json({
        success: true,
        message: "Notificação excluída com sucesso",
        ...result,
      });
    } catch (error: any) {
      console.error("Erro ao excluir notificação:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ✅ LIMPAR HISTÓRICO
  clearHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = (req as any).user;
      const { channel, type } = req.query;

      const result = await this.notificationService.clearHistory(email, {
        channel: channel as string,
        type: type as string,
      });

      res.json({
        success: true,
        message: `Histórico limpo (${result.deletedCount} notificações excluídas)`,
        ...result,
      });
    } catch (error: any) {
      console.error("Erro ao limpar histórico:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ✅ HEALTH CHECK
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const [stats, templates] = await Promise.all([
        this.notificationService.getStats(),
        this.notificationService.getTemplates(),
      ]);

      res.json({
        service: "notification-controller",
        status: "healthy",
        timestamp: new Date().toISOString(),
        stats: {
          totalNotifications: stats.total,
          successRate: stats.successRate,
        },
        templatesCount: typeof templates === 'object' ? Object.keys(templates).length : 1,
      });
    } catch (error: any) {
      console.error("Erro no health check:", error);
      res.status(500).json({
        service: "notification-controller",
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}