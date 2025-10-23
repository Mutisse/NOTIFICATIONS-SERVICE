export enum NotificationType {
  OTP = "otp",
  WELCOME = "welcome",
  REMINDER = "reminder",
  SECURITY_ALERT = "security_alert",
  APPOINTMENT_CONFIRMATION = "appointment_confirmation",
  APPOINTMENT_REMINDER = "appointment_reminder",
  PAYMENT_CONFIRMATION = "payment_confirmation",
  PASSWORD_RESET = "password_reset",
  NEW_MESSAGE = "new_message"
}

export enum NotificationChannel {
  EMAIL = "email",
  WHATSAPP = "whatsapp",
  SMS = "sms",
  PUSH = "push",
}

export enum UserRole {
  CLIENT = "client",
  EMPLOYEE = "employee",
  SALON_OWNER = "salon_owner",
  ADMIN_SYSTEM = "admin_system",
}

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface NotificationMetadata {
  ip?: string;
  userAgent?: string;
  source?: string;
  internal?: boolean;
  timestamp?: string; // ✅ ADICIONADO
  priority?: NotificationPriority; // ✅ ADICIONADO
  retryCount?: number;
  templateVersion?: string;
  campaignId?: string;
  [key: string]: any; // ✅ PERMITE PROPRIEDADES ADICIONAIS
}

export interface NotificationRequest {
  email: string;
  channel: NotificationChannel;
  type: NotificationType;
  userRole: UserRole;
  data: Record<string, any>;
  metadata?: NotificationMetadata; // ✅ AGORA INCLUI TIMESTAMP E PRIORITY
}

export interface NotificationResponse {
  success: boolean;
  notificationId: string;
  channel: string;
  message?: string;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserNotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  push: boolean;
  categories: {
    marketing: boolean;
    security: boolean;
    transactions: boolean;
    reminders: boolean;
  };
}
