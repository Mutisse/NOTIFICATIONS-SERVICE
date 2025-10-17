import { Router } from "express";
import { OTPController } from "../controllers/otp/OTP.controller";
import { otpRateLimit, otpVerificationLimit } from "../middleware/otp.middleware";

const router = Router();
const otpController = new OTPController();

// 🎯 ROTAS PÚBLICAS OTP
router.post("/send", otpRateLimit, otpController.sendOTP);
router.post("/verify", otpVerificationLimit, otpController.verifyOTP);
router.post("/resend", otpRateLimit, otpController.resendOTP);

// 🎯 ROTAS DE CONSULTA
router.get("/status/:email", otpController.getStatus);
router.get("/statistics/:email", otpController.getStatistics);
router.get("/verification/:email/:purpose?", otpController.checkVerification);

// 🎯 ROTAS ADMIN/MANUTENÇÃO
router.delete("/cleanup", otpController.cleanup);
router.get("/admin/global-stats", otpController.globalStats);

// 🎯 HEALTH CHECK
router.get("/health", (req, res) => {
  res.json({
    service: "otp",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;