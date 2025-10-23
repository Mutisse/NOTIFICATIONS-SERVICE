// NOTIFICATIONS-SERVICE/src/services/otp/OTP.service.ts
import { OTPModel } from "../../models/OTP.model";
import { VerifiedEmailModel } from "../../models/VerifiedEmail.model";
import { NotificationService } from "../notifications/Notification.service";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../models/interfaces/Notification.interface";

export class OTPService {
  private readonly OTP_CONFIG = {
    LENGTH: 6,
    EXPIRES_IN: 10, // 10 minutos
    MAX_ATTEMPTS: 5,
    RESEND_DELAY: 60, // 60 segundos
  };

  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  private generateOTP(): string {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < this.OTP_CONFIG.LENGTH; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  async sendOTP(
    email: string,
    purpose: string = "registration",
    name?: string
  ): Promise<{ success: boolean; retryAfter?: number; debugOtp?: string }> {
    try {
      console.log(`📤 [OTP SERVICE] Processando OTP para: ${email}, propósito: ${purpose}`);

      // ✅ VALIDAÇÃO DE RATE LIMIT
      const recentOTP = await OTPModel.findOne({
        email: email.toLowerCase().trim(),
        purpose,
        createdAt: {
          $gte: new Date(Date.now() - this.OTP_CONFIG.RESEND_DELAY * 1000),
        },
      });

      if (recentOTP) {
        const timeElapsed = Date.now() - recentOTP.createdAt.getTime();
        const retryAfter = this.OTP_CONFIG.RESEND_DELAY * 1000 - timeElapsed;
        if (retryAfter > 0) {
          return {
            success: false,
            retryAfter: Math.ceil(retryAfter / 1000),
          };
        }
      }

      // ✅ INVALIDA OTPS ANTERIORES
      await OTPModel.updateMany(
        { email: email.toLowerCase().trim(), purpose, verified: false },
        { verified: true }
      );

      // ✅ GERA NOVO OTP
      const otpCode = this.generateOTP();
      const expiresAt = new Date(
        Date.now() + this.OTP_CONFIG.EXPIRES_IN * 60 * 1000
      );

      const otpData = new OTPModel({
        email: email.toLowerCase().trim(),
        code: otpCode,
        purpose,
        attempts: 0,
        verified: false,
        expiresAt,
      });

      await otpData.save();

      console.log(`✅ [OTP SERVICE] OTP gerado: ${otpCode} para ${email}`);

      // ✅ ENVIO REAL DE EMAIL
      try {
        let userRole: UserRole = UserRole.CLIENT;
        if (purpose.includes('admin')) userRole = UserRole.ADMIN_SYSTEM;
        if (purpose.includes('employee')) userRole = UserRole.EMPLOYEE;
        if (purpose.includes('owner')) userRole = UserRole.SALON_OWNER;

        const emailSent = await this.notificationService.sendOTP(
          email, 
          otpCode, 
          name, 
          userRole
        );

        if (!emailSent) {
          await OTPModel.findByIdAndDelete(otpData._id);
          throw new AppError(
            "Falha ao enviar email de verificação",
            500,
            "EMAIL_SEND_FAILED"
          );
        }

        console.log(`✅ [OTP SERVICE] Email REAL enviado para: ${email}`);
        
        return { 
          success: true,
          debugOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined
        };

      } catch (notificationError) {
        await OTPModel.findByIdAndDelete(otpData._id);
        console.error(`❌ [OTP SERVICE] Erro ao enviar email:`, notificationError);
        throw new AppError(
          "Serviço de email indisponível",
          500,
          "EMAIL_SERVICE_UNAVAILABLE"
        );
      }

    } catch (error) {
      console.error(`❌ [OTP SERVICE] Erro geral:`, error);
      throw error;
    }
  }

  async verifyOTP(
    email: string,
    otpCode: string,
    purpose: string = "registration"
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🎯 [OTP SERVICE VERIFY] Iniciando verificação para:`, {
        email,
        otpCode,
        purpose,
        otpCodeLength: otpCode?.length,
        otpCodeType: typeof otpCode
      });

      // ✅ VALIDAÇÃO ROBUSTA DOS PARÂMETROS
      if (!email || !otpCode || otpCode.toString().trim() === '') {
        console.log('❌ [OTP SERVICE VERIFY] VALIDAÇÃO FALHOU:', {
          emailPresent: !!email,
          otpCodePresent: !!otpCode,
          otpCodeValue: otpCode,
          emailValue: email
        });
        return {
          success: false,
          message: "Email e código OTP são obrigatórios"
        };
      }

      // ✅ VALIDAÇÃO DO FORMATO DO CÓDIGO
      const cleanOtpCode = otpCode.toString().trim();
      if (!/^\d{6}$/.test(cleanOtpCode)) {
        console.log('❌ [OTP SERVICE VERIFY] Formato de código inválido:', cleanOtpCode);
        return {
          success: false,
          message: "Código deve ter exatamente 6 dígitos"
        };
      }

      console.log(`🔍 [OTP SERVICE VERIFY] Buscando OTP no banco para: ${email}`);

      // ✅ BUSCA OTP NO BANCO
      const otpData = await OTPModel.findOne({
        email: email.toLowerCase().trim(),
        purpose: purpose,
        expiresAt: { $gt: new Date() },
      });

      if (!otpData) {
        console.log(`❌ [OTP SERVICE VERIFY] OTP não encontrado/expirado para: ${email}`);
        return {
          success: false,
          message: "Código OTP não encontrado ou expirado. Solicite um novo código.",
        };
      }

      if (otpData.verified) {
        console.log(`❌ [OTP SERVICE VERIFY] OTP já utilizado para: ${email}`);
        return {
          success: false,
          message: "Código OTP já foi utilizado. Solicite um novo código.",
        };
      }

      if (otpData.attempts >= this.OTP_CONFIG.MAX_ATTEMPTS) {
        await OTPModel.findByIdAndUpdate(otpData._id, { verified: true });
        console.log(`❌ [OTP SERVICE VERIFY] Tentativas excedidas para: ${email}`);
        return {
          success: false,
          message: "Número máximo de tentativas excedido. Solicite um novo código.",
        };
      }

      // ✅ VERIFICA SE O CÓDIGO CONFERE
      if (otpData.code !== cleanOtpCode) {
        otpData.attempts += 1;
        await otpData.save();

        const remainingAttempts = this.OTP_CONFIG.MAX_ATTEMPTS - otpData.attempts;
        console.log(`❌ [OTP SERVICE VERIFY] OTP incorreto para: ${email}. Tentativas: ${otpData.attempts}/${this.OTP_CONFIG.MAX_ATTEMPTS}`);
        
        return {
          success: false,
          message: `Código OTP inválido. ${remainingAttempts} tentativa(s) restante(s).`,
        };
      }

      // ✅ MARCA OTP COMO VERIFICADO
      otpData.verified = true;
      otpData.usedAt = new Date();
      await otpData.save();

      console.log(`✅ [OTP SERVICE VERIFY] OTP verificado com sucesso para: ${email}`);

      // ✅ MARCA EMAIL COMO VERIFICADO
      await this.markEmailAsVerified(email, purpose);

      return {
        success: true,
        message: "Email verificado com sucesso",
      };
    } catch (error) {
      console.error(`💥 [OTP SERVICE VERIFY] Erro na verificação:`, error);
      return {
        success: false,
        message: "Erro interno na verificação do código"
      };
    }
  }

  async resendOTP(
    email: string,
    name?: string
  ): Promise<{ success: boolean; retryAfter?: number }> {
    try {
      const existingOTP = await OTPModel.findOne({
        email: email.toLowerCase().trim(),
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      const purpose = existingOTP?.purpose || "registration";

      if (existingOTP) {
        await OTPModel.findByIdAndUpdate(existingOTP._id, { verified: true });
      }

      return await this.sendOTP(email, purpose, name);
    } catch (error) {
      console.error(`❌ [OTP SERVICE] Erro ao reenviar OTP:`, error);
      throw error;
    }
  }

  async markEmailAsVerified(
    email: string, 
    purpose: string = "registration"
  ): Promise<void> {
    try {
      await VerifiedEmailModel.findOneAndUpdate(
        { 
          email: email.toLowerCase().trim(), 
          purpose 
        },
        {
          isVerified: true,
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        },
        { upsert: true, new: true }
      );
      console.log(`✅ [OTP SERVICE] Email marcado como verificado: ${email}, propósito: ${purpose}`);
    } catch (error) {
      console.error(`❌ [OTP SERVICE] Erro ao marcar email como verificado:`, error);
      throw new AppError('Erro ao marcar email como verificado', 500, 'EMAIL_VERIFICATION_ERROR');
    }
  }

  async isEmailVerified(
    email: string, 
    purpose: string = "registration"
  ): Promise<boolean> {
    try {
      const verification = await VerifiedEmailModel.findOne({
        email: email.toLowerCase().trim(),
        purpose,
        isVerified: true,
        expiresAt: { $gt: new Date() },
      });
      
      const isVerified = !!verification;
      console.log(`🔍 [OTP SERVICE] Verificação de email ${email}: ${isVerified ? 'VERIFICADO' : 'NÃO VERIFICADO'}`);
      
      return isVerified;
    } catch (error) {
      console.error(`❌ [OTP SERVICE] Erro ao verificar email:`, error);
      return false;
    }
  }

  async getOTPStatus(email: string): Promise<{
    exists: boolean;
    verified: boolean;
    attempts: number;
    expiresAt: Date | null;
    purpose?: string;
  }> {
    try {
      const otpData = await OTPModel.findOne({
        email: email.toLowerCase().trim(),
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      if (!otpData) {
        return { 
          exists: false, 
          verified: false, 
          attempts: 0, 
          expiresAt: null 
        };
      }

      return {
        exists: true,
        verified: otpData.verified,
        attempts: otpData.attempts,
        expiresAt: otpData.expiresAt,
        purpose: otpData.purpose,
      };
    } catch (error) {
      console.error(`❌ [OTP SERVICE] Erro ao buscar status OTP:`, error);
      return { 
        exists: false, 
        verified: false, 
        attempts: 0, 
        expiresAt: null 
      };
    }
  }

  async cleanupExpiredOTPs(): Promise<{ deleted: number }> {
    try {
      const result = await OTPModel.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { verified: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        ]
      });

      console.log(`🧹 [OTP SERVICE] Limpeza concluída: ${result.deletedCount || 0} OTPs removidos`);
      return { deleted: result.deletedCount || 0 };
    } catch (error) {
      console.error(`❌ [OTP SERVICE] Erro na limpeza de OTPs:`, error);
      return { deleted: 0 };
    }
  }

  async hasActiveOTP(email: string, purpose?: string): Promise<boolean> {
    try {
      const filter: any = {
        email: email.toLowerCase().trim(),
        verified: false,
        expiresAt: { $gt: new Date() },
      };

      if (purpose) {
        filter.purpose = purpose;
      }

      const activeOTP = await OTPModel.findOne(filter);
      return !!activeOTP;
    } catch (error) {
      console.error(`❌ [OTP SERVICE] Erro ao verificar OTP ativo:`, error);
      return false;
    }
  }
}