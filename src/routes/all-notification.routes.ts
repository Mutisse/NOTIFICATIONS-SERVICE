// NOTIFICATIONS-SERVICE/src/routes/index.ts
import { Router } from "express";
import { NotificationController } from "../controllers/notifications/Notification.controller";
import { OTPController } from "../controllers/otp/OTP.controller";
import { NotificationService } from "../services/notifications/Notification.service";
import { OTPService } from "../services/otp/OTP.service";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  otpRateLimit,
  otpVerificationLimit,
} from "../middleware/otp.middleware";

const router = Router();

// ✅ INICIALIZAR CONTROLLERS E SERVICES
const notificationController = new NotificationController();
const otpController = new OTPController();
const notificationService = new NotificationService();
const otpService = new OTPService();

// =============================================
// 🎯 ROTAS PÚBLICAS - NOVO FLUXO OTP
// =============================================

router.post(
  "/notifications/send-verification-email",
  notificationController.sendVerificationEmail
);
router.post(
  "/notifications/verify-email-otp",
  notificationController.verifyEmailOTP
);
router.post(
  "/notifications/send-welcome-email",
  notificationController.sendWelcomeEmail
);

// =============================================
// 📧 ROTAS PÚBLICAS - NOTIFICAÇÕES TRADICIONAIS
// =============================================

router.post("/notifications/send", notificationController.sendNotification);
router.post(
  "/notifications/send-bulk",
  notificationController.sendBulkNotifications
);

// =============================================
// 🔐 ROTAS OTP - CÓDIGOS DE VERIFICAÇÃO
// =============================================

router.post("/otp/send", otpRateLimit, otpController.sendOTP);
router.post("/otp/verify", otpVerificationLimit, otpController.verifyOTP);
router.post("/otp/resend", otpRateLimit, otpController.resendOTP);

// =============================================
// 📊 ROTAS DE CONSULTA - OTP
// =============================================

router.get("/otp/status/:email", otpController.getStatus);
// ✅ REMOVIDO: router.get("/otp/statistics/:email", otpController.getStatistics); - MÉTODO NÃO EXISTE
router.get(
  "/otp/verification/:email/:purpose?",
  otpController.checkVerification
);
// ✅ NOVA ROTA: Verificar OTP ativo
router.get("/otp/active/:email", otpController.checkActiveOTP);

// =============================================
// 🛠️ ROTAS ADMIN/MANUTENÇÃO - OTP
// =============================================

router.delete("/otp/cleanup", otpController.cleanup);
// ✅ REMOVIDO: router.get("/otp/admin/global-stats", otpController.globalStats); - MÉTODO NÃO EXISTE

// =============================================
// 🛡️ ROTAS PROTEGIDAS - NOTIFICAÇÕES
// =============================================

router.get(
  "/notifications/history",
  authMiddleware,
  notificationController.getNotificationHistory
);
router.get(
  "/notifications/preferences",
  authMiddleware,
  notificationController.getPreferences
);
router.put(
  "/notifications/preferences",
  authMiddleware,
  notificationController.updatePreferences
);
router.get(
  "/notifications/templates",
  authMiddleware,
  notificationController.getTemplates
);

// =============================================
// 📈 ROTAS ADMIN - NOTIFICAÇÕES
// =============================================

router.get(
  "/notifications/analytics",
  authMiddleware,
  notificationController.getAnalytics
);
router.get(
  "/notifications/stats",
  authMiddleware,
  notificationController.getStats
);
router.get(
  "/notifications/:id",
  authMiddleware,
  notificationController.getNotificationById
);

// =============================================
// 🔗 ROTAS INTERNAS (comunicação entre serviços)
// =============================================

