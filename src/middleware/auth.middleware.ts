import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new AppError("Token de acesso não fornecido", 401, "MISSING_TOKEN");
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    ) as any;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error: unknown) {
    // ✅ CORREÇÃO: Verificar o tipo do error antes de acessar propriedades
    if (error instanceof Error) {
      if (error.name === "JsonWebTokenError") {
        next(new AppError("Token inválido", 401, "INVALID_TOKEN"));
      } else if (error.name === "TokenExpiredError") {
        next(new AppError("Token expirado", 401, "TOKEN_EXPIRED"));
      } else {
        next(error);
      }
    } else {
      // Se não for uma instância de Error, criar um AppError genérico
      next(new AppError("Erro de autenticação", 401, "AUTH_ERROR"));
    }
  }
};

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError("Usuário não autenticado", 401, "UNAUTHENTICATED");
    }

    if (req.user.role !== "admin_system" && req.user.role !== "salon_owner") {
      throw new AppError(
        "Acesso negado. Permissões de administrador necessárias.",
        403,
        "ACCESS_DENIED"
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
