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
      return; // ✅ CORREÇÃO: Adicionar return
    }

    const validation = await otpService.validateOTPRequest(email, purpose);

    if (!validation.isValid) {
      res.status(429).json({
        success: false,
        error: validation.message,
        retryAfter: validation.retryAfter
      });
      return; // ✅ CORREÇÃO: Adicionar return
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const otpVerificationLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otpCode, purpose = 'registration' } = req.body;

    if (!email || !otpCode) {
      res.status(400).json({
        success: false,
        error: 'Email e código OTP são obrigatórios'
      });
      return; // ✅ CORREÇÃO: Adicionar return
    }

    // Verifica se existe OTP ativo
    const activeOTP = await otpService.getOTPByEmail(email, purpose);

    if (!activeOTP) {
      res.status(400).json({
        success: false,
        error: 'Código OTP não encontrado ou expirado'
      });
      return; // ✅ CORREÇÃO: Adicionar return
    }

    if (activeOTP.attempts >= 5) {
      res.status(400).json({
        success: false,
        error: 'Número máximo de tentativas excedido. Solicite um novo código.'
      });
      return; // ✅ CORREÇÃO: Adicionar return
    }

    next();
  } catch (error) {
    next(error);
  }
};