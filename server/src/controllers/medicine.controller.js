import { prisma } from "../lib/prisma.js";
import { serializeMedicine } from "../utils/stock.js";
import { logActivity } from "../services/activity.service.js";
import { notifyLowStockForUser } from "../services/notification.service.js";
import {
  getOwnedMedicine,
  recordManualTransaction,
} from "../services/inventory.service.js";
import { badRequest, notFound } from "../utils/http-error.js";
import { asyncHandler } from "../utils/async-handler.js";

async function assertFamilyMember(familyMemberId, userId) {
  if (!familyMemberId) return null;
  const member = await prisma.familyMember.findFirst({
    where: { id: familyMemberId, userId },
  });
  if (!member) throw badRequest("Selected family member was not found");
  return member;
}

export const listMedicines = asyncHandler(async (req, res) => {
  await notifyLowStockForUser(req.user.id);

  const medicines = await prisma.medicine.findMany({
    where: { userId: req.user.id },
    include: { familyMember: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  res.json({ medicines: medicines.map((m) => serializeMedicine(m)) });
});

export const createMedicine = asyncHandler(async (req, res) => {
  const data = req.body;
  await assertFamilyMember(data.familyMemberId, req.user.id);

  const medicine = await prisma.$transaction(async (tx) => {
    const created = await tx.medicine.create({
      data: {
        userId: req.user.id,
        name: data.name,
        strength: data.strength ?? "",
        form: data.form ?? "Tablet",
        unitLabel: data.unitLabel ?? "tablet",
        confirmedStock: data.confirmedStock ?? 0,
        dailyUnits: data.dailyUnits ?? 0,
        dosageSchedule: data.dosageSchedule || null,
        reorderThreshold: data.reorderThreshold ?? 5,
        familyMemberId: data.familyMemberId || null,
        lastConfirmedAt: new Date(),
      },
      include: { familyMember: true },
    });

    if (created.confirmedStock > 0) {
      await tx.inventoryTransaction.create({
        data: {
          medicineId: created.id,
          type: "INITIAL",
          quantityChange: created.confirmedStock,
          previousStock: 0,
          newStock: created.confirmedStock,
          note: "Initial stock entered",
        },
      });
    }

    await logActivity(
      {
        userId: req.user.id,
        type: "MEDICINE_ADDED",
        message: `Added ${created.name}${created.strength ? ` ${created.strength}` : ""} with ${created.confirmedStock} ${created.unitLabel}(s).`,
      },
      tx,
    );

    return created;
  });

  await notifyLowStockForUser(req.user.id);
  res.status(201).json({ medicine: serializeMedicine(medicine) });
});

export const getMedicine = asyncHandler(async (req, res) => {
  const medicine = await prisma.medicine.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: {
      familyMember: true,
      transactions: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!medicine) throw notFound("Medicine not found");

  res.json({
    medicine: serializeMedicine(medicine),
    history: medicine.transactions,
  });
});

export const updateMedicine = asyncHandler(async (req, res) => {
  const existing = await getOwnedMedicine(req.params.id, req.user.id);
  const data = req.body;

  if ("familyMemberId" in data) {
    await assertFamilyMember(data.familyMemberId, req.user.id);
  }

  const updated = await prisma.medicine.update({
    where: { id: existing.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.strength !== undefined ? { strength: data.strength } : {}),
      ...(data.form !== undefined ? { form: data.form } : {}),
      ...(data.unitLabel !== undefined ? { unitLabel: data.unitLabel } : {}),
      ...(data.dailyUnits !== undefined ? { dailyUnits: data.dailyUnits } : {}),
      ...(data.dosageSchedule !== undefined
        ? { dosageSchedule: data.dosageSchedule || null }
        : {}),
      ...(data.reorderThreshold !== undefined
        ? { reorderThreshold: data.reorderThreshold }
        : {}),
      ...(data.familyMemberId !== undefined
        ? { familyMemberId: data.familyMemberId || null }
        : {}),
    },
    include: { familyMember: true },
  });

  await logActivity({
    userId: req.user.id,
    type: "MEDICINE_UPDATED",
    message: `Updated details for ${updated.name}.`,
  });
  await notifyLowStockForUser(req.user.id);

  res.json({ medicine: serializeMedicine(updated) });
});

export const deactivateMedicine = asyncHandler(async (req, res) => {
  const existing = await getOwnedMedicine(req.params.id, req.user.id);
  const updated = await prisma.medicine.update({
    where: { id: existing.id },
    data: { isActive: false },
  });

  await logActivity({
    userId: req.user.id,
    type: "MEDICINE_DEACTIVATED",
    message: `Deactivated ${updated.name}.`,
  });

  res.json({ medicine: serializeMedicine(updated) });
});

export const reactivateMedicine = asyncHandler(async (req, res) => {
  const existing = await prisma.medicine.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!existing) throw notFound("Medicine not found");

  const updated = await prisma.medicine.update({
    where: { id: existing.id },
    data: { isActive: true },
  });

  await logActivity({
    userId: req.user.id,
    type: "MEDICINE_REACTIVATED",
    message: `Reactivated ${updated.name}.`,
  });
  await notifyLowStockForUser(req.user.id);

  res.json({ medicine: serializeMedicine(updated) });
});

export const addTransaction = asyncHandler(async (req, res) => {
  const result = await recordManualTransaction({
    userId: req.user.id,
    medicineId: req.params.id,
    type: req.body.type,
    quantity: req.body.quantity,
    note: req.body.note,
  });
  res.status(201).json(result);
});

export const getHistory = asyncHandler(async (req, res) => {
  const medicine = await getOwnedMedicine(req.params.id, req.user.id);
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { medicineId: medicine.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ medicine: serializeMedicine(medicine), transactions });
});
