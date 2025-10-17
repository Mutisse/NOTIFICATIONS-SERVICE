import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/AppError";
import { AuthRequest } from "../../middleware/auth.middleware";

export class NotificationController {
  public sendNotification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, channel, type, userRole, data, metadata } = req.body;

      if (!email || !channel || !type) {
        throw new AppError("Email, channel e type são obrigatórios", 400);
      }

      // Simulação - em produção, integrar com NotificationService
      console.log(
        `[NOTIFICATION] Enviando ${type} via ${channel} para ${email}`
      );

      res.status(200).json({
        success: true,
        message: "Notificação enviada com sucesso",
        data: {
          notificationId: "simulated-" + Date.now(),
          email,
          channel,
          type,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public sendBulkNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { notifications } = req.body;

      if (!Array.isArray(notifications)) {
        throw new AppError("Notifications deve ser um array", 400);
      }

      console.log(
        `[BULK NOTIFICATION] Enviando ${notifications.length} notificações`
      );

      res.status(200).json({
        success: true,
        data: {
          total: notifications.length,
          successful: notifications.length,
          failed: 0,
          results: notifications.map((notification, index) => ({
            index,
            success: true,
            notificationId: "bulk-simulated-" + index,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ✅ MÉTODOS QUE ESTAVAM FALTANDO:

  public getNotificationHistory = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10, channel, type } = req.query;

      // Simulação - em produção, buscar do banco
      const history = {
        email: userId || "user@example.com",
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
      };

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  public getPreferences = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;

      const preferences = {
        channels: {
          email: true,
          whatsapp: true,
          sms: false,
          push: true,
          system: true,
        },
        globalOptIn: true,
      };

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  };

  public updatePreferences = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      const { channels } = req.body;

      console.log(
        `[PREFERENCES] Atualizando preferências para usuário: ${userId}`
      );

      res.status(200).json({
        success: true,
        message: "Preferências de notificação atualizadas",
        data: {
          channels: channels || {
            email: true,
            whatsapp: true,
            sms: false,
            push: true,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public getTemplates = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { type, channel } = req.query;

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

      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAnalytics = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { startDate, endDate, channel } = req.query;

      // Simulação - em produção, gerar analytics do banco
      const analytics = {
        period: {
          start: startDate || new Date().toISOString(),
          end: endDate || new Date().toISOString(),
        },
        totalSent: 100,
        byChannel: {
          email: 60,
          whatsapp: 30,
          sms: 10,
        },
        byType: {
          welcome: 40,
          otp: 35,
          reminder: 25,
        },
        successRate: 95.5,
      };

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  public getStats = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Simulação - em produção, calcular stats do banco
      const stats = {
        total: 1000,
        byChannel: {
          email: 600,
          whatsapp: 300,
          sms: 100,
        },
        byType: {
          welcome: 400,
          otp: 350,
          reminder: 250,
        },
        byStatus: {
          sent: 950,
          failed: 50,
          pending: 0,
        },
        successRate: 95,
      };

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  public getNotificationById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError("ID da notificação é obrigatório", 400);
      }

      // Simulação - em produção, buscar do banco
      const notification = {
        id: id,
        email: "user@example.com",
        channel: "email",
        type: "welcome",
        status: "sent",
        content: "Conteúdo da notificação",
        sentAt: new Date(),
        data: {},
      };

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  };
}
