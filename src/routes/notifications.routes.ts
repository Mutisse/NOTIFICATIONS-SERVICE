import { Router } from "express";
import { NotificationController } from "../controllers/notifications/Notification.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validationMiddleware } from "../middleware/validation.middleware";

const router = Router();
const notificationController = new NotificationController();

// 🎯 ROTAS PÚBLICAS
router.post("/send", validationMiddleware, notificationController.sendNotification);
router.post("/send-bulk", validationMiddleware, notificationController.sendBulkNotifications);

// 🎯 ROTAS PROTEGIDAS
router.get("/history", authMiddleware, notificationController.getNotificationHistory);
router.get("/preferences", authMiddleware, notificationController.getPreferences);
router.put("/preferences", authMiddleware, notificationController.updatePreferences);
router.get("/templates", authMiddleware, notificationController.getTemplates);

// 🎯 ROTAS ADMIN
router.get("/analytics", authMiddleware, notificationController.getAnalytics);
router.get("/stats", authMiddleware, notificationController.getStats);
router.get("/:id", authMiddleware, notificationController.getNotificationById);

// 🎯 HEALTH CHECK
router.get("/health", (req, res) => {
  res.json({
    service: "notifications",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;