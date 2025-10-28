// NOTIFICATIONS-SERVICE/src/middleware/otp.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { OTPService } from '../services/otp/OTP.service';
import { AppError } from '../utils/AppError';

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

    const rateLimitCheck = await otpService.checkRateLimitForMiddleware(email, purpose);

    if (!rateLimitCheck.allowed) {
      console.log(`🚫 [OTP MIDDLEWARE] Rate limit excedido para: ${email}`);
      res.status(429).json({
        success: false,
        error: rateLimitCheck.message || 'Limite de tentativas excedido',
        retryAfter: rateLimitCheck.retryAfter
      });
      return;
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
    const { email, otpCode, code, purpose = 'password-recovery' } = req.body;
    const finalOtpCode = otpCode || code;

    if (!email || !finalOtpCode) {
      res.status(400).json({
        success: false,
        error: 'Email e código OTP são obrigatórios'
      });
      return;
    }

    console.log(`🔐 [OTP MIDDLEWARE] Verification limit check para: ${email}, propósito: ${purpose}`);

    // ✅ CORREÇÃO: Buscar OTP considerando verificados também
    const status = await otpService.getOTPStatusForMiddleware(email);

    console.log(`🔐 [OTP MIDDLEWARE] Status do OTP:`, status);

    // ✅ CORREÇÃO: PERMITIR OTPs VERIFICADOS para password-recovery
    if (purpose === 'password-recovery' && status.exists && status.verified) {
      console.log(`✅ [OTP MIDDLEWARE] OTP já verificado - PERMITINDO para reset password: ${email}`);
      return next();
    }

    if (!status.exists) {
      console.log(`❌ [OTP MIDDLEWARE] OTP não encontrado para: ${email}`);
      res.status(400).json({
        success: false,
        error: 'Código OTP não encontrado ou expirado. Solicite um novo código.'
      });
      return;
    }

    // ✅ CORREÇÃO: Só verificar se já foi verificado para outros propósitos
    if (purpose !== 'password-recovery' && status.verified) {
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