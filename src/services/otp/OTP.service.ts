// NOTIFICATIONS-SERVICE/src/services/otp/OTP.service.ts
import { OTPModel } from "../../models/OTP.model";
import { VerifiedEmailModel } from "../../models/VerifiedEmail.model";
import { NotificationService } from "../notifications/Notification.service";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../models/interfaces/Notification.interface";

interface OTPResult {
  success: boolean;
  message: string;
  code?: string;
  retryAfter?: number;
  expiresAt?: Date;
  attemptsRemaining?: number;
}

interface OTPStatus {
  hasActiveOTP: boolean;
  expiresAt?: Date;
  purpose: string;
  attempts: number;
  verified: boolean;
}

interface OTPStatistics {
  total: number;
  verified: number;
  expired: number;
  failed: number;
  verificationRate: number;
}

export class OTPService {
  private readonly OTP_CONFIG = {
    LENGTH: 6,
    EXPIRES_IN: 10, // minutos
    MAX_ATTEMPTS: 5,
    RESEND_DELAY: 60, // segundos
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

  // ✅ MÉTODO PRINCIPAL - Enviar OTP
  async sendOTP(
    email: string,
    purpose: string = "registration",
    name?: string
  ): Promise<{ success: boolean; retryAfter?: number }> {
    try {
      console.log(
        `📤 [OTP SERVICE] Processando OTP para: ${email}, propósito: ${purpose}`
      );

      const cleanEmail = email.toLowerCase().trim();

      // Verificar rate limit
      const recentOTP = await OTPModel.findOne({
        email: cleanEmail,
        purpose,
        createdAt: {
          $gte: new Date(Date.now() - this.OTP_CONFIG.RESEND_DELAY * 1000),
        },
      });

      if (recentOTP) {
        const timeElapsed = Date.now() - recentOTP.createdAt.getTime();
        const retryAfter = Math.ceil(
          (this.OTP_CONFIG.RESEND_DELAY * 1000 - timeElapsed) / 1000
        );
        if (retryAfter > 0) {
          return { success: false, retryAfter };
        }
      }

      // Gerar novo OTP
      const otpCode = this.generateOTP();
      const expiresAt = new Date(
        Date.now() + this.OTP_CONFIG.EXPIRES_IN * 60 * 1000
      );

      // Criar ou atualizar OTP
      const otpData = await OTPModel.findOneAndUpdate(
        {
          email: cleanEmail,
          purpose,
          verified: false,
        },
        {
          email: cleanEmail,
          code: otpCode,
          purpose,
          attempts: 0,
          verified: false,
          expiresAt,
          createdAt: new Date(),
          verifiedAt: null,
          usedAt: null,
        },
        {
          upsert: true,
          new: true,
        }
      );

      console.log(`✅ [OTP SERVICE] OTP gerado: ${otpCode} para ${email}`);

      // ENVIO DE EMAIL
      try {
        let userRole: UserRole = UserRole.CLIENT;
        if (purpose.includes("admin")) userRole = UserRole.ADMIN_SYSTEM;
        if (purpose.includes("employee")) userRole = UserRole.EMPLOYEE;
        if (purpose.includes("owner")) userRole = UserRole.SALON_OWNER;

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
        return { success: true };
      } catch (notificationError: any) {
        await OTPModel.findByIdAndDelete(otpData._id);
        console.error(
          `❌ [OTP SERVICE] Erro ao enviar email:`,
          notificationError.message
        );
        throw new AppError(
          "Serviço de email indisponível",
          500,
          "EMAIL_SERVICE_UNAVAILABLE"
        );
      }
    } catch (error: any) {
      console.error(`❌ [OTP SERVICE] Erro geral:`, error.message);
      throw error;
    }
  }

  // ✅ MÉTODO PRINCIPAL - Verificar OTP (CORRIGIDO)
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
      });

      if (!email || !otpCode) {
        return {
          success: false,
          message: "Email e código OTP são obrigatórios",
        };
      }

      const cleanEmail = email.toLowerCase().trim();
      const cleanOtpCode = otpCode.toString().trim();

      if (!/^\d{6}$/.test(cleanOtpCode)) {
        return {
          success: false,
          message: "Código deve ter exatamente 6 dígitos",
        };
      }

      // Buscar OTP ativo
      const otpData = await OTPModel.findOne({
        email: cleanEmail,
        purpose: purpose,
        expiresAt: { $gt: new Date() },
      });

      if (!otpData) {
        return {
          success: false,
          message:
            "Código OTP não encontrado ou expirado. Solicite um novo código.",
        };
      }

      // ✅ CORREÇÃO: PERMITIR RE-VERIFICAÇÃO para password-recovery
      if (otpData.verified && purpose !== "password-recovery") {
        return {
          success: false,
          message: "Código OTP já foi utilizado. Solicite um novo código.",
        };
      }

      // Verificar tentativas máximas
      if (otpData.attempts >= this.OTP_CONFIG.MAX_ATTEMPTS) {
        // Marcar como usado mas manter no banco para auditoria
        otpData.verified = true;
        otpData.usedAt = new Date();
        await otpData.save();

        return {
          success: false,
          message:
            "Número máximo de tentativas excedido. Solicite um novo código.",
        };
      }

      // Verificar código
      if (otpData.code !== cleanOtpCode) {
        otpData.attempts += 1;
        await otpData.save();

        const remainingAttempts =
          this.OTP_CONFIG.MAX_ATTEMPTS - otpData.attempts;
        return {
          success: false,
          message: `Código OTP inválido. ${remainingAttempts} tentativa(s) restante(s).`,
        };
      }

      // ✅ CÓDIGO CORRETO - Marcar como verificado
      otpData.verified = true;
      otpData.verifiedAt = new Date();
      otpData.usedAt = new Date();
      await otpData.save();

      // Marcar email como verificado
      await this.markEmailAsVerified(cleanEmail, purpose);

      console.log(
        `✅ [OTP SERVICE VERIFY] OTP verificado com sucesso para: ${email}`
      );
      return { success: true, message: "Email verificado com sucesso" };
    } catch (error: any) {
      console.error(
        `💥 [OTP SERVICE VERIFY] Erro na verificação:`,
        error.message
      );
      return {
        success: false,
        message: "Erro interno na verificação do código",
      };
    }
  }

  // ✅ MÉTODO CORRIGIDO: Buscar status para middleware
  async getOTPStatusForMiddleware(email: string): Promise<{
    exists: boolean;
    verified: boolean;
    attempts: number;
    expiresAt: Date | null;
  }> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      // ✅ CORREÇÃO: Buscar OTP mais recente (verificado ou não)
      const otpRecord = await OTPModel.findOne({
        email: cleanEmail,
        expiresAt: { $gt: new Date() }, // Ainda não expirou
      }).sort({ createdAt: -1 }); // Pega o mais recente

      if (!otpRecord) {
        return { exists: false, verified: false, attempts: 0, expiresAt: null };
      }

      return {
        exists: true,
        verified: otpRecord.verified,
        attempts: otpRecord.attempts,
        expiresAt: otpRecord.expiresAt,
      };
    } catch (error: any) {
      console.error(
        `❌ [OTP SERVICE] Erro ao obter status para middleware:`,
        error.message
      );
      return { exists: false, verified: false, attempts: 0, expiresAt: null };
    }
  }

  // ✅ NOVO MÉTODO: Invalidar OTP após uso
  async invalidateOTP(
    email: string,
    purpose: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      const result = await OTPModel.findOneAndDelete({
        email: cleanEmail,
        purpose,
        verified: true,
      });

      if (result) {
        console.log(
          `✅ [OTP SERVICE] OTP invalidado para: ${email}, propósito: ${purpose}`
        );
        return { success: true, message: "OTP invalidado com sucesso" };
      } else {
        console.log(
          `⚠️ [OTP SERVICE] OTP não encontrado para invalidar: ${email}`
        );
        return { success: false, message: "OTP não encontrado" };
      }
    } catch (error: any) {
      console.error("❌ [OTP SERVICE] Erro ao invalidar OTP:", error.message);
      return { success: false, message: "Erro ao invalidar OTP" };
    }
  }

  // ✅ MÉTODO: Verificar se OTP foi verificado
  async isOTPVerified(email: string, purpose: string): Promise<boolean> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      const otpRecord = await OTPModel.findOne({
        email: cleanEmail,
        purpose,
        verified: true,
        expiresAt: { $gt: new Date() },
      });

      return !!otpRecord;
    } catch (error: any) {
      console.error("❌ [OTP SERVICE] Erro ao verificar OTP:", error.message);
      return false;
    }
  }

  // ✅ MÉTODOS PARA ROTAS (mantidos iguais)
  async hasActiveOTP(email: string, purpose?: string): Promise<boolean> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      const otpRecord = await OTPModel.findOne({
        email: cleanEmail,
        purpose: purpose || "registration",
        expiresAt: { $gt: new Date() },
        verified: false,
      });
      return !!otpRecord;
    } catch (error: any) {
      console.error(
        `❌ [OTP SERVICE] Erro ao verificar OTP ativo:`,
        error.message
      );
      return false;
    }
  }

  async getOTPStatus(email: string): Promise<OTPStatus> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      const activeOTP = await OTPModel.findOne({
        email: cleanEmail,
        expiresAt: { $gt: new Date() },
      });

      return {
        hasActiveOTP: !!activeOTP,
        expiresAt: activeOTP?.expiresAt,
        purpose: activeOTP?.purpose || "none",
        attempts: activeOTP?.attempts || 0,
        verified: activeOTP?.verified || false,
      };
    } catch (error: any) {
      console.error(
        `❌ [OTP SERVICE] Erro ao obter status OTP:`,
        error.message
      );
      throw error;
    }
  }

  async getStatistics(email: string): Promise<OTPStatistics> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      const userOTPs = await OTPModel.find({ email: cleanEmail });
      const total = userOTPs.length;
      const verified = userOTPs.filter((otp) => otp.verified).length;
      const expired = userOTPs.filter(
        (otp) => otp.expiresAt < new Date() && !otp.verified
      ).length;
      const failed = userOTPs.filter(
        (otp) => otp.attempts >= this.OTP_CONFIG.MAX_ATTEMPTS && !otp.verified
      ).length;

      const verificationRate = total > 0 ? (verified / total) * 100 : 0;

      return {
        total,
        verified,
        expired,
        failed,
        verificationRate: Math.round(verificationRate * 100) / 100,
      };
    } catch (error: any) {
      console.error(
        `❌ [OTP SERVICE] Erro ao obter estatísticas:`,
        error.message
      );
      throw error;
    }
  }

  async globalStats(): Promise<any> {
    try {
      const totalOTPs = await OTPModel.countDocuments();
      const verifiedOTPs = await OTPModel.countDocuments({ verified: true });
      const activeOTPs = await OTPModel.countDocuments({
        expiresAt: { $gt: new Date() },
        verified: false,
      });
      const expiredOTPs = await OTPModel.countDocuments({
        expiresAt: { $lte: new Date() },
        verified: false,
      });

      const purposeStats = await OTPModel.aggregate([
        {
          $group: {
            _id: "$purpose",
            total: { $sum: 1 },
            verified: { $sum: { $cond: ["$verified", 1, 0] } },
            active: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$expiresAt", new Date()] },
                      { $eq: ["$verified", false] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      return {
        total: totalOTPs,
        verified: verifiedOTPs,
        active: activeOTPs,
        expired: expiredOTPs,
        verificationRate: totalOTPs > 0 ? (verifiedOTPs / totalOTPs) * 100 : 0,
        purposes: purposeStats,
      };
    } catch (error: any) {
      console.error(
        `❌ [OTP SERVICE] Erro ao obter estatísticas globais:`,
        error.message
      );
      throw error;
    }
  }

  async cleanupExpiredOTPs(
    cutoffDate: Date
  ): Promise<{ deletedCount: number }> {
    try {
      const result = await OTPModel.deleteMany({
        $or: [
          { expiresAt: { $lt: cutoffDate } },
          { verified: true, createdAt: { $lt: cutoffDate } },
        ],
      });

      console.log(
        `🧹 [OTP SERVICE] Limpeza concluída: ${result.deletedCount} OTPs removidos`
      );
      return { deletedCount: result.deletedCount };
    } catch (error: any) {
      console.error(`❌ [OTP SERVICE] Erro na limpeza:`, error.message);
      throw error;
    }
  }

  // ✅ MÉTODOS AUXILIARES
  async resendOTP(
    email: string,
    name?: string
  ): Promise<{ success: boolean; retryAfter?: number }> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      // 1. BUSCAR OTP ATIVO MAIS RECENTE
      const existingOTP = await OTPModel.findOne({
        email: cleanEmail,
        verified: false, // Só considerar não verificados
        expiresAt: { $gt: new Date() }, // Só considerar não expirados
      }).sort({ createdAt: -1 }); // Pegar o mais recente

      // 2. SE EXISTIR OTP ATIVO, VERIFICAR SE PODE REENVIAR
      if (existingOTP) {
        const timeSinceLastOTP = Date.now() - existingOTP.createdAt.getTime();
        const timeLeft = Math.ceil((60000 - timeSinceLastOTP) / 1000); // 60 segundos

        // 3. SE AINDA NÃO PASSOU 60 SEGUNDOS, BLOQUEAR
        if (timeLeft > 0) {
          return {
            success: false,
            retryAfter: timeLeft,
          };
        }

        // 4. SE PASSOU 60 SEGUNDOS, MANTER O MESMO CÓDIGO E REENVIAR
        console.log(
          `🔄 [OTP SERVICE] Reenviando OTP existente: ${existingOTP.code} para ${email}`
        );

        // REENVIAR O MESMO CÓDIGO (não gerar novo)
        const emailSent = await this.notificationService.sendOTP(
          email,
          existingOTP.code, // ⭐ USAR O CÓDIGO EXISTENTE
          name,
          UserRole.CLIENT
        );

        if (emailSent) {
          // Atualizar timestamp do OTP existente
          existingOTP.createdAt = new Date();
          await existingOTP.save();

          console.log(
            `✅ [OTP SERVICE] OTP reenviado com sucesso: ${existingOTP.code} para ${email}`
          );
          return { success: true };
        }
      }

      // 5. SE NÃO TEM OTP ATIVO, CRIAR NOVO
      console.log(`📤 [OTP SERVICE] Criando novo OTP para: ${email}`);
      return await this.sendOTP(email, "registration", name);
    } catch (error: any) {
      console.error(`❌ [OTP SERVICE] Erro ao reenviar OTP:`, error.message);
      throw error;
    }
  }

  async markEmailAsVerified(
    email: string,
    purpose: string = "registration"
  ): Promise<void> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      await VerifiedEmailModel.findOneAndUpdate(
        { email: cleanEmail, purpose },
        {
          isVerified: true,
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        },
        { upsert: true, new: true }
      );
      console.log(
        `✅ [OTP SERVICE] Email marcado como verificado: ${email}, propósito: ${purpose}`
      );
    } catch (error: any) {
      console.error(
        `❌ [OTP SERVICE] Erro ao marcar email como verificado:`,
        error.message
      );
      throw new AppError(
        "Erro ao marcar email como verificado",
        500,
        "EMAIL_VERIFICATION_ERROR"
      );
    }
  }

  async isEmailVerified(
    email: string,
    purpose: string = "registration"
  ): Promise<boolean> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      const verification = await VerifiedEmailModel.findOne({
        email: cleanEmail,
        purpose,
        isVerified: true,
        expiresAt: { $gt: new Date() },
      });
      return !!verification;
    } catch (error: any) {
      console.error(`❌ [OTP SERVICE] Erro ao verificar email:`, error.message);
      return false;
    }
  }

  // ✅ MÉTODOS PARA O OTPCONTROLLER
  async getStatus(email: string): Promise<any> {
    return this.getOTPStatus(email);
  }

  async checkVerification(
    email: string,
    purpose: string = "registration"
  ): Promise<{
    email: string;
    purpose: string;
    isVerified: boolean;
    verifiedAt?: Date;
  }> {
    const isVerified = await this.isEmailVerified(email, purpose);
    const verification = await VerifiedEmailModel.findOne({
      email: email.toLowerCase().trim(),
      purpose,
      isVerified: true,
    });

    return {
      email,
      purpose,
      isVerified,
      verifiedAt: verification?.verifiedAt,
    };
  }

  async checkActiveOTP(
    email: string,
    purpose?: string
  ): Promise<{
    email: string;
    purpose: string;
    hasActiveOTP: boolean;
    message: string;
  }> {
    const hasActiveOTP = await this.hasActiveOTP(email, purpose);

    return {
      email,
      purpose: purpose || "registration",
      hasActiveOTP,
      message: hasActiveOTP
        ? "Existe um OTP ativo para este email"
        : "Nenhum OTP ativo encontrado",
    };
  }

  async cleanup(olderThan: number = 24): Promise<{
    deletedCount: number;
    cutoffDate: Date;
    olderThan: string;
  }> {
    const cutoffDate = new Date(Date.now() - olderThan * 60 * 60 * 1000);
    const result = await this.cleanupExpiredOTPs(cutoffDate);

    return {
      deletedCount: result.deletedCount,
      cutoffDate,
      olderThan: `${olderThan} horas`,
    };
  }

  async healthCheck(): Promise<{
    service: string;
    status: string;
    timestamp: string;
    data: {
      totalOTPs: number;
      activeOTPs: number;
      verificationRate: number;
      purposes: any;
    };
  }> {
    const stats = await this.globalStats();

    return {
      service: "otp-service",
      status: "healthy",
      timestamp: new Date().toISOString(),
      data: {
        totalOTPs: stats.total,
        activeOTPs: stats.active,
        verificationRate: stats.verificationRate,
        purposes: stats.purposes,
      },
    };
  }

  // ✅ MÉTODO PARA OTP VERIFICATION (compatível com interface OTPResult)
  async verifyOTPWithResult(
    email: string,
    otpCode: string,
    purpose: string = "registration"
  ): Promise<OTPResult> {
    const result = await this.verifyOTP(email, otpCode, purpose);

    return {
      success: result.success,
      message: result.message,
      code: result.success ? "OTP_VERIFIED" : "OTP_VERIFICATION_FAILED",
    };
  }

  // ✅ MÉTODO PARA SEND OTP (compatível com interface OTPResult)
  async sendOTPWithResult(
    email: string,
    purpose: string = "registration",
    name?: string
  ): Promise<OTPResult> {
    const result = await this.sendOTP(email, purpose, name);

    if (result.success) {
      return {
        success: true,
        message: "Código de verificação enviado com sucesso",
        code: "OTP_SENT",
      };
    } else {
      return {
        success: false,
        message: `Aguarde ${result.retryAfter} segundos para solicitar um novo código`,
        code: "OTP_RATE_LIMITED",
        retryAfter: result.retryAfter,
      };
    }
  }

  // ✅ MÉTODO PARA RESEND OTP (compatível com interface OTPResult)
  async resendOTPWithResult(email: string, name?: string): Promise<OTPResult> {
    const result = await this.resendOTP(email, name);

    if (result.success) {
      return {
        success: true,
        message: "Novo código de verificação enviado com sucesso",
        code: "OTP_RESENT",
      };
    } else {
      return {
        success: false,
        message: `Aguarde ${result.retryAfter} segundos para solicitar um novo código`,
        code: "OTP_RATE_LIMITED",
        retryAfter: result.retryAfter,
      };
    }
  }

  // ✅ MÉTODO PARA RATE LIMIT (compatível com middleware)
  async checkRateLimitForMiddleware(
    email: string,
    purpose: string
  ): Promise<{
    allowed: boolean;
    retryAfter?: number;
    message?: string;
  }> {
    try {
      const cleanEmail = email.toLowerCase().trim();

      const activeOTP = await OTPModel.findOne({
        email: cleanEmail,
        purpose,
        expiresAt: { $gt: new Date() },
        verified: false,
      });

      if (activeOTP) {
        const timeLeft = activeOTP.expiresAt.getTime() - Date.now();
        const minutesLeft = Math.ceil(timeLeft / 1000 / 60);
        return {
          allowed: false,
          retryAfter: Math.ceil(timeLeft / 1000),
          message: `Já existe um código ativo. Expira em ${minutesLeft} minutos.`,
        };
      }

      const recentOTPs = await OTPModel.find({
        email: cleanEmail,
        purpose,
        createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
      });

      if (recentOTPs.length >= 3) {
        const oldestOTP = recentOTPs.reduce((oldest, current) =>
          oldest.createdAt < current.createdAt ? oldest : current
        );
        const retryAfter = Math.ceil(
          (oldestOTP.createdAt.getTime() + 60000 - Date.now()) / 1000
        );
        return {
          allowed: false,
          retryAfter,
          message: "Muitas tentativas recentes. Aguarde um momento.",
        };
      }

      return { allowed: true };
    } catch (error: any) {
      console.error(
        `❌ [OTP SERVICE] Erro no rate limit check:`,
        error.message
      );
      return { allowed: true };
    }
  }
}
