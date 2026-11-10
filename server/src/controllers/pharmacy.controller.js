import { prisma } from "../lib/prisma.js";
import { logActivity } from "../services/activity.service.js";
import { getPharmacistPharmacy } from "../services/request.service.js";
import { badRequest, notFound } from "../utils/http-error.js";
import { asyncHandler } from "../utils/async-handler.js";

async function requirePharmacy(userId) {
  const pharmacy = await getPharmacistPharmacy(userId);
  if (!pharmacy) throw badRequest("Create your pharmacy profile first");
  return pharmacy;
}

export const listDirectory = asyncHandler(async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const pharmacies = await prisma.pharmacy.findMany({
    where: {
      isActive: true,
      isApproved: true,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      _count: { select: { catalog: true } },
      catalog: {
        where: { isAvailable: true, quantityAvailable: { gt: 0 } },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  res.json({
    pharmacies: pharmacies.map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      address: p.address,
      phone: p.phone,
      description: p.description,
      catalogCount: p._count.catalog,
      availableCount: p.catalog.length,
    })),
  });
});

export const getDirectoryPharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await prisma.pharmacy.findFirst({
    where: { id: req.params.id, isActive: true, isApproved: true },
    include: { catalog: { orderBy: [{ name: "asc" }, { strength: "asc" }] } },
  });
  if (!pharmacy) throw notFound("Pharmacy not found");

  res.json({
    pharmacy: {
      id: pharmacy.id,
      name: pharmacy.name,
      address: pharmacy.address,
      city: pharmacy.city,
      pincode: pharmacy.pincode,
      phone: pharmacy.phone,
      description: pharmacy.description,
      catalog: pharmacy.catalog,
    },
  });
});

export const getMyPharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { ownerId: req.user.id },
    include: {
      catalog: { orderBy: [{ name: "asc" }, { strength: "asc" }] },
      _count: { select: { requests: true, catalog: true } },
    },
  });
  res.json({ pharmacy: pharmacy ?? null });
});

export const upsertMyPharmacy = asyncHandler(async (req, res) => {
  const data = req.body;
  const existing = await getPharmacistPharmacy(req.user.id);

  if (existing) {
    const updated = await prisma.pharmacy.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.pincode !== undefined ? { pincode: data.pincode } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.licenseNumber !== undefined
          ? { licenseNumber: data.licenseNumber }
          : {}),
        ...(data.description !== undefined
          ? { description: data.description || null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: { catalog: true },
    });

    await logActivity({
      userId: req.user.id,
      type: "PHARMACY_UPDATED",
      message: `Updated pharmacy profile for ${updated.name}.`,
    });

    return res.json({ pharmacy: updated });
  }

  const created = await prisma.pharmacy.create({
    data: {
      ownerId: req.user.id,
      name: data.name,
      address: data.address,
      city: data.city,
      pincode: data.pincode,
      phone: data.phone,
      licenseNumber: data.licenseNumber,
      description: data.description || null,
      isApproved: true,
      isActive: true,
    },
    include: { catalog: true },
  });

  await logActivity({
    userId: req.user.id,
    type: "PHARMACY_CREATED",
    message: `Created pharmacy profile for ${created.name}.`,
  });

  res.status(201).json({ pharmacy: created });
});

export const listCatalog = asyncHandler(async (req, res) => {
  const pharmacy = await getPharmacistPharmacy(req.user.id);
  if (!pharmacy) return res.json({ catalog: [] });

  const catalog = await prisma.pharmacyMedicine.findMany({
    where: { pharmacyId: pharmacy.id },
    orderBy: [{ name: "asc" }, { strength: "asc" }],
  });
  res.json({ catalog });
});

export const createCatalogItem = asyncHandler(async (req, res) => {
  const pharmacy = await requirePharmacy(req.user.id);
  const data = req.body;

  const item = await prisma.pharmacyMedicine.create({
    data: {
      pharmacyId: pharmacy.id,
      name: data.name,
      strength: data.strength ?? "",
      form: data.form ?? "Tablet",
      unitLabel: data.unitLabel ?? "tablet",
      quantityAvailable: data.quantityAvailable ?? 0,
      price: data.price ?? null,
      isAvailable: data.isAvailable ?? true,
    },
  });

  await logActivity({
    userId: req.user.id,
    type: "CATALOG_ADDED",
    message: `Added ${item.name} to the ${pharmacy.name} catalog.`,
  });

  res.status(201).json({ item });
});

export const updateCatalogItem = asyncHandler(async (req, res) => {
  const pharmacy = await requirePharmacy(req.user.id);
  const existing = await prisma.pharmacyMedicine.findFirst({
    where: { id: req.params.id, pharmacyId: pharmacy.id },
  });
  if (!existing) throw notFound("Catalog item not found");

  const data = req.body;
  const item = await prisma.pharmacyMedicine.update({
    where: { id: existing.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.strength !== undefined ? { strength: data.strength } : {}),
      ...(data.form !== undefined ? { form: data.form } : {}),
      ...(data.unitLabel !== undefined ? { unitLabel: data.unitLabel } : {}),
      ...(data.quantityAvailable !== undefined
        ? { quantityAvailable: data.quantityAvailable }
        : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
    },
  });

  await logActivity({
    userId: req.user.id,
    type: "CATALOG_UPDATED",
    message: `Updated ${item.name} availability to ${item.quantityAvailable} ${item.unitLabel}(s).`,
  });

  res.json({ item });
});

export const deleteCatalogItem = asyncHandler(async (req, res) => {
  const pharmacy = await requirePharmacy(req.user.id);
  const existing = await prisma.pharmacyMedicine.findFirst({
    where: { id: req.params.id, pharmacyId: pharmacy.id },
  });
  if (!existing) throw notFound("Catalog item not found");

  await prisma.pharmacyMedicine.delete({ where: { id: existing.id } });

  await logActivity({
    userId: req.user.id,
    type: "CATALOG_REMOVED",
    message: `Removed ${existing.name} from the catalog.`,
  });

  res.json({ message: "Catalog item removed" });
});
