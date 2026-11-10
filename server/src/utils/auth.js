import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

export const AUTH_COOKIE = "takecare_token";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: "7d",
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: TOKEN_TTL_MS,
    path: "/",
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    pharmacy: user.pharmacy
      ? {
          id: user.pharmacy.id,
          name: user.pharmacy.name,
          city: user.pharmacy.city,
          isActive: user.pharmacy.isActive,
          isApproved: user.pharmacy.isApproved,
        }
      : null,
  };
}
