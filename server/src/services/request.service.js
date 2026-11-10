import { prisma } from "../lib/prisma.js";
import { logActivity } from "./activity.service.js";
import { createNotification, notifyLowStockForUser } from "./notification.service.js";
import { badRequest, conflict, notFound } from "../utils/http-error.js";

export const requestInclude = {
  customer: { select: { id: true, name: true, email: true } },
  pharmacy: {
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      phone: true,
      ownerId: true,
    },
  },
  medicine: true,
  pharmacyMedicine: true,
};

export function finalQuantity(request) {
  return request.quantityProposed ?? request.quantityRequested;
}

export async function getPharmacistPharmacy(userId) {
  return prisma.pharmacy.findUnique({ where: { ownerId: userId } });
}

export async function createRequest({ customerId, input }) {
  const pharmacy = await prisma.pharmacy.findFirst({
    where: { id: input.pharmacyId, isActive: true, isApproved: true },
  });
  if (!pharmacy) throw notFound("That pharmacy is not available");

  const medicine = await prisma.medicine.findFirst({
    where: { id: input.medicineId, userId: customerId, isActive: true },
  });
  if (!medicine) throw notFound("Medicine not found in your inventory");

  let pharmacyMedicine = null;
  if (input.pharmacyMedicineId) {
    pharmacyMedicine = await prisma.pharmacyMedicine.findFirst({
      where: { id: input.pharmacyMedicineId, pharmacyId: pharmacy.id },
    });
    if (!pharmacyMedicine) {
      throw badRequest("That medicine is not listed by this pharmacy");
    }
  }

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.replenishmentRequest.create({
      data: {
        customerId,
        pharmacyId: pharmacy.id,
        medicineId: medicine.id,
        pharmacyMedicineId: pharmacyMedicine?.id ?? null,
        medicineName: medicine.name,
        strength: medicine.strength,
        unitLabel: medicine.unitLabel,
        quantityRequested: input.quantityRequested,
        note: input.note || null,
      },
      include: requestInclude,
    });

    await logActivity(
      {
        userId: customerId,
        type: "REQUEST_CREATED",
        message: `Requested ${input.quantityRequested} ${medicine.unitLabel}(s) of ${medicine.name} from ${pharmacy.name}.`,
      },
      tx,
    );

    await createNotification(
      {
        userId: pharmacy.ownerId,
        type: "NEW_REQUEST",
        title: "New replenishment request",
        message: `${created.customer.name} requested ${input.quantityRequested} ${medicine.unitLabel}(s) of ${medicine.name}.`,
        replenishmentRequestId: created.id,
      },
      tx,
    );

    return created;
  });

  return request;
}

