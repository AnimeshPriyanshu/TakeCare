import { prisma } from "../lib/prisma.js";
import { computeEstimatedStock } from "../utils/stock.js";

export async function createNotification(
  { userId, type, title, message, replenishmentRequestId = null },
  tx = prisma,
) {
  return tx.notification.create({
    data: { userId, type, title, message, replenishmentRequestId },
  });
}

export async function notifyLowStockForUser(userId, tx = prisma) {
  const medicines = await tx.medicine.findMany({
    where: { userId, isActive: true },
  });

  const now = new Date();
  const created = [];

  for (const medicine of medicines) {
    const { estimatedStock } = computeEstimatedStock(medicine, now);
    const low = estimatedStock <= medicine.reorderThreshold;

    if (low && !medicine.lowStockNotified) {
      const claimed = await tx.medicine.updateMany({
        where: { id: medicine.id, lowStockNotified: false },
        data: { lowStockNotified: true },
      });
      if (claimed.count === 1) {
        created.push(
          await createNotification(
            {
              userId,
              type: "LOW_STOCK",
              title: `${medicine.name} is running low`,
              message: `Estimated stock is ${estimatedStock} ${medicine.unitLabel}(s), at or below your reorder threshold of ${medicine.reorderThreshold}.`,
            },
            tx,
          ),
        );
      }
    } else if (!low && medicine.lowStockNotified) {
      await tx.medicine.updateMany({
        where: { id: medicine.id, lowStockNotified: true },
        data: { lowStockNotified: false },
      });
    }
  }

  return created;
}
