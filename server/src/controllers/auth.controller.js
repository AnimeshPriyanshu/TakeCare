import { prisma } from "../lib/prisma.js";
import {
  hashPassword,
  publicUser,
  setAuthCookie,
  clearAuthCookie,
  signToken,
  verifyPassword,
} from "../utils/auth.js";
import { conflict, unauthorized } from "../utils/http-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, pharmacy } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw conflict("An account with this email already exists");
  }

  if (role === "PHARMACIST") {
    const licenseExists = await prisma.pharmacy.findUnique({
      where: { licenseNumber: pharmacy.licenseNumber },
    });
    if (licenseExists) {
      throw conflict("A pharmacy with this license number already exists");
    }
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email, passwordHash, role },
    });

    if (role === "PHARMACIST") {
      await tx.pharmacy.create({
        data: {
          ownerId: created.id,
          name: pharmacy.name,
          address: pharmacy.address,
          city: pharmacy.city,
          pincode: pharmacy.pincode,
          phone: pharmacy.phone,
          licenseNumber: pharmacy.licenseNumber,
          description: pharmacy.description || null,
          isApproved: false,
          isActive: true,
        },
      });
    }

    return tx.user.findUnique({
      where: { id: created.id },
      include: { pharmacy: true },
    });
  });

  setAuthCookie(res, signToken(user));
  res.status(201).json({ user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { pharmacy: true },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw unauthorized("Incorrect email or password");
  }

  setAuthCookie(res, signToken(user));
  res.json({ user: publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Signed out" });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});
