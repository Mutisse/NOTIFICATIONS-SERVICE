export enum NotificationChannel {
  EMAIL = "email",
  WHATSAPP = "whatsapp",
  SMS = "sms",
  PUSH = "push",
  SYSTEM = "system",
}

export enum NotificationType {
  WELCOME = "welcome",
  OTP = "otp",
  REMINDER = "reminder",
  SECURITY = "security",
  MARKETING = "marketing",
}

export enum UserRole {
  CLIENT = "client",
  EMPLOYEE = "employee",
  ADMIN_SYSTEM = "admin_system",
  SALON_OWNER = "salon_owner",
}

export interface NotificationRequest {
  userId?: string;
  email: string;
  channel: NotificationChannel;
  type: NotificationType;
  userRole?: UserRole;
  data: Record<string, any>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    source?: string;
    internal?: boolean;
  };
}

export interface NotificationPreference {
  email: string;
  channels: {
    [key in NotificationChannel]: boolean;
  };
  globalOptIn: boolean;
  updatedAt: Date;
}

export interface NotificationHistory {
  email: string;
  notifications: Array<{
    id: string;
    channel: NotificationChannel;
    type: NotificationType;
    status: string;
    sentAt: Date;
    content: string;
  }>;
  total: number;
}

export interface NotificationStats {
  total: number;
  byChannel: Record<NotificationChannel, number>;
  byType: Record<NotificationType, number>;
  byStatus: {
    sent: number;
    failed: number;
    pending: number;
  };
  successRate: number;
}

export interface BulkNotificationRequest {
  notifications: NotificationRequest[];
  options?: {
    delay?: number;
    priority?: "low" | "normal" | "high";
  };
}
