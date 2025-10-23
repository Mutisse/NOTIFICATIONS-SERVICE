// NOTIFICATIONS-SERVICE/src/middleware/otp.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { OTPService } from '../services/otp/OTP.service';

const otpService = new OTPService();

export const otpRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, purpose = 'registration' } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email é obrigatório'
      });
      return;
    }

    console.log(`🔐 [OTP MIDDLEWARE] Rate limit check para: ${email}`);

    // ✅ CORREÇÃO: Usar método que EXISTE - hasActiveOTP
    const hasActiveOTP = await otpService.hasActiveOTP(email, purpose);

    if (hasActiveOTP) {
      // Se já existe OTP ativo, busca o status para dar informações mais detalhadas
      const status = await otpService.getOTPStatus(email);
      
      if (status.exists && status.expiresAt) {
        const timeLeft = status.expiresAt.getTime() - Date.now();
        const minutesLeft = Math.ceil(timeLeft / 1000 / 60);
        
        console.log(`❌ [OTP MIDDLEWARE] OTP ativo encontrado, expira em ${minutesLeft} minutos`);
        
        res.status(429).json({
          success: false,
          error: `Já existe um código ativo. Expira em ${minutesLeft} minutos. Aguarde o término ou use o código existente.`,
          retryAfter: Math.ceil(timeLeft / 1000)
        });
        return;
      }
    }

    console.log(`✅ [OTP MIDDLEWARE] Rate limit aprovado para: ${email}`);
    next();
  } catch (error) {
    console.error('❌ [OTP MIDDLEWARE] Erro no rate limit:', error);
    next(error);
  }
};

export const otpVerificationLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otpCode, code, purpose = 'registration' } = req.body;

    // ✅ CORREÇÃO: Aceitar tanto 'otpCode' quanto 'code'
    const finalOtpCode = otpCode || code;

    if (!email || !finalOtpCode) {
      res.status(400).json({
        success: false,
        error: 'Email e código OTP são obrigatórios'
      });
      return;
    }

    console.log(`🔐 [OTP MIDDLEWARE] Verification limit check para: ${email}`);

    // ✅ CORREÇÃO: Usar método que EXISTE - getOTPStatus
    const status = await otpService.getOTPStatus(email);

    console.log(`🔐 [OTP MIDDLEWARE] Status do OTP:`, {
      exists: status.exists,
      verified: status.verified,
      attempts: status.attempts,
      expiresAt: status.expiresAt
    });

    if (!status.exists) {
      console.log(`❌ [OTP MIDDLEWARE] OTP não encontrado para: ${email}`);
      res.status(400).json({
        success: false,
        error: 'Código OTP não encontrado ou expirado. Solicite um novo código.'
      });
      return;
    }

    if (status.verified) {
      console.log(`❌ [OTP MIDDLEWARE] OTP já verificado para: ${email}`);
      res.status(400).json({
        success: false,
        error: 'Código OTP já foi utilizado. Solicite um novo código.'
      });
      return;
    }

    if (status.attempts >= 5) {
      console.log(`❌ [OTP MIDDLEWARE] Tentativas excedidas para: ${email}`);
      res.status(400).json({
        success: false,
        error: 'Número máximo de tentativas excedido. Solicite um novo código.'
      });
      return;
    }

    // ✅ Verifica se o código expirou
    if (status.expiresAt && status.expiresAt < new Date()) {
      console.log(`❌ [OTP MIDDLEWARE] OTP expirado para: ${email}`);
      res.status(400).json({
        success: false,
        error: 'Código OTP expirado. Solicite um novo código.'
      });
      return;
    }

    console.log(`✅ [OTP MIDDLEWARE] Verification limit aprovado para: ${email}`);
    next();
  } catch (error) {
    console.error('❌ [OTP MIDDLEWARE] Erro no verification limit:', error);
    next(error);
  }
};

export const otpValidation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otpCode, code, purpose = 'registration' } = req.body;

    // ✅ CORREÇÃO: Aceitar tanto 'otpCode' quanto 'code'
    const finalOtpCode = otpCode || code;

    console.log(`🔐 [OTP MIDDLEWARE] Validação para: ${email}`);

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email é obrigatório'
      });
      return;
    }

    // Validação básica do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Formato de email inválido'
      });
      return;
    }

    // Para verificação, valida o código também
    if (finalOtpCode && !/^\d{6}$/.test(finalOtpCode)) {
      res.status(400).json({
        success: false,
        error: 'Código deve ter exatamente 6 dígitos'
      });
      return;
    }

    console.log(`✅ [OTP MIDDLEWARE] Validação aprovada para: ${email}`);
    next();
  } catch (error) {
    console.error('❌ [OTP MIDDLEWARE] Erro na validação:', error);
    next(error);
  }
};