// NOTIFICATIONS-SERVICE/src/controllers/otp/OTP.controller.ts
import { Request, Response, NextFunction } from "express";
import { OTPService } from "../../services/otp/OTP.service";
import { AppError } from "../../utils/AppError";

export class OTPController {
  private otpService: OTPService;

  constructor() {
    this.otpService = new OTPService();
  }

  // ✅ ENVIAR OTP - CORRIGIDO
  public sendOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, purpose = "registration", name } = req.body;

      console.log("📤 [OTP SEND] Recebendo requisição:", {
        email,
        purpose,
        name,
      });

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Formato de email inválido", 400, "INVALID_EMAIL");
      }

      const result = await this.otpService.sendOTP(email, purpose, name);

      if (!result.success) {
        // CORREÇÃO: Usar retryAfter diretamente já que message não existe
        throw new AppError(
          `Aguarde ${result.retryAfter} segundos para solicitar um novo código`,
          429,
          "OTP_RATE_LIMITED"
        );
      }

      console.log(`✅ [OTP SEND] OTP enviado com sucesso para: ${email}`);

      res.status(200).json({
        success: true,
        message: "Código de verificação enviado para seu email",
        data: {
          email,
          purpose,
          expiresIn: "10 minutos",
        },
      });
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ VERIFICAR OTP
  public verifyOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      console.log("🔐 [OTP VERIFY] Recebendo requisição:", req.body);

      const { email, otpCode, code, purpose = "registration" } = req.body;
      const finalOtpCode = otpCode || code;

      if (!email || !finalOtpCode) {
        console.log("❌ [OTP VERIFY] Campos obrigatórios faltando:", {
          email,
          finalOtpCode,
        });
        throw new AppError(
          "Email e código são obrigatórios",
          400,
          "MISSING_CREDENTIALS"
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Formato de email inválido", 400, "INVALID_EMAIL");
      }

      if (!/^\d{6}$/.test(finalOtpCode)) {
        throw new AppError(
          "Código deve ter exatamente 6 dígitos",
          400,
          "INVALID_CODE_FORMAT"
        );
      }

      console.log(
        `✅ [OTP VERIFY] Validando OTP: ${finalOtpCode} para ${email}`
      );

      const result = await this.otpService.verifyOTP(
        email,
        finalOtpCode,
        purpose
      );

      if (!result.success) {
        console.log(`❌ [OTP VERIFY] Falha na verificação: ${result.message}`);
        throw new AppError(result.message, 400, "OTP_VERIFICATION_FAILED");
      }

      console.log(`🎉 [OTP VERIFY] OTP verificado com sucesso para: ${email}`);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          email,
          verified: true,
          purpose,
          verifiedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ INVALIDAR OTP - CORRIGIDO
  public invalidateOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, purpose = "password-recovery" } = req.body;

      console.log(
        `🔄 [OTP INVALIDATE] Invalidando OTP para: ${email}, propósito: ${purpose}`
      );

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const result = await this.otpService.invalidateOTP(email, purpose);

      if (!result.success) {
        throw new AppError(
          result.message || "Falha ao invalidar OTP",
          400,
          "INVALIDATE_FAILED"
        );
      }

      res.status(200).json({
        success: true,
        message: "OTP invalidado com sucesso",
        data: {
          email,
          purpose,
          invalidatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ REENVIAR OTP - CORRIGIDO
  public resendOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, name } = req.body;

      console.log("🔄 [OTP RESEND] Recebendo requisição:", { email, name });

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const result = await this.otpService.resendOTP(email, name);

      if (!result.success) {
        // CORREÇÃO: Usar retryAfter diretamente
        throw new AppError(
          `Aguarde ${result.retryAfter} segundos para solicitar um novo código`,
          429,
          "OTP_RATE_LIMITED"
        );
      }

      console.log(`✅ [OTP RESEND] OTP reenviado com sucesso para: ${email}`);

      res.status(200).json({
        success: true,
        message: "Novo código de verificação enviado para seu email",
        data: {
          email,
          expiresIn: "10 minutos",
        },
      });
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ OBTER STATUS DO OTP
  public getStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.params;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const status = await this.otpService.getOTPStatus(email);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ OBTER ESTATÍSTICAS DO OTP
  public getStatistics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.params;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const statistics = await this.otpService.getStatistics(email);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ VERIFICAR STATUS DE VERIFICAÇÃO
  public checkVerification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, purpose = "registration" } = req.params;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const isVerified = await this.otpService.isEmailVerified(email, purpose);

      res.status(200).json({
        success: true,
        data: {
          email,
          purpose,
          isVerified,
          verifiedAt: isVerified ? new Date().toISOString() : null,
        },
      });
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ VERIFICAR OTP ATIVO
  public checkActiveOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.params;
      const { purpose } = req.query;

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const hasActiveOTP = await this.otpService.hasActiveOTP(
        email,
        purpose as string
      );

      res.status(200).json({
        success: true,
        data: {
          email,
          purpose: purpose || "registration",
          hasActiveOTP,
          message: hasActiveOTP
            ? "Existe um OTP ativo para este email"
            : "Nenhum OTP ativo encontrado",
        },
      });
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ LIMPEZA DE OTPS
  public cleanup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { olderThan = 24 } = req.query; // horas

      const cutoffDate = new Date(
        Date.now() - parseInt(olderThan as string) * 60 * 60 * 1000
      );

      const result = await this.otpService.cleanupExpiredOTPs(cutoffDate);

      res.status(200).json({
        success: true,
        message: `Limpeza de OTPs concluída`,
        data: {
          deletedCount: result.deletedCount,
          cutoffDate: cutoffDate.toISOString(),
          olderThan: `${olderThan} horas`,
        },
      });
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ ESTATÍSTICAS GLOBAIS
  public globalStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stats = await this.otpService.globalStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ HEALTH CHECK DO OTP
  public healthCheck = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stats = await this.otpService.globalStats();

      res.status(200).json({
        service: "otp-service",
        status: "healthy",
        timestamp: new Date().toISOString(),
        data: {
          totalOTPs: stats.total,
          activeOTPs: stats.active,
          verificationRate: stats.verificationRate,
          purposes: stats.purposes,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        service: "otp-service",
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}
