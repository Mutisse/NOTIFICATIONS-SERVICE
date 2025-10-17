import { Schema, model, Document } from "mongoose";

export enum UserMainRole {
  CLIENT = "client",
  EMPLOYEE = "employee", 
  ADMINSYSTEM = "admin_system",
}

export enum EmployeeSubRole {
  SALON_OWNER = "salon_owner",
  MANAGER = "manager",
  STAFF = "staff",
  RECEPTIONIST = "receptionist",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive", 
  SUSPENDED = "suspended",
  PENDING = "pending",
}

export type Role = UserMainRole;

export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  language: string;
  timezone: string;
  updatedAt: Date;
}

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  name: string;
  role: UserMainRole;
  status: UserStatus;
  isActive: boolean;
  isVerified: boolean;
  preferences: UserPreferences;
  lastLogin?: Date;
  lastActivity?: Date;
  loginCount: number;
  failedLoginAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { 
      type: String, 
      required: true 
    },
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    role: { 
      type: String, 
      required: true,
      enum: Object.values(UserMainRole),
      default: UserMainRole.CLIENT
    },
    status: { 
      type: String, 
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
    preferences: {
      theme: { 
        type: String, 
        enum: ["light", "dark", "auto"],
        default: "auto"
      },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false }
      },
      language: { 
        type: String, 
        default: "pt" 
      },
      timezone: { 
        type: String, 
        default: "America/Sao_Paulo" 
      },
      updatedAt: { 
        type: Date, 
        default: Date.now 
      }
    },
    lastLogin: { 
      type: Date 
    },
    lastActivity: { 
      type: Date 
    },
    loginCount: { 
      type: Number, 
      default: 0 
    },
    failedLoginAttempts: { 
      type: Number, 
      default: 0 
    },
  },
  { 
    timestamps: true 
  }
);

// Índices
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: 1 });

export const UserModel = model<IUser>("User", UserSchema);