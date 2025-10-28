// NOTIFICATIONS-SERVICE/src/models/OTP.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  email: string;
  code: string;
  purpose: string;
  attempts: number;
  verified: boolean;
  verifiedAt?: Date;
  usedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OTPSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      length: 6,
    },
    purpose: {
      type: String,
      required: true,
      default: "registration",
      enum: [
        "registration",
        "password_reset", // ✅ Mantém para compatibilidade
        "password-recovery", // ✅ ADICIONA novo valor
        "email_verification",
        "admin_verification",
        "phone_verification", // ✅ Pode adicionar outros também
      ],
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

OTPSchema.index({ email: 1, purpose: 1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OTPSchema.index({ createdAt: 1 });
OTPSchema.index({ verified: 1 });

export const OTPModel = mongoose.model<IOTP>("OTP", OTPSchema);
