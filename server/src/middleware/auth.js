import { prisma } from "../lib/prisma.js";
import { verifyToken, AUTH_COOKIE } from "../utils/auth.js";
import { forbidden, unauthorized } from "../utils/http-error.js";

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  if (req.cookies?.[AUTH_COOKIE]) {
    return req.cookies[AUTH_COOKIE];
  }
  return null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw unauthorized();
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw unauthorized("Your session has expired. Please sign in again.");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { pharmacy: true },
    });

    if (!user) {
      throw unauthorized("Your session is no longer valid. Please sign in again.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden("This area is not available for your account type"));
    }
    next();
  };
}
