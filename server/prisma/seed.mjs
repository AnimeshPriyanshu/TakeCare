import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);

async function reset() {
  await prisma.chatMessage.deleteMany();
  await prisma.aiPendingAction.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.replenishmentRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.pharmacyMedicine.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.pharmacy.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Resetting demo data...");
  await reset();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const aarav = await prisma.user.create({
    data: {
      name: "Aarav Sharma",
      email: "aarav@takecare.demo",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const meera = await prisma.user.create({
    data: {
      name: "Meera Sharma",
      email: "meera@takecare.demo",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const raghav = await prisma.user.create({
    data: {
      name: "Raghav Menon",
      email: "raghav@takecare.demo",
      passwordHash,
      role: "PHARMACIST",
    },
  });

  const sana = await prisma.user.create({
    data: {
      name: "Sana Iyer",
      email: "sana@takecare.demo",
      passwordHash,
      role: "PHARMACIST",
    },
  });

  const vikram = await prisma.user.create({
    data: {
      name: "Vikram Rao",
      email: "vikram@takecare.demo",
      passwordHash,
      role: "PHARMACIST",
    },
  });

  const carePlus = await prisma.pharmacy.create({
    data: {
      ownerId: raghav.id,
      name: "CarePlus Pharmacy",
      address: "112, 5th Block, Koramangala",
      city: "Bengaluru",
      pincode: "560095",
      phone: "+91 98450 11223",
      licenseNumber: "KA-PH-2024-0192",
      description:
        "Neighbourhood pharmacy focused on chronic-care medicines, with same-day pickup and careful stock checks.",
      isApproved: true,
      isActive: true,
    },
  });

  const greenLeaf = await prisma.pharmacy.create({
    data: {
      ownerId: sana.id,
      name: "GreenLeaf Pharmacy",
      address: "48, 100 Feet Road, Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
      phone: "+91 98860 44551",
      licenseNumber: "KA-PH-2023-0771",
      description:
        "Family-run pharmacy with a broad generic medicine catalogue and friendly pharmacist support.",
      isApproved: true,
      isActive: true,
    },
  });

  await prisma.pharmacy.create({
    data: {
      ownerId: vikram.id,
      name: "Wellness Chemist (pending review)",
      address: "9, MG Road",
      city: "Bengaluru",
      pincode: "560001",
      phone: "+91 99000 10101",
      licenseNumber: "KA-PH-2025-0901",
      description: "Awaiting approval — should not appear in the customer directory.",
      isApproved: false,
      isActive: true,
    },
  });

  const mother = await prisma.familyMember.create({
    data: { userId: aarav.id, name: "Ananya Sharma", relation: "Mother" },
  });
  const child = await prisma.familyMember.create({
    data: { userId: aarav.id, name: "Kabir Sharma", relation: "Son" },
  });
  await prisma.familyMember.create({
    data: { userId: meera.id, name: "Rohan Sharma", relation: "Father" },
  });

  async function createMedicine(data) {
    const medicine = await prisma.medicine.create({ data });
    if (medicine.confirmedStock > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          medicineId: medicine.id,
          type: "INITIAL",
          quantityChange: medicine.confirmedStock,
          previousStock: 0,
          newStock: medicine.confirmedStock,
          note: "Initial stock entered",
          createdAt: medicine.lastConfirmedAt,
        },
      });
    }
    return medicine;
  }

  const metformin = await createMedicine({
    userId: aarav.id,
    name: "Metformin",
    strength: "500 mg",
    form: "Tablet",
    unitLabel: "tablet",
    confirmedStock: 30,
    dailyUnits: 2,
    dosageSchedule: "1 tablet after breakfast and 1 after dinner (as supplied by doctor)",
    reorderThreshold: 10,
    lastConfirmedAt: daysAgo(5),
  });

  const amlodipine = await createMedicine({
    userId: aarav.id,
    name: "Amlodipine",
    strength: "5 mg",
    form: "Tablet",
    unitLabel: "tablet",
    confirmedStock: 12,
    dailyUnits: 1,
    dosageSchedule: "1 tablet in the morning",
    reorderThreshold: 5,
    lastConfirmedAt: daysAgo(9),
  });

  const atorvastatin = await createMedicine({
    userId: aarav.id,
    name: "Atorvastatin",
    strength: "10 mg",
    form: "Tablet",
    unitLabel: "tablet",
    confirmedStock: 40,
    dailyUnits: 1,
    dosageSchedule: "1 tablet at night",
    reorderThreshold: 8,
    lastConfirmedAt: daysAgo(2),
    lowStockNotified: false,
  });

  const vitaminD = await createMedicine({
    userId: aarav.id,
    name: "Vitamin D3",
    strength: "60000 IU",
    form: "Sachet",
    unitLabel: "sachet",
    confirmedStock: 4,
    dailyUnits: 0,
    dosageSchedule: "1 sachet weekly, as supplied by doctor",
    reorderThreshold: 2,
    lastConfirmedAt: daysAgo(10),
  });

  const cetirizine = await createMedicine({
    userId: aarav.id,
    familyMemberId: child.id,
    name: "Cetirizine",
    strength: "10 mg",
    form: "Tablet",
    unitLabel: "tablet",
    confirmedStock: 10,
    dailyUnits: 0,
    dosageSchedule: "Only as needed, as supplied by doctor",
    reorderThreshold: 3,
    lastConfirmedAt: daysAgo(15),
  });

  const amoxicillin = await createMedicine({
    userId: aarav.id,
    name: "Amoxicillin",
    strength: "500 mg",
    form: "Capsule",
    unitLabel: "capsule",
    confirmedStock: 21,
    dailyUnits: 3,
    dosageSchedule: "1 capsule three times a day for 7 days (as supplied by doctor)",
    reorderThreshold: 7,
    lastConfirmedAt: daysAgo(3),
  });

  await createMedicine({
    userId: aarav.id,
    familyMemberId: mother.id,
    name: "Ibuprofen",
    strength: "400 mg",
    form: "Tablet",
    unitLabel: "tablet",
    confirmedStock: 0,
    dailyUnits: 0,
    reorderThreshold: 4,
    isActive: false,
    lastConfirmedAt: daysAgo(30),
  });

  await createMedicine({
    userId: meera.id,
    name: "Levothyroxine",
    strength: "50 mcg",
    form: "Tablet",
    unitLabel: "tablet",
    confirmedStock: 25,
    dailyUnits: 1,
    dosageSchedule: "1 tablet on an empty stomach",
    reorderThreshold: 7,
    lastConfirmedAt: daysAgo(1),
  });

  await createMedicine({
    userId: meera.id,
    name: "Salbutamol Inhaler",
    strength: "100 mcg",
    form: "Inhaler",
    unitLabel: "puff",
    confirmedStock: 120,
    dailyUnits: 2,
    dosageSchedule: "2 puffs when needed, as supplied by doctor",
    reorderThreshold: 30,
    lastConfirmedAt: daysAgo(4),
  });

  const catalogData = [
    [carePlus.id, "Metformin", "500 mg", "Tablet", "tablet", 120, 2.5],
    [carePlus.id, "Amlodipine", "5 mg", "Tablet", "tablet", 80, 1.8],
    [carePlus.id, "Atorvastatin", "10 mg", "Tablet", "tablet", 60, 3.2],
    [carePlus.id, "Cetirizine", "10 mg", "Tablet", "tablet", 150, 1.2],
    [carePlus.id, "Amoxicillin", "500 mg", "Capsule", "capsule", 40, 8],
    [carePlus.id, "Vitamin D3", "60000 IU", "Sachet", "sachet", 25, 30],
    [carePlus.id, "Pantoprazole", "40 mg", "Tablet", "tablet", 0, 4.1],
    [greenLeaf.id, "Metformin", "500 mg", "Tablet", "tablet", 40, 2.2],
    [greenLeaf.id, "Amlodipine", "5 mg", "Tablet", "tablet", 30, 2.0],
    [greenLeaf.id, "Azithromycin", "500 mg", "Tablet", "tablet", 15, 12.5],
    [greenLeaf.id, "Vitamin D3", "60000 IU", "Sachet", "sachet", 10, 28],
    [greenLeaf.id, "Levothyroxine", "50 mcg", "Tablet", "tablet", 22, 4.5],
  ];

  const catalog = {};
  for (const [pharmacyId, name, strength, form, unitLabel, quantityAvailable, price] of catalogData) {
    const item = await prisma.pharmacyMedicine.create({
      data: {
        pharmacyId,
        name,
        strength,
        form,
        unitLabel,
        quantityAvailable,
        price,
        isAvailable: quantityAvailable > 0,
      },
    });
    catalog[`${pharmacyId}:${name}`] = item;
  }

  const pendingRequest = await prisma.replenishmentRequest.create({
    data: {
      customerId: aarav.id,
      pharmacyId: carePlus.id,
      medicineId: amlodipine.id,
      pharmacyMedicineId: catalog[`${carePlus.id}:Amlodipine`].id,
      medicineName: "Amlodipine",
      strength: "5 mg",
      unitLabel: "tablet",
      quantityRequested: 30,
      note: "Regular monthly refill, please confirm availability.",
      status: "PENDING",
      createdAt: daysAgo(1),
    },
  });

  await prisma.replenishmentRequest.create({
    data: {
      customerId: aarav.id,
      pharmacyId: greenLeaf.id,
      medicineId: metformin.id,
      pharmacyMedicineId: catalog[`${greenLeaf.id}:Metformin`].id,
      medicineName: "Metformin",
      strength: "500 mg",
      unitLabel: "tablet",
      quantityRequested: 30,
      quantityProposed: 20,
      pharmacistNote: "We can offer 20 tablets today; the next batch arrives tomorrow.",
      status: "COUNTER_PROPOSED",
      respondedAt: daysAgo(0.4),
      createdAt: daysAgo(1.2),
    },
  });

  const completedRequest = await prisma.replenishmentRequest.create({
    data: {
      customerId: aarav.id,
      pharmacyId: carePlus.id,
      medicineId: atorvastatin.id,
      pharmacyMedicineId: catalog[`${carePlus.id}:Atorvastatin`].id,
      medicineName: "Atorvastatin",
      strength: "10 mg",
      unitLabel: "tablet",
      quantityRequested: 20,
      quantityProposed: 20,
      status: "COMPLETED",
      respondedAt: daysAgo(3),
      fulfilledAt: daysAgo(2.5),
      completedAt: daysAgo(2),
      inventoryAppliedAt: daysAgo(2),
      createdAt: daysAgo(3.2),
    },
  });

  await prisma.inventoryTransaction.create({
    data: {
      medicineId: atorvastatin.id,
      type: "REQUEST_FULFILLMENT",
      quantityChange: 20,
      previousStock: 20,
      newStock: 40,
      note: "Received from CarePlus Pharmacy (request confirmed)",
      replenishmentRequestId: completedRequest.id,
      createdAt: daysAgo(2),
    },
  });

  await prisma.replenishmentRequest.create({
    data: {
      customerId: aarav.id,
      pharmacyId: greenLeaf.id,
      medicineId: vitaminD.id,
      medicineName: "Vitamin D3",
      strength: "60000 IU",
      unitLabel: "sachet",
      quantityRequested: 5,
      status: "REJECTED",
      pharmacistNote: "Out of stock until next week.",
      respondedAt: daysAgo(4),
      createdAt: daysAgo(4.3),
    },
  });

  await prisma.replenishmentRequest.create({
    data: {
      customerId: aarav.id,
      pharmacyId: carePlus.id,
      medicineId: cetirizine.id,
      pharmacyMedicineId: catalog[`${carePlus.id}:Cetirizine`].id,
      medicineName: "Cetirizine",
      strength: "10 mg",
      unitLabel: "tablet",
      quantityRequested: 10,
      quantityProposed: 10,
      status: "FULFILLED",
      respondedAt: daysAgo(1.5),
      fulfilledAt: daysAgo(0.5),
      createdAt: daysAgo(1.8),
    },
  });

  await prisma.replenishmentRequest.create({
    data: {
      customerId: aarav.id,
      pharmacyId: carePlus.id,
      medicineId: amoxicillin.id,
      pharmacyMedicineId: catalog[`${carePlus.id}:Amoxicillin`].id,
      medicineName: "Amoxicillin",
      strength: "500 mg",
      unitLabel: "capsule",
      quantityRequested: 21,
      quantityProposed: 21,
      status: "ACCEPTED",
      respondedAt: daysAgo(0.2),
      createdAt: daysAgo(0.6),
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        userId: aarav.id,
        type: "MEDICINE_ADDED",
        message: "Added Amoxicillin 500 mg with 21 capsule(s).",
        createdAt: daysAgo(3),
      },
      {
        userId: aarav.id,
        type: "REQUEST_CREATED",
        message: "Requested 30 tablet(s) of Amlodipine from CarePlus Pharmacy.",
        createdAt: daysAgo(1),
      },
      {
        userId: aarav.id,
        type: "REQUEST_CREATED",
        message: "Requested 10 tablet(s) of Cetirizine from CarePlus Pharmacy.",
        createdAt: daysAgo(1.8),
      },
      {
        userId: aarav.id,
        type: "REQUEST_COMPLETED",
        message: "Received 20 tablet(s) of Atorvastatin from CarePlus Pharmacy. Inventory updated.",
        createdAt: daysAgo(2),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: aarav.id,
        type: "WELCOME",
        title: "Welcome to TakeCare",
        message: "Track your medicines, see estimated stock, and request refills from registered pharmacies.",
        createdAt: daysAgo(20),
      },
      {
        userId: aarav.id,
        type: "REQUEST_FULFILLED",
        title: "Ready to confirm receipt",
        message: "CarePlus Pharmacy marked Cetirizine 10 mg as fulfilled. Confirm receipt once collected so your inventory updates.",
        isRead: false,
        createdAt: daysAgo(0.5),
      },
      {
        userId: raghav.id,
        type: "NEW_REQUEST",
        title: "New replenishment request",
        message: "Aarav Sharma requested 30 tablet(s) of Amlodipine.",
        replenishmentRequestId: pendingRequest.id,
        createdAt: daysAgo(1),
      },
    ],
  });

  console.log("\nDemo data ready.");
  console.log("Customers:   aarav@takecare.demo / meera@takecare.demo");
  console.log("Pharmacists: raghav@takecare.demo / sana@takecare.demo");
  console.log("Password:    Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
