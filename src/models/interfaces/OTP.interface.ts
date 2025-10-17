export interface OTPConfig {
  length: number;
  expiresIn: number; // minutos
  maxAttempts: number;
  resendDelay: number; // segundos
}

export interface OTPResult {
  success: boolean;
  message?: string;
  retryAfter?: number;
}

export interface OTPStatus {
  exists: boolean;
  verified: boolean;
  attempts: number;
  expiresAt: Date | null;
  purpose?: string;
}

export interface OTPStatistics {
  totalSent: number;
  totalVerified: number;
  lastSent: Date | null;
  successRate: number;
}

export interface OTPValidation {
  isValid: boolean;
  retryAfter?: number;
  message?: string;
}