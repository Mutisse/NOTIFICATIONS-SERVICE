import { Document, Schema, model } from "mongoose";
import {
  NotificationChannel,
  NotificationType,
  UserRole,
  NotificationPriority,
  NotificationMetadata,
} from "../models/interfaces/Notification.interface";

export interface INotification extends Document {
  email: string;
  channel: NotificationChannel;
  type: NotificationType;
  userRole: UserRole;
  data: any;
  metadata?: NotificationMetadata;
  content: string;
  subject?: string;
  status: "pending" | "sent" | "failed" | "read";
  sentAt?: Date;
  read: boolean; // ✅ ADICIONE ESTA LINHA
  readAt?: Date; // ✅ ADICIONE ESTA LINHA
  error?: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    userRole: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    content: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "read"],
      default: "pending",
    },
    sentAt: {
      type: Date,
    },
    read: { // ✅ ADICIONE ESTE CAMPO
      type: Boolean,
      default: false,
    },
    readAt: { // ✅ ADICIONE ESTE CAMPO
      type: Date,
    },
    error: {
      type: String,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para melhor performance
NotificationSchema.index({ email: 1, createdAt: -1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ channel: 1 });
NotificationSchema.index({ type: 1 });

export const NotificationModel = model<INotification>(
  "Notification",
  NotificationSchema
);