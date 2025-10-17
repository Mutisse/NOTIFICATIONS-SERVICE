import { Schema, model, Document } from "mongoose";

export interface INotification extends Document {
  email: string;
  channel: string;
  type: string;
  userRole?: string;
  status: "pending" | "sent" | "failed" | "delivered";
  subject?: string;
  content: string;
  data: Record<string, any>;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    channel: {
      type: String,
      required: true,
      enum: ["email", "whatsapp", "sms", "push", "system"],
    },
    type: {
      type: String,
      required: true,
      enum: ["welcome", "otp", "reminder", "security", "marketing"],
    },
    userRole: {
      type: String,
      enum: ["client", "employee", "admin_system", "salon_owner"],
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "sent", "failed", "delivered"],
    },
    subject: String,
    content: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    lastAttemptAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    error: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Índices para performance
NotificationSchema.index({ email: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, createdAt: 1 });
NotificationSchema.index({ channel: 1, type: 1 });
NotificationSchema.index({ "metadata.source": 1 });

export const NotificationModel = model<INotification>(
  "Notification",
  NotificationSchema
);
