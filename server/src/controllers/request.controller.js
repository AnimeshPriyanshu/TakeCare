import { prisma } from "../lib/prisma.js";
import {
  acceptProposal,
  cancelRequest,
  confirmReceipt,
  createRequest,
  declineProposal,
  fulfillRequest,
  getCustomerRequest,
  getPharmacistPharmacy,
  listCustomerRequests,
  listPharmacyRequests,
  respondToRequest,
} from "../services/request.service.js";
import { badRequest } from "../utils/http-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const create = asyncHandler(async (req, res) => {
  const request = await createRequest({
    customerId: req.user.id,
    input: req.body,
  });
  res.status(201).json({ request });
});

export const listMine = asyncHandler(async (req, res) => {
  const requests = await listCustomerRequests(req.user.id);
  res.json({ requests });
});

export const getMine = asyncHandler(async (req, res) => {
  const request = await getCustomerRequest(req.params.id, req.user.id);
  res.json({ request });
});

export const accept = asyncHandler(async (req, res) => {
  const request = await acceptProposal({
    customerId: req.user.id,
    requestId: req.params.id,
  });
  res.json({ request });
});

export const decline = asyncHandler(async (req, res) => {
  const request = await declineProposal({
    customerId: req.user.id,
    requestId: req.params.id,
  });
  res.json({ request });
});

export const cancel = asyncHandler(async (req, res) => {
  const request = await cancelRequest({
    customerId: req.user.id,
    requestId: req.params.id,
  });
  res.json({ request });
});

export const confirm = asyncHandler(async (req, res) => {
  const request = await confirmReceipt({
    customerId: req.user.id,
    requestId: req.params.id,
  });
  res.json({ request });
});

export const listForPharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await getPharmacistPharmacy(req.user.id);
  if (!pharmacy) return res.json({ requests: [] });
  const requests = await listPharmacyRequests(pharmacy.id);
  res.json({ requests });
});

export const respond = asyncHandler(async (req, res) => {
  const request = await respondToRequest({
    userId: req.user.id,
    requestId: req.params.id,
    input: req.body,
  });
  res.json({ request });
});

export const fulfill = asyncHandler(async (req, res) => {
  const pharmacy = await getPharmacistPharmacy(req.user.id);
  if (!pharmacy) throw badRequest("Create your pharmacy profile first");
  const request = await fulfillRequest({
    userId: req.user.id,
    requestId: req.params.id,
    note: req.body?.note,
  });
  res.json({ request });
});

export const pharmacistSummary = asyncHandler(async (req, res) => {
  const pharmacy = await getPharmacistPharmacy(req.user.id);
  if (!pharmacy) return res.json({ summary: null });

  const grouped = await prisma.replenishmentRequest.groupBy({
    by: ["status"],
    where: { pharmacyId: pharmacy.id },
    _count: { _all: true },
  });

  res.json({
    summary: grouped.reduce((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {}),
  });
});