// OTP - Para outros serviços enviarem OTP
router.post("/internal/notifications/otp", async (req, res) => {
  try {
    const { email, otpCode, name, userRole } = req.body;
    console.log(`[INTERNAL] Enviando OTP para: ${email}`);

    const success = await notificationService.sendOTP(
      email,
      otpCode,
      name,
      userRole
    );

    res.json({
      success,
      message: success ? "OTP enviado com sucesso" : "Falha ao enviar OTP",
    });
  } catch (error: any) {
    console.error(`[INTERNAL] Erro OTP:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// WELCOME - Para Auth Service enviar email de boas-vindas
router.post("/internal/notifications/welcome", async (req, res) => {
  try {
    const { email, userRole, userData } = req.body;
    console.log(
      `[INTERNAL] Enviando welcome para: ${email}, role: ${userRole}`
    );

    const success = await notificationService.sendWelcome(
      email,
      userRole,
      userData
    );

    res.json({
      success,
      message: success
        ? "Email de boas-vindas enviado"
        : "Falha ao enviar welcome",
    });
  } catch (error: any) {
    console.error(`[INTERNAL] Erro welcome:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// SEND - Para outros serviços enviarem notificações genéricas
router.post("/internal/notifications/send", async (req, res) => {
  try {
    const { email, channel, type, userRole, data, metadata } = req.body;
    console.log(`[INTERNAL] Notificação: ${type} via ${channel} para ${email}`);

    const result = await notificationService.sendNotification({
      email,
      channel,
      type,
      userRole,
      data,
      metadata,
    });

    res.json({
      success: result.success,
      notificationId: result.notificationId,
      message: result.success ? "Notificação enviada" : "Falha na notificação",
    });
  } catch (error: any) {
    console.error(`[INTERNAL] Erro notificação:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// VERIFY EMAIL - Para verificar email via OTP
router.post("/internal/notifications/verify-email", async (req, res) => {
  try {
    const { email, otpCode, purpose = "registration" } = req.body;
    console.log(`[INTERNAL] Verificando email: ${email}`);

    const result = await otpService.verifyOTP(email, otpCode, purpose);

    res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error: any) {
    console.error(`[INTERNAL] Erro verificação:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PREFERENCES - Para buscar preferências do usuário
router.get("/internal/users/:email/preferences", async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`[INTERNAL] Buscando preferências para: ${email}`);

    const preferences = await notificationService.getUserPreferences(email);

    res.json({ preferences });
  } catch (error: any) {
    console.error(`[INTERNAL] Erro preferências:`, error);
    res.status(500).json({
      error: error.message,
    });
  }
});

// EMAIL VERIFICATION STATUS - Para verificar status de verificação
router.get("/internal/users/:email/verification-status", async (req, res) => {
  try {
    const { email } = req.params;
    const { purpose = "registration" } = req.query;
    console.log(`[INTERNAL] Verificando status para: ${email}`);

    const isVerified = await otpService.isEmailVerified(
      email,
      purpose as string
    );

    res.json({
      email,
      purpose,
      isVerified,
    });
  } catch (error: any) {
    console.error(`[INTERNAL] Erro status verificação:`, error);
    res.status(500).json({
      error: error.message,
    });
  }
});

// ✅ NOVA ROTA INTERNA: Verificar OTP ativo
router.get("/internal/users/:email/active-otp", async (req, res) => {
  try {
    const { email } = req.params;
    const { purpose } = req.query;
    console.log(`[INTERNAL] Verificando OTP ativo para: ${email}`);

    const hasActiveOTP = await otpService.hasActiveOTP(email, purpose as string);

    res.json({
      email,
      purpose: purpose || "registration",
      hasActiveOTP,
    });
  } catch (error: any) {
    console.error(`[INTERNAL] Erro verificação OTP ativo:`, error);
    res.status(500).json({
      error: error.message,
    });
  }
});

// ✅ NOVA ROTA INTERNA: Status completo do OTP
router.get("/internal/users/:email/otp-status", async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`[INTERNAL] Buscando status completo OTP para: ${email}`);

    const status = await otpService.getOTPStatus(email);

    res.json({
      email,
      status,
    });
  } catch (error: any) {
    console.error(`[INTERNAL] Erro status OTP:`, error);
    res.status(500).json({
      error: error.message,
    });
  }
});

// =============================================
// 🩺 HEALTH CHECKS (OBRIGATÓRIOS)
// =============================================

router.get("/health", (req, res) => {
  res.json({
    service: "notification-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    modules: ["notifications", "otp", "internal-routes"],
  });
});

router.get("/ping", (req, res) => {
  res.json({
    service: "notification-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Health checks individuais
router.get("/notifications/health", (req, res) => {
  res.json({
    service: "notifications",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

router.get("/otp/health", (req, res) => {
  res.json({
    service: "otp",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

router.get("/internal/health", (req, res) => {
  res.json({
    service: "internal-routes",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;