// src/models/OTP.model.ts
import { Schema, model, Document } from "mongoose";

export interface IOTP extends Document {
  email: string;
  code: string;
  purpose:
    | "registration"
    | "login"
    | "password_reset"
    | "email_change"
    | "security";
  attempts: number;
  verified: boolean;
  usedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OTPSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: [
        "registration",
        "login",
        "password_reset",
        "email_change",
        "security",
      ],
      default: "registration",
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para performance
OTPSchema.index({ email: 1, purpose: 1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
OTPSchema.index({ createdAt: 1 });

export const OTPModel = model<IOTP>("OTP", OTPSchema);
