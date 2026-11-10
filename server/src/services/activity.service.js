import { prisma } from "../lib/prisma.js";

export async function logActivity({ userId, type, message }, tx = prisma) {
  return tx.activity.create({
    data: { userId, type, message },
  });
}
