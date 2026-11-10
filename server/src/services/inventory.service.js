import { prisma } from "../lib/prisma.js";
import { logActivity } from "./activity.service.js";
import { notifyLowStockForUser } from "./notification.service.js";
import { serializeMedicine } from "../utils/stock.js";
import { badRequest, notFound } from "../utils/http-error.js";

export async function getOwnedMedicine(medicineId, userId) {
  const medicine = await prisma.medicine.findFirst({
    where: { id: medicineId, userId },
    include: { familyMember: true },
  });
  if (!medicine) throw notFound("Medicine not found");
  return medicine;
}

export async function recordManualTransaction({ userId, medicineId, type, quantity, note }) {
  if (!["PURCHASE", "CORRECTION"].includes(type)) {
    throw badRequest("Transaction type must be PURCHASE or CORRECTION");
  }

  const medicine = await getOwnedMedicine(medicineId, userId);
  if (!medicine.isActive) {
    throw badRequest("This medicine is inactive. Reactivate it before updating stock.");
  }

  const delta = type === "PURCHASE" ? Math.abs(quantity) : quantity;
  if (type === "PURCHASE" && delta <= 0) {
    throw badRequest("Purchase quantity must be greater than zero");
  }
  if (type === "CORRECTION" && delta === 0) {
    throw badRequest("Correction amount cannot be zero");
  }

  const previousStock = medicine.confirmedStock;
  const newStock = Math.max(0, previousStock + delta);
  const now = new Date();
  const lowAfter = newStock <= medicine.reorderThreshold;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.medicine.update({
      where: { id: medicine.id },
      data: {
        confirmedStock: newStock,
        lastConfirmedAt: now,
        lowStockNotified: lowAfter ? medicine.lowStockNotified : false,
      },
    });

    const transaction = await tx.inventoryTransaction.create({
      data: {
        medicineId: medicine.id,
        type,
        quantityChange: newStock - previousStock,
        previousStock,
        newStock,
        note: note || null,
        createdAt: now,
      },
    });

    await logActivity(
      {
        userId,
        type: type === "PURCHASE" ? "PURCHASE" : "CORRECTION",
        message:
          type === "PURCHASE"
            ? `Recorded a purchase of ${delta} ${medicine.unitLabel}(s) of ${medicine.name}.`
            : `Corrected ${medicine.name} stock from ${previousStock} to ${newStock}.`,
      },
      tx,
    );

    return { updated, transaction };
  });

  await notifyLowStockForUser(userId);

  return {
    medicine: serializeMedicine(result.updated),
    transaction: result.transaction,
  };
}
