// NOTIFICATIONS-SERVICE/src/controllers/otpController.ts
import { Request, Response, NextFunction } from "express";
import { OTPService } from "../../services/otp/OTP.service";
import { AppError } from "../../utils/AppError";

export class OTPController {
  private otpService: OTPService;

  constructor() {
    this.otpService = new OTPService();
  }

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
    } catch (error) {
      next(error);
    }
  };

  public verifyOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      console.log("🔐 [OTP VERIFY] Recebendo requisição:", req.body);

      // ✅ CORREÇÃO: Aceitar tanto 'otpCode' quanto 'code' para compatibilidade
      const { email, otpCode, code, purpose = "registration" } = req.body;

      // ✅ Compatibilidade: usar 'code' se 'otpCode' não estiver presente
      const finalOtpCode = otpCode || code;

      // ✅ VALIDAÇÕES DETALHADAS
      if (!email || !finalOtpCode) {
        console.log("❌ [OTP VERIFY] Campos obrigatórios faltando:", {
          email,
          receivedOtpCode: otpCode,
          receivedCode: code,
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
        console.log("❌ [OTP VERIFY] Email inválido:", email);
        throw new AppError("Formato de email inválido", 400, "INVALID_EMAIL");
      }

      if (!/^\d{6}$/.test(finalOtpCode)) {
        console.log("❌ [OTP VERIFY] Código inválido:", finalOtpCode);
        throw new AppError(
          "Código deve ter exatamente 6 dígitos",
          400,
          "INVALID_CODE_FORMAT"
        );
      }

      console.log(
        `✅ [OTP VERIFY] Validando OTP: ${finalOtpCode} para ${email}, propósito: ${purpose}`
      );

      // ✅ CHAMAR O SERVIÇO
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
    } catch (error) {
      next(error);
    }
  };

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

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Formato de email inválido", 400, "INVALID_EMAIL");
      }

      const result = await this.otpService.resendOTP(email, name);

      if (!result.success) {
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
    } catch (error) {
      next(error);
    }
  };

  public getStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.params;

      console.log("📊 [OTP STATUS] Recebendo requisição para:", email);

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Formato de email inválido", 400, "INVALID_EMAIL");
      }

      const status = await this.otpService.getOTPStatus(email);

      console.log(`✅ [OTP STATUS] Status recuperado para: ${email}`);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  };

  public checkVerification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, purpose = "registration" } = req.params;

      console.log("🔍 [OTP CHECK] Verificando email:", { email, purpose });

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Formato de email inválido", 400, "INVALID_EMAIL");
      }

      const isVerified = await this.otpService.isEmailVerified(email, purpose);

      console.log(
        `✅ [OTP CHECK] Verificação concluída para: ${email} - ${
          isVerified ? "VERIFICADO" : "NÃO VERIFICADO"
        }`
      );

      res.status(200).json({
        success: true,
        data: {
          email,
          purpose,
          isVerified,
          verifiedAt: isVerified ? new Date().toISOString() : null,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public cleanup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("🧹 [OTP CLEANUP] Iniciando limpeza de OTPs expirados");

      const result = await this.otpService.cleanupExpiredOTPs();

      console.log(
        `✅ [OTP CLEANUP] Limpeza concluída: ${result.deleted} OTPs expirados removidos`
      );

      res.status(200).json({
        success: true,
        message: `Limpeza concluída: ${result.deleted} OTPs expirados removidos`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public checkActiveOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.params;
      const { purpose } = req.query;

      console.log("🔍 [OTP ACTIVE] Verificando OTP ativo para:", {
        email,
        purpose,
      });

      if (!email) {
        throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Formato de email inválido", 400, "INVALID_EMAIL");
      }

      const hasActiveOTP = await this.otpService.hasActiveOTP(
        email,
        purpose as string
      );

      console.log(
        `✅ [OTP ACTIVE] Verificação concluída: ${email} - ${
          hasActiveOTP ? "TEM OTP ATIVO" : "SEM OTP ATIVO"
        }`
      );

      res.status(200).json({
        success: true,
        data: {
          email,
          purpose: purpose || "registration",
          hasActiveOTP,
          checkedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
