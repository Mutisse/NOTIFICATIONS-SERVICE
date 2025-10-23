import mongoose, { Document, Schema } from 'mongoose';

export interface IVerifiedEmail extends Document {
  email: string;
  purpose: string;
  isVerified: boolean;
  verifiedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerifiedEmailSchema = new Schema<IVerifiedEmail>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ['registration', 'password_reset', 'email_change'],
      default: 'registration',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
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

// Índices para melhor performance
VerifiedEmailSchema.index({ email: 1, purpose: 1 });
VerifiedEmailSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
VerifiedEmailSchema.index({ isVerified: 1 });

export const VerifiedEmailModel = mongoose.model<IVerifiedEmail>(
  'VerifiedEmail', 
  VerifiedEmailSchema
);