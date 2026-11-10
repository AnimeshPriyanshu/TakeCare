import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../utils/http-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const listFamilyMembers = asyncHandler(async (req, res) => {
  const members = await prisma.familyMember.findMany({
    where: { userId: req.user.id },
    include: { _count: { select: { medicines: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ familyMembers: members });
});

export const createFamilyMember = asyncHandler(async (req, res) => {
  const member = await prisma.familyMember.create({
    data: {
      userId: req.user.id,
      name: req.body.name,
      relation: req.body.relation,
    },
  });
  res.status(201).json({ familyMember: member });
});

export const deleteFamilyMember = asyncHandler(async (req, res) => {
  const member = await prisma.familyMember.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!member) throw notFound("Family member not found");

  const linked = await prisma.medicine.count({
    where: { familyMemberId: member.id },
  });
  if (linked > 0) {
    throw badRequest(
      "Move or remove this member's medicines before deleting the profile",
    );
  }

  await prisma.familyMember.delete({ where: { id: member.id } });
  res.json({ message: "Family member removed" });
});
