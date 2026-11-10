import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);

  res.json({ notifications, unread });
});

export const markRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { isRead: true },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: { message: "Notification not found" } });
  }

  res.json({ message: "Marked as read" });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: "All notifications marked as read" });
});
