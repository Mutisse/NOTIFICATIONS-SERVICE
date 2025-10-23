import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  code: string;
  purpose: string;
  attempts: number;
  verified: boolean;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      default: 'registration',
      enum: ['registration', 'password_reset', 'email_change', 'two_factor'],
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para melhor performance
OTPSchema.index({ email: 1, purpose: 1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OTPSchema.index({ createdAt: 1 });

// Middleware para limpar OTPs expirados
OTPSchema.pre('save', function (next) {
  if (this.expiresAt < new Date()) {
    this.verified = true; // Marca como expirado
  }
  next();
});

export const OTPModel = mongoose.model<IOTP>('OTP', OTPSchema);