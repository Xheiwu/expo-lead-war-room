import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SALES" | "FOLLOWER";
  salespersonId?: string | null;
};

export function toAuthRole(role: string): AuthUser["role"] {
  if (role === "ADMIN" || role === "SALES" || role === "FOLLOWER") return role;
  return "FOLLOWER";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";

export function signUser(user: AuthUser) {
  return jwt.sign(user, jwtSecret, { expiresIn: "8h" });
}

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ message: "请先登录" });

  try {
    const payload = jwt.verify(token, jwtSecret) as AuthUser;
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { salesperson: true }
    });
    if (!user) return res.status(401).json({ message: "账号不存在" });

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: toAuthRole(user.role),
      salespersonId: user.salesperson?.id ?? null
    };
    next();
  } catch {
    return res.status(401).json({ message: "登录已过期" });
  }
}

export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "没有操作权限" });
    }
    next();
  };
}