export async function listCustomerRequests(customerId) {
  return prisma.replenishmentRequest.findMany({
    where: { customerId },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerRequest(id, customerId) {
  const request = await prisma.replenishmentRequest.findFirst({
    where: { id, customerId },
    include: requestInclude,
  });
  if (!request) throw notFound("Request not found");
  return request;
}

export async function respondToRequest({ userId, requestId, input }) {
  const pharmacy = await getPharmacistPharmacy(userId);
  if (!pharmacy) throw badRequest("Create your pharmacy profile first");

  const request = await prisma.replenishmentRequest.findFirst({
    where: { id: requestId, pharmacyId: pharmacy.id },
    include: requestInclude,
  });
  if (!request) throw notFound("Request not found");
  if (request.status !== "PENDING") {
    throw conflict("This request has already been handled");
  }

  const now = new Date();
  let status;
  let quantityProposed = null;

  if (input.action === "ACCEPT") {
    status = "ACCEPTED";
    quantityProposed = request.quantityRequested;
  } else if (input.action === "REJECT") {
    status = "REJECTED";
  } else {
    status = "COUNTER_PROPOSED";
    quantityProposed = input.quantity;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.replenishmentRequest.update({
      where: { id: request.id },
      data: {
        status,
        quantityProposed,
        pharmacistNote: input.note || null,
        respondedAt: now,
      },
      include: requestInclude,
    });

    let customerMessage;
    if (status === "ACCEPTED") {
      customerMessage = `${pharmacy.name} accepted your request for ${request.quantityRequested} ${request.unitLabel}(s) of ${request.medicineName}.`;
    } else if (status === "REJECTED") {
      customerMessage = `${pharmacy.name} could not fulfil your request for ${request.medicineName}.`;
    } else {
      customerMessage = `${pharmacy.name} proposed ${quantityProposed} ${request.unitLabel}(s) of ${request.medicineName} instead of ${request.quantityRequested}.`;
    }

    await createNotification(
      {
        userId: request.customerId,
        type: "REQUEST_RESPONDED",
        title:
          status === "ACCEPTED"
            ? "Request accepted"
            : status === "REJECTED"
              ? "Request rejected"
              : "New quantity proposed",
        message: customerMessage,
        replenishmentRequestId: request.id,
      },
      tx,
    );

    await logActivity(
      {
        userId: request.customerId,
        type: "REQUEST_RESPONDED",
        message: customerMessage,
      },
      tx,
    );

    return result;
  });

  return updated;
}

export async function fulfillRequest({ userId, requestId, note }) {
  const pharmacy = await getPharmacistPharmacy(userId);
  if (!pharmacy) throw badRequest("Create your pharmacy profile first");

  const request = await prisma.replenishmentRequest.findFirst({
    where: { id: requestId, pharmacyId: pharmacy.id },
    include: requestInclude,
  });
  if (!request) throw notFound("Request not found");
  if (!["ACCEPTED", "CUSTOMER_ACCEPTED"].includes(request.status)) {
    throw conflict("Only accepted requests can be marked as fulfilled");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.replenishmentRequest.update({
      where: { id: request.id },
      data: {
        status: "FULFILLED",
        fulfilledAt: now,
        pharmacistNote: note || request.pharmacistNote,
      },
      include: requestInclude,
    });

    await createNotification(
      {
        userId: request.customerId,
        type: "REQUEST_FULFILLED",
        title: "Ready to confirm receipt",
        message: `${pharmacy.name} marked ${request.medicineName} as fulfilled. Confirm once you have received it so your inventory updates.`,
        replenishmentRequestId: request.id,
      },
      tx,
    );

    await logActivity(
      {
        userId: request.customerId,
        type: "REQUEST_FULFILLED",
        message: `${pharmacy.name} fulfilled your request for ${request.medicineName}. Confirm receipt to update stock.`,
      },
      tx,
    );

    return result;
  });

  return updated;
}

export async function acceptProposal({ customerId, requestId }) {
  const request = await prisma.replenishmentRequest.findFirst({
    where: { id: requestId, customerId },
    include: requestInclude,
  });
  if (!request) throw notFound("Request not found");
  if (request.status !== "COUNTER_PROPOSED") {
    throw conflict("There is no pending proposal to accept");
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const result = await tx.replenishmentRequest.update({
      where: { id: request.id },
      data: { status: "CUSTOMER_ACCEPTED", proposalRespondedAt: now },
      include: requestInclude,
    });

    await createNotification(
      {
        userId: request.pharmacy.ownerId,
        type: "PROPOSAL_ACCEPTED",
        title: "Customer accepted your offer",
        message: `${request.customer.name} accepted ${request.quantityProposed} ${request.unitLabel}(s) of ${request.medicineName}. You can now mark it fulfilled.`,
        replenishmentRequestId: request.id,
      },
      tx,
    );

    await logActivity(
      {
        userId: customerId,
        type: "PROPOSAL_ACCEPTED",
        message: `You accepted ${request.pharmacy.name}'s offer of ${request.quantityProposed} ${request.unitLabel}(s) of ${request.medicineName}.`,
      },
      tx,
    );

    return result;
  });
}

export async function declineProposal({ customerId, requestId }) {
  const request = await prisma.replenishmentRequest.findFirst({
    where: { id: requestId, customerId },
    include: requestInclude,
  });
  if (!request) throw notFound("Request not found");
  if (request.status !== "COUNTER_PROPOSED") {
    throw conflict("There is no pending proposal to decline");
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const result = await tx.replenishmentRequest.update({
      where: { id: request.id },
      data: { status: "CUSTOMER_DECLINED", proposalRespondedAt: now },
      include: requestInclude,
    });

    await createNotification(
      {
        userId: request.pharmacy.ownerId,
        type: "PROPOSAL_DECLINED",
        title: "Customer declined your offer",
        message: `${request.customer.name} declined your offer for ${request.medicineName}.`,
        replenishmentRequestId: request.id,
      },
      tx,
    );

    await logActivity(
      {
        userId: customerId,
        type: "PROPOSAL_DECLINED",
        message: `You declined ${request.pharmacy.name}'s offer for ${request.medicineName}.`,
      },
      tx,
    );

    return result;
  });
}

