import { OTPModel } from "../../models/OTP.model";
import { VerifiedEmailModel } from "../../models/VerifiedEmail.model";
import { AppError } from "../../utils/AppError";

// Interfaces para os métodos novos
interface OTPValidationResult {
  isValid: boolean;
  retryAfter?: number;
  message?: string;
}

export class OTPService {
  private readonly OTP_CONFIG = {
    LENGTH: 6,
    EXPIRES_IN: 10, // 10 minutos
    MAX_ATTEMPTS: 5,
    RESEND_DELAY: 60, // 60 segundos
  };

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

      // ✅ CORREÇÃO: PROCESSAR NOTIFICAÇÃO INTERNAMENTE (SEM CHAMADA HTTP)
      try {
        console.log(`📧 [OTP SERVICE] Simulando envio de email para: ${email}`);
        console.log(`📝 [OTP SERVICE] Assunto: Seu Código de Verificação - ${purpose}`);
        console.log(`📄 [OTP SERVICE] Mensagem: Olá ${name || 'usuário'}, seu código OTP é: ${otpCode}. Expira em ${this.OTP_CONFIG.EXPIRES_IN} minutos.`);
        
        // ✅ SIMULAÇÃO DE ENVIO BEM-SUCEDIDO
        const notificationSuccess = true;

        if (!notificationSuccess) {
          await OTPModel.findByIdAndDelete(otpData._id);
          throw new AppError(
            "Erro ao enviar notificação de verificação",
            500,
            "NOTIFICATION_SEND_ERROR"
          );
        }

        console.log(`✅ [OTP SERVICE] Notificação simulada com sucesso para: ${email}`);
        
        return { 
          success: true,
          debugOtp: otpCode // ⚠️ Apenas para testes - remover em produção
        };

      } catch (notificationError) {
        await OTPModel.findByIdAndDelete(otpData._id);
        console.error(`❌ [OTP SERVICE] Erro na notificação:`, notificationError);
        throw new AppError(
          "Serviço de notificação indisponível",
          500,
          "NOTIFICATION_SERVICE_UNAVAILABLE"
        );
      }

    } catch (error) {
      console.error(`❌ [OTP SERVICE] Erro geral no sendOTP:`, error);
      throw error;
    }
  }

  async verifyOTP(
    email: string,
    code: string,
    purpose?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`✅ [OTP SERVICE] Verificando OTP: ${code} para ${email}`);
      
      const otpData = await OTPModel.findOne({
        email: email.toLowerCase().trim(),
        purpose: purpose || "registration",
        expiresAt: { $gt: new Date() },
      });

      if (!otpData) {
        console.log(`❌ [OTP SERVICE] OTP não encontrado/expirado para: ${email}`);
        return {
          success: false,
          message: "Código OTP não encontrado ou expirado",
        };
      }

      if (otpData.verified) {
        console.log(`❌ [OTP SERVICE] OTP já utilizado para: ${email}`);
        return {
          success: false,
          message: "Código OTP já foi utilizado. Solicite um novo código.",
        };
      }

      if (otpData.attempts >= this.OTP_CONFIG.MAX_ATTEMPTS) {
        await OTPModel.findByIdAndUpdate(otpData._id, { verified: true });
        console.log(`❌ [OTP SERVICE] Tentativas excedidas para: ${email}`);
        return {
          success: false,
          message: "Número máximo de tentativas excedido. Solicite um novo código.",
        };
      }

      if (otpData.code !== code) {
        otpData.attempts += 1;
        await otpData.save();

        const remainingAttempts = this.OTP_CONFIG.MAX_ATTEMPTS - otpData.attempts;
        console.log(`❌ [OTP SERVICE] OTP incorreto para: ${email}. Tentativas: ${otpData.attempts}`);
        
        return {
          success: false,
          message: `Código OTP inválido. ${remainingAttempts} tentativa(s) restante(s).`,
        };
      }

      // ✅ MARCA OTP COMO VERIFICADO
      otpData.verified = true;
      otpData.usedAt = new Date();
      await otpData.save();

      console.log(`✅ [OTP SERVICE] OTP verificado com sucesso para: ${email}`);

      // ✅ MARCA EMAIL COMO VERIFICADO NO SISTEMA
      const verifiedPurpose = (purpose || 'registration') as "registration" | "password_reset" | "email_change";
      await this.markEmailAsVerified(email, verifiedPurpose);

      return {
        success: true,
        message: "Email verificado com sucesso",
      };
    } catch (error) {
      console.error(`❌ [OTP SERVICE] Erro na verificação:`, error);
      throw error;
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
      throw error;
    }
  }

  // ✅ MÉTODO PARA USAR SEU VerifiedEmailModel
  async markEmailAsVerified(email: string, purpose: "registration" | "password_reset" | "email_change" = 'registration'): Promise<void> {
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
    } catch (error) {
      throw new AppError('Erro ao marcar email como verificado', 500, 'EMAIL_VERIFICATION_ERROR');
    }
  }

  async isEmailVerified(email: string, purpose: "registration" | "password_reset" | "email_change" = 'registration'): Promise<boolean> {
    try {
      const verification = await VerifiedEmailModel.findOne({
        email: email.toLowerCase().trim(),
        purpose,
        isVerified: true,
        expiresAt: { $gt: new Date() },
      });
      
      return !!verification;
    } catch (error) {
      return false;
    }
  }

  async invalidateEmailVerification(email: string, purpose: "registration" | "password_reset" | "email_change" = 'registration'): Promise<void> {
    try {
      await VerifiedEmailModel.findOneAndUpdate(
        { email: email.toLowerCase().trim(), purpose },
        { isVerified: false, verifiedAt: null }
      );
    } catch (error) {
      throw new AppError('Erro ao invalidar verificação de email', 500, 'INVALIDATE_VERIFICATION_ERROR');
    }
  }

  async getOTPStatus(email: string): Promise<{
    exists: boolean;
    verified: boolean;
    attempts: number;
    expiresAt: Date | null;
    purpose?: string;
  }> {
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
  }

  async invalidateOTP(email: string, purpose?: string): Promise<void> {
    const filter: any = { 
      email: email.toLowerCase().trim(), 
      verified: false 
    };
    
    if (purpose) {
      filter.purpose = purpose;
    }
    
    await OTPModel.updateMany(filter, { verified: true });
  }

  async cleanupExpiredOTPs(): Promise<{ deleted: number }> {
    const result = await OTPModel.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { verified: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    });

    return { deleted: result.deletedCount || 0 };
  }

  async getOTPStatistics(email: string): Promise<{
    totalSent: number;
    totalVerified: number;
    lastSent: Date | null;
    successRate: number;
  }> {
    const totalSent = await OTPModel.countDocuments({ 
      email: email.toLowerCase().trim() 
    });
    
    const totalVerified = await OTPModel.countDocuments({
      email: email.toLowerCase().trim(),
      verified: true,
    });
    
    const lastOTP = await OTPModel.findOne({ 
      email: email.toLowerCase().trim() 
    })
      .sort({ createdAt: -1 })
      .select("createdAt");

    const successRate = totalSent > 0 ? (totalVerified / totalSent) * 100 : 0;

    return {
      totalSent,
      totalVerified,
      lastSent: lastOTP?.createdAt || null,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  async getGlobalStatistics(): Promise<{
    totalOTPs: number;
    verifiedOTPs: number;
    expiredOTPs: number;
    averageVerificationTime: number;
  }> {
    const totalOTPs = await OTPModel.countDocuments();
    const verifiedOTPs = await OTPModel.countDocuments({ verified: true });
    const expiredOTPs = await OTPModel.countDocuments({ 
      expiresAt: { $lt: new Date() } 
    });

    return {
      totalOTPs,
      verifiedOTPs,
      expiredOTPs,
      averageVerificationTime: 0
    };
  }

  // ✅ MÉTODOS NOVOS PARA O MIDDLEWARE
  async validateOTPRequest(email: string, purpose: string): Promise<OTPValidationResult> {
    try {
      // Verifica rate limit
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
            isValid: false,
            retryAfter: Math.ceil(retryAfter / 1000),
            message: `Aguarde ${Math.ceil(retryAfter / 1000)} segundos para solicitar um novo código`
          };
        }
      }

      // Verifica se já existe OTP ativo
      const activeOTP = await OTPModel.findOne({
        email: email.toLowerCase().trim(),
        purpose,
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      if (activeOTP) {
        const timeLeft = activeOTP.expiresAt.getTime() - Date.now();
        return {
          isValid: false,
          message: `Já existe um código ativo. Expira em ${Math.ceil(timeLeft / 1000 / 60)} minutos`
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        message: "Erro ao validar solicitação OTP"
      };
    }
  }

  async getOTPByEmail(email: string, purpose?: string): Promise<any> {
    const filter: any = {
      email: email.toLowerCase().trim(),
      verified: false,
      expiresAt: { $gt: new Date() },
    };

    if (purpose) {
      filter.purpose = purpose;
    }

    return await OTPModel.findOne(filter);
  }
}

// ✅ EXPORTAR INSTÂNCIA
export default new OTPService();