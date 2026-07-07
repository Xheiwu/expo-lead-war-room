import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from "../db.js";
import { signUser, toAuthRole } from "../auth.js";
import { asyncHandler, AppError } from "../utils/errors.js";
import { authRequired } from "../auth.js";
import { loginSchema } from "../schemas.js";

export const authRoutes = Router();

authRoutes.post("/login", asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { salesperson: true } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, "邮箱或密码错误", "INVALID_CREDENTIALS");
  }
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: toAuthRole(user.role),
    salespersonId: user.salesperson?.id ?? null
  };
  res.json({ token: signUser(safeUser), user: safeUser });
}));

authRoutes.get("/me", authRequired, (req, res) => res.json({ user: req.user }));