export async function cancelRequest({ customerId, requestId }) {
  const request = await prisma.replenishmentRequest.findFirst({
    where: { id: requestId, customerId },
    include: requestInclude,
  });
  if (!request) throw notFound("Request not found");
  if (request.status !== "PENDING") {
    throw conflict("Only pending requests can be cancelled");
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.replenishmentRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED" },
      include: requestInclude,
    });

    await logActivity(
      {
        userId: customerId,
        type: "REQUEST_CANCELLED",
        message: `You cancelled your request for ${request.medicineName}.`,
      },
      tx,
    );

    return result;
  });
}

export async function confirmReceipt({ customerId, requestId }) {
  const request = await prisma.replenishmentRequest.findFirst({
    where: { id: requestId, customerId },
    include: requestInclude,
  });
  if (!request) throw notFound("Request not found");
  if (request.status !== "FULFILLED") {
    throw conflict("This request is not ready to be confirmed");
  }

  const quantity = finalQuantity(request);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.replenishmentRequest.updateMany({
      where: {
        id: request.id,
        customerId,
        status: "FULFILLED",
        inventoryAppliedAt: null,
      },
      data: {
        status: "COMPLETED",
        completedAt: now,
        inventoryAppliedAt: now,
      },
    });

    if (claimed.count !== 1) {
      throw conflict("This request has already been confirmed");
    }

    let medicine = null;
    if (request.medicineId) {
      medicine = await tx.medicine.findFirst({
        where: { id: request.medicineId, userId: customerId },
      });
    }

    if (!medicine) {
      medicine = await tx.medicine.create({
        data: {
          userId: customerId,
          name: request.medicineName,
          strength: request.strength || "",
          form: "Tablet",
          unitLabel: request.unitLabel,
          confirmedStock: quantity,
          dailyUnits: 0,
          reorderThreshold: 5,
          lastConfirmedAt: now,
        },
      });
    }

    const previousStock = medicine.confirmedStock;
    const newStock = previousStock + quantity;
    const lowAfter = newStock <= medicine.reorderThreshold;

    await tx.medicine.update({
      where: { id: medicine.id },
      data: {
        confirmedStock: newStock,
        lastConfirmedAt: now,
        lowStockNotified: lowAfter ? medicine.lowStockNotified : false,
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        medicineId: medicine.id,
        type: "REQUEST_FULFILLMENT",
        quantityChange: quantity,
        previousStock,
        newStock,
        note: `Received from ${request.pharmacy.name} (request confirmed)`,
        replenishmentRequestId: request.id,
        createdAt: now,
      },
    });

    if (request.pharmacyMedicineId) {
      const catalogItem = await tx.pharmacyMedicine.findUnique({
        where: { id: request.pharmacyMedicineId },
      });
      if (catalogItem) {
        const remaining = Math.max(0, catalogItem.quantityAvailable - quantity);
        await tx.pharmacyMedicine.update({
          where: { id: catalogItem.id },
          data: {
            quantityAvailable: remaining,
            isAvailable: remaining > 0 ? catalogItem.isAvailable : false,
          },
        });
      }
    }

    await createNotification(
      {
        userId: request.pharmacy.ownerId,
        type: "REQUEST_COMPLETED",
        title: "Purchase confirmed",
        message: `${request.customer.name} confirmed receipt of ${quantity} ${request.unitLabel}(s) of ${request.medicineName}.`,
        replenishmentRequestId: request.id,
      },
      tx,
    );

    await logActivity(
      {
        userId: customerId,
        type: "REQUEST_COMPLETED",
        message: `Received ${quantity} ${request.unitLabel}(s) of ${request.medicineName} from ${request.pharmacy.name}. Inventory updated.`,
      },
      tx,
    );

  });

  await notifyLowStockForUser(customerId);

  return prisma.replenishmentRequest.findUnique({
    where: { id: request.id },
    include: requestInclude,
  });
}

export async function listPharmacyRequests(pharmacyId) {
  return prisma.replenishmentRequest.findMany({
    where: { pharmacyId },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });
}
