import { prisma } from "../lib/prisma.js";
import { notifyLowStockForUser } from "../services/notification.service.js";
import { finalQuantity, getPharmacistPharmacy } from "../services/request.service.js";
import { serializeMedicine } from "../utils/stock.js";
import { asyncHandler } from "../utils/async-handler.js";

const ACTIVE_REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "COUNTER_PROPOSED",
  "CUSTOMER_ACCEPTED",
  "FULFILLED",
];

export const customerDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await notifyLowStockForUser(userId);

  const [medicines, activeRequests, recentRequests, activities, unread] =
    await Promise.all([
      prisma.medicine.findMany({
        where: { userId, isActive: true },
        include: { familyMember: true },
        orderBy: { name: "asc" },
      }),
      prisma.replenishmentRequest.findMany({
        where: { customerId: userId, status: { in: ACTIVE_REQUEST_STATUSES } },
      }),
      prisma.replenishmentRequest.findMany({
        where: { customerId: userId },
        include: { pharmacy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

  const serialized = medicines.map((m) => serializeMedicine(m));
  const lowStock = serialized.filter((m) => m.lowStock);

  res.json({
    stats: {
      activeMedicines: medicines.length,
      lowStockCount: lowStock.length,
      totalEstimatedUnits: serialized.reduce((sum, m) => sum + m.estimatedStock, 0),
      totalConfirmedUnits: serialized.reduce((sum, m) => sum + m.confirmedStock, 0),
      activeRequests: activeRequests.length,
      pendingRequests: activeRequests.filter((r) => r.status === "PENDING").length,
      unreadNotifications: unread,
    },
    lowStock: lowStock.slice(0, 6),
    medicines: serialized.slice(0, 8),
    activeRequests: activeRequests.slice(0, 5).map((r) => ({
      ...r,
      finalQuantity: finalQuantity(r),
    })),
    recentRequests,
    recentActivity: activities,
  });
});

export const pharmacistDashboard = asyncHandler(async (req, res) => {
  const pharmacy = await getPharmacistPharmacy(req.user.id);
  if (!pharmacy) {
    return res.json({ needsPharmacy: true, stats: null });
  }

  const [catalog, requests, activities, unread] = await Promise.all([
    prisma.pharmacyMedicine.findMany({ where: { pharmacyId: pharmacy.id } }),
    prisma.replenishmentRequest.findMany({
      where: { pharmacyId: pharmacy.id },
      include: {
        customer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.activity.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);

  const counts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const lowCatalog = catalog.filter((c) => c.quantityAvailable < 10 || !c.isAvailable);

  res.json({
    needsPharmacy: false,
    pharmacy: {
      id: pharmacy.id,
      name: pharmacy.name,
      city: pharmacy.city,
      isActive: pharmacy.isActive,
      isApproved: pharmacy.isApproved,
    },
    stats: {
      catalogItems: catalog.length,
      totalUnits: catalog.reduce((sum, c) => sum + c.quantityAvailable, 0),
      lowCatalogCount: lowCatalog.length,
      pendingRequests: counts.PENDING ?? 0,
      activeRequests: requests.filter((r) => ACTIVE_REQUEST_STATUSES.includes(r.status)).length,
      completedRequests: counts.COMPLETED ?? 0,
      unreadNotifications: unread,
    },
    recentRequests: requests.slice(0, 6),
    lowCatalog: lowCatalog.slice(0, 6),
    recentActivity: activities,
    statusCounts: counts,
  });
});
