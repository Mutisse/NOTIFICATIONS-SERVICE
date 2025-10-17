import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const validationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body;

  // Validação de email
  if (email && !isValidEmail(email)) {
    return next(new AppError('Formato de email inválido', 400, 'INVALID_EMAIL'));
  }

  // Validação de senha
  if (password && !isValidPassword(password)) {
    return next(new AppError('Senha deve ter pelo menos 6 caracteres', 400, 'INVALID_PASSWORD'));
  }

  // Validação de nome
  if (name && !isValidName(name)) {
    return next(new AppError('Nome deve ter entre 2 e 50 caracteres', 400, 'INVALID_NAME'));
  }

  next();
};

// Funções auxiliares de validação
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

const isValidName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 50;
};

export const validateNotificationRequest = (req: Request, res: Response, next: NextFunction) => {
  const { email, channel, type } = req.body;

  if (!email || !channel || !type) {
    return next(new AppError('Email, channel e type são obrigatórios', 400, 'MISSING_FIELDS'));
  }

  if (!isValidEmail(email)) {
    return next(new AppError('Formato de email inválido', 400, 'INVALID_EMAIL'));
  }

  const validChannels = ['email', 'whatsapp', 'sms', 'push', 'system'];
  if (!validChannels.includes(channel)) {
    return next(new AppError(`Canal inválido. Válidos: ${validChannels.join(', ')}`, 400, 'INVALID_CHANNEL'));
  }

  const validTypes = ['welcome', 'otp', 'reminder', 'security', 'marketing'];
  if (!validTypes.includes(type)) {
    return next(new AppError(`Tipo inválido. Válidos: ${validTypes.join(', ')}`, 400, 'INVALID_TYPE'));
  }

  next();
};