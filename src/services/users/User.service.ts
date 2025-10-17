import { UserModel, IUser } from "../../models/User.model";
import { AppError } from "../../utils/AppError";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { internalClient } from "../../utils/httpClient";

export class UserService {
  private readonly SALT_ROUNDS = 12;

  async register(userData: {
    email: string;
    password: string;
    name: string;
    role?: string;
    preferences?: any;
  }): Promise<{ user: IUser; token: string }> {
    try {
      const existingUser = await UserModel.findOne({
        email: userData.email.toLowerCase().trim(),
      });

      if (existingUser) {
        throw new AppError("Usuário já existe", 409, "USER_ALREADY_EXISTS");
      }

      const hashedPassword = await bcrypt.hash(
        userData.password,
        this.SALT_ROUNDS
      );

      const user = new UserModel({
        ...userData,
        email: userData.email.toLowerCase().trim(),
        password: hashedPassword,
        role: userData.role || "client",
        status: "pending",
        isActive: true,
        isVerified: false,
        preferences: userData.preferences || {
          theme: "auto",
          notifications: {
            email: true,
            push: true,
            sms: false,
            whatsapp: false,
          },
          language: "pt",
          timezone: "America/Sao_Paulo",
        },
      });

      await user.save();

      const token = this.generateToken(user);

      try {
        await internalClient.post("/api/internal/notifications/welcome", {
          email: user.email,
          userRole: user.role,
          userData: { name: user.name, role: user.role },
        });
      } catch (notificationError: unknown) {
        console.warn(
          "Falha ao enviar notificação de boas-vindas:",
          notificationError instanceof Error
            ? notificationError.message
            : "Erro desconhecido"
        );
      }

      return { user, token };
    } catch (error) {
      throw error;
    }
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: IUser; token: string }> {
    try {
      const user = await UserModel.findOne({
        email: email.toLowerCase().trim(),
        isActive: true,
      });

      if (!user) {
        throw new AppError("Credenciais inválidas", 401, "INVALID_CREDENTIALS");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new AppError("Credenciais inválidas", 401, "INVALID_CREDENTIALS");
      }

      user.lastLogin = new Date();
      user.loginCount += 1;
      await user.save();

      const token = this.generateToken(user);

      return { user, token };
    } catch (error) {
      throw error;
    }
  }

  async getUserById(userId: string): Promise<IUser> {
    try {
      const user = await UserModel.findById(userId).select("-password");

      if (!user) {
        throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser> {
    try {
      const { password, email, ...safeUpdateData } = updateData;

      const user = await UserModel.findByIdAndUpdate(
        userId,
        { ...safeUpdateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select("-password");

      if (!user) {
        throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserPreferences(userId: string): Promise<any> {
    try {
      const user = await this.getUserById(userId);
      return user.preferences;
    } catch (error) {
      throw error;
    }
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        {
          preferences: { ...preferences, updatedAt: new Date() },
          updatedAt: new Date(),
        },
        { new: true }
      ).select("preferences");

      if (!user) {
        throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
      }

      return user.preferences;
    } catch (error) {
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await UserModel.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!user) {
        return;
      }

      const resetToken = jwt.sign(
        { userId: user._id, purpose: "password_reset" },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "1h" } as jwt.SignOptions // ✅ CORREÇÃO: type assertion
      );

      try {
        await internalClient.post("/api/internal/notifications/send", {
          email: user.email,
          channel: "email",
          type: "security",
          userRole: user.role,
          data: { resetToken, name: user.name },
          metadata: { source: "password_reset" },
        });
      } catch (notificationError: unknown) {
        throw new AppError(
          "Erro ao enviar email de recuperação",
          500,
          "NOTIFICATION_ERROR"
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret"
      ) as any;

      if (decoded.purpose !== "password_reset") {
        throw new AppError("Token inválido", 400, "INVALID_TOKEN");
      }

      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      await UserModel.findByIdAndUpdate(decoded.userId, {
        password: hashedPassword,
        updatedAt: new Date(),
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.name === "JsonWebTokenError" ||
          error.name === "TokenExpiredError")
      ) {
        throw new AppError("Token inválido ou expirado", 400, "INVALID_TOKEN");
      }
      throw error;
    }
  }

  async getAllUsers(options: {
    page: number;
    limit: number;
    role?: string;
    status?: string;
  }): Promise<{ users: IUser[]; total: number; page: number; pages: number }> {
    try {
      const { page, limit, role, status } = options;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (role) filter.role = role;
      if (status) filter.status = status;

      const [users, total] = await Promise.all([
        UserModel.find(filter)
          .select("-password")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        UserModel.countDocuments(filter),
      ]);

      return { users, total, page, pages: Math.ceil(total / limit) };
    } catch (error) {
      throw error;
    }
  }

  async updateUserStatus(userId: string, status: string): Promise<IUser> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        { status, updatedAt: new Date() },
        { new: true }
      ).select("-password");

      if (!user) {
        throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        { isActive: false, status: "inactive", updatedAt: new Date() },
        { new: true }
      );

      if (!user) {
        throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
      }
    } catch (error) {
      throw error;
    }
  }

  private generateToken(user: IUser): string {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const secret = process.env.JWT_SECRET || "fallback-secret";

    // ✅ CORREÇÃO FINAL: Type assertion para SignOptions
    return jwt.sign(payload, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    } as jwt.SignOptions);
  }
}
