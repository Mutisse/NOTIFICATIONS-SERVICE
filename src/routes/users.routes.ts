import { Router } from "express";
import { UserController } from "../controllers/users/User.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validationMiddleware } from "../middleware/validation.middleware";

const router = Router();
const userController = new UserController();

// 🎯 ROTAS PÚBLICAS
router.post("/register", validationMiddleware, userController.register);
router.post("/login", userController.login);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);

// 🎯 ROTAS PROTEGIDAS
router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, validationMiddleware, userController.updateProfile);
router.put("/preferences", authMiddleware, userController.updatePreferences);
router.get("/preferences", authMiddleware, userController.getPreferences);

// 🎯 ROTAS ADMIN
router.get("/", authMiddleware, userController.getAllUsers);
router.get("/:id", authMiddleware, userController.getUserById);
router.put("/:id/status", authMiddleware, userController.updateUserStatus);
router.delete("/:id", authMiddleware, userController.deleteUser);

// 🎯 HEALTH CHECK
router.get("/health", (req, res) => {
  res.json({
    service: "users",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;