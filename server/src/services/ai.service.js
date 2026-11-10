import { prisma } from "../lib/prisma.js";
import { serializeMedicine } from "../utils/stock.js";
import { logActivity } from "./activity.service.js";
import { notifyLowStockForUser } from "./notification.service.js";
import { badRequest, conflict, notFound } from "../utils/http-error.js";

export const AI_MODE = "demo";
const ACTION_TTL_MINUTES = 15;

const HELP =
  "I can help with your TakeCare data. Try:\n" +
  "• “How many tablets do I have left?”\n" +
  "• “Which medicines are running low?”\n" +
  "• “Show my pending requests”\n" +
  "• “I purchased 10 more tablets of Metformin”\n" +
  "• “Find a pharmacy listing Amoxicillin”\n\n" +
  "I never change stock without your confirmation and I do not give medical or dosage advice.";

function money(n) {
  return `₹${Number(n).toFixed(2)}`;
}

function medicineLabel(medicine) {
  return medicine.strength ? `${medicine.name} ${medicine.strength}` : medicine.name;
}

function pickMedicine(message, medicines) {
  const lower = message.toLowerCase();
  const matches = medicines.filter((m) =>
    lower.includes(m.name.toLowerCase()),
  );
  if (matches.length === 0) return { match: null, ambiguous: [] };
  if (matches.length === 1) return { match: matches[0], ambiguous: [] };

  const sorted = [...matches].sort((a, b) => b.name.length - a.name.length);
  if (sorted[0].name.length > sorted[1].name.length) {
    return { match: sorted[0], ambiguous: [] };
  }
  return { match: null, ambiguous: sorted };
}

function extractQuantity(message) {
  const unitMatch = message.match(
    /(\d+)\s*(?:more\s+)?(?:tablets?|capsules?|pills?|units?|strips?|bottles?|pieces?|pcs|sachets?|doses?|ml)\b/i,
  );
  if (unitMatch) return Number(unitMatch[1]);
  const signed = message.match(/(?:^|\s)([+-]\d+)(?:\s|$)/);
  if (signed) return Math.abs(Number(signed[1]));
  const any = message.match(/\b(\d{1,6})\b/);
  if (any) return Number(any[1]);
  return null;
}

function wantedTargetStock(message) {
  const patterns = [
    /(?:set|correct|update|change)[\s\S]*?(?:to|at)\s+(\d{1,6})/i,
    /(?:only have|actually have|should be|actually|have)\s+(\d{1,6})/i,
    /(\d{1,6})\s+(?:left|remaining|in stock)/i,
  ];
  for (const pattern of patterns) {
    const found = message.match(pattern);
    if (found) return Number(found[1]);
  }
  return null;
}

function extractSearchedMedicine(message, medicines) {
  const { match } = pickMedicine(message, medicines);
  if (match) return match.name;

  const explicit = message.match(
    /(?:listing|lists|for|with|has|about|of)\s+([a-z0-9][a-z0-9\s-]{1,50})[?.!]*$/i,
  );
  if (!explicit) return null;

  const stopWords = new Set([
    "this",
    "that",
    "medicine",
    "medicines",
    "tablets",
    "tablet",
    "capsules",
    "capsule",
    "it",
    "them",
    "me",
    "my",
    "registered",
    "pharmacy",
    "pharmacies",
    "available",
    "stock",
    "the",
    "a",
    "an",
  ]);

  const cleaned = explicit[1]
    .split(/\s+/)
    .filter((word) => !stopWords.has(word.toLowerCase()))
    .join(" ")
    .trim();

  return cleaned.length >= 2 ? cleaned : null;
}

function buildStockSummary(medicines) {
  if (medicines.length === 0) {
    return "You have no active medicines yet. Add a medicine from the Medicines page and I can track it for you.";
  }
  const lines = medicines.map((m) => {
    const s = serializeMedicine(m);
    return `• **${medicineLabel(m)}**: about **${s.estimatedStock} ${m.unitLabel}(s)** estimated (confirmed ${s.confirmedStock}, ${s.dailyUnits}/day, updated ${s.elapsedDays} day(s) ago)${s.lowStock ? " — low stock" : ""}`;
  });
  return `Here is your current stock estimate:\n${lines.join("\n")}\n\nEstimates are based on the last confirmed stock and your daily usage. This is not medical advice.`;
}

async function respondToStock(userId, message) {
  const medicines = await prisma.medicine.findMany({
    where: { userId, isActive: true },
    orderBy: { name: "asc" },
  });

  const { match, ambiguous } = pickMedicine(message, medicines);
  if (ambiguous.length > 1) {
    return {
      reply: `I found more than one matching medicine: ${ambiguous
        .map((m) => medicineLabel(m))
        .join(", ")}. Which one do you mean?`,
    };
  }
  if (match) {
    const s = serializeMedicine(match);
    return {
      reply:
        `**${medicineLabel(match)}**\n` +
        `• Estimated stock: **${s.estimatedStock} ${match.unitLabel}(s)**\n` +
        `• Confirmed stock: ${s.confirmedStock} ${match.unitLabel}(s)\n` +
        `• Usage: ${s.dailyUnits} ${match.unitLabel}(s)/day\n` +
        `• Reorder threshold: ${match.reorderThreshold}\n` +
        `• Estimated days remaining: ${s.daysRemaining ?? "not available"}\n` +
        `• Last confirmed: ${new Date(match.lastConfirmedAt).toLocaleDateString()}\n` +
        (s.lowStock ? "⚠ This medicine is at or below your reorder threshold." : "") +
        (match.dosageSchedule
          ? `\n• Your saved dosage schedule: ${match.dosageSchedule}`
          : "") +
        "\n\nI can only report the information you entered; I do not give dosage advice.",
    };
  }
  return { reply: buildStockSummary(medicines) };
}

async function respondToLowStock(userId) {
  const medicines = await prisma.medicine.findMany({
    where: { userId, isActive: true },
    orderBy: { name: "asc" },
  });
  const low = medicines.filter((m) => serializeMedicine(m).lowStock);
  if (low.length === 0) {
    return {
      reply:
        "Good news — none of your active medicines are at or below their reorder threshold right now. Ask me “how many tablets do I have left?” for current estimates.",
    };
  }
  const lines = low.map((m) => {
    const s = serializeMedicine(m);
    return `• **${medicineLabel(m)}**: ~${s.estimatedStock} ${m.unitLabel}(s) left (threshold ${m.reorderThreshold})`;
  });
  return {
    reply: `These medicines need attention:\n${lines.join("\n")}\n\nYou can create a replenishment request from the Pharmacies page.`,
  };
}

async function respondToPendingRequests(userId) {
  const active = await prisma.replenishmentRequest.findMany({
    where: {
      customerId: userId,
      status: {
        in: ["PENDING", "ACCEPTED", "COUNTER_PROPOSED", "CUSTOMER_ACCEPTED", "FULFILLED"],
      },
    },
    include: { pharmacy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (active.length === 0) {
    return { reply: "You have no active replenishment requests right now." };
  }

  const lines = active.map(
    (r) =>
      `• **${r.medicineName}** — ${r.quantityProposed ?? r.quantityRequested} ${r.unitLabel}(s) at ${r.pharmacy.name} — status: ${r.status.replaceAll("_", " ").toLowerCase()}`,
  );
  return { reply: `Your active requests:\n${lines.join("\n")}` };
}

async function respondToPharmacySearch(userId, message) {
  const medicines = await prisma.medicine.findMany({
    where: { userId, isActive: true },
  });
  const term = extractSearchedMedicine(message, medicines);
  if (!term) {
    return {
      reply:
        "Which medicine should I look for? For example: “Find a pharmacy listing Amoxicillin”.",
    };
  }

  const pharmacies = await prisma.pharmacy.findMany({
    where: {
      isActive: true,
      isApproved: true,
      catalog: {
        some: {
          name: { contains: term, mode: "insensitive" },
          isAvailable: true,
          quantityAvailable: { gt: 0 },
        },
      },
    },
    include: {
      catalog: {
        where: { name: { contains: term, mode: "insensitive" } },
        orderBy: { quantityAvailable: "desc" },
      },
    },
    take: 6,
  });

  if (pharmacies.length === 0) {
    return {
      reply: `No registered pharmacy currently lists “${term}” as available. You can still browse the pharmacy directory and send a request to ask about availability.`,
    };
  }

  const lines = pharmacies.map((p) => {
    const items = p.catalog
      .map(
        (c) =>
          `${c.quantityAvailable} ${c.unitLabel}(s)${c.price != null ? ` at ${money(c.price)}` : ""}`,
      )
      .join(", ");
    return `• **${p.name}** (${p.city}) — ${items}`;
  });

  return {
    reply: `Registered pharmacies listing “${term}”: \n${lines.join("\n")}\n\nAvailability is supplied by pharmacists and can change. Submit a request for confirmation.`,
  };
}

function parseInventoryIntent(message) {
  const lower = message.toLowerCase();
  const purchaseIntent =
    /(purchased|bought|received|added|got|refilled|restocked|picked up)/i.test(lower) ||
    /([+-]\s*\d+)/.test(message);
  const correctionIntent =
    /(set|correct|update|change|only have|actually have|should be)/i.test(lower) &&
    /(stock|tablet|capsule|pill|unit|left|have|inventory)/i.test(lower);

  if (correctionIntent) return "CORRECTION";
  if (purchaseIntent) return "ADD_STOCK";
  return null;
}

async function respondToInventoryUpdate(userId, message) {
  const intent = parseInventoryIntent(message);
  if (!intent) return null;

  const quantity = extractQuantity(message);
  const medicines = await prisma.medicine.findMany({
    where: { userId, isActive: true },
    orderBy: { name: "asc" },
  });

  if (medicines.length === 0) {
    return {
      reply:
        "You do not have any active medicines to update yet. Add the medicine first, then tell me about the purchase.",
    };
  }

  const { match, ambiguous } = pickMedicine(message, medicines);
  if (ambiguous.length > 1) {
    return {
      reply: `I found multiple matching medicines: ${ambiguous
        .map((m) => medicineLabel(m))
        .join(", ")}. Please include the exact name and strength.`,
    };
  }
  if (!match) {
    return {
      reply:
        "Which medicine is this for? I can only update medicines already in your inventory:\n" +
        medicines.map((m) => `• ${medicineLabel(m)}`).join("\n"),
    };
  }

  if (intent === "ADD_STOCK") {
    if (!quantity || quantity <= 0) {
      return {
        reply: `How many ${match.unitLabel}(s) of ${medicineLabel(match)} did you purchase? For example: “I purchased 10 more tablets of ${match.name}”.`,
      };
    }

    await prisma.aiPendingAction.updateMany({
      where: { userId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    const action = await prisma.aiPendingAction.create({
      data: {
        userId,
        medicineId: match.id,
        type: "ADD_STOCK",
        payload: { quantity },
        expiresAt: new Date(Date.now() + ACTION_TTL_MINUTES * 60 * 1000),
      },
    });

    const s = serializeMedicine(match);
    return {
      reply:
        `I can record a purchase of **${quantity} ${match.unitLabel}(s)** of **${medicineLabel(match)}**.\n` +
        `Current confirmed stock: ${s.confirmedStock}. New confirmed stock would be ${s.confirmedStock + quantity}.\n\n` +
        "Confirm below to save this. Stock is only updated after you confirm.",
      action: {
        id: action.id,
        type: "ADD_STOCK",
        medicine: {
          id: match.id,
          name: medicineLabel(match),
          unitLabel: match.unitLabel,
        },
        quantity,
        summary: `Add ${quantity} ${match.unitLabel}(s) to ${medicineLabel(match)}`,
      },
    };
  }

  const targetStock = wantedTargetStock(message);
  if (targetStock == null) {
    return {
      reply: `What should the confirmed stock of ${medicineLabel(match)} be? For example: “set ${match.name} stock to 24”.`,
    };
  }
  if (targetStock === match.confirmedStock) {
    return {
      reply: `Confirmed stock for ${medicineLabel(match)} is already ${targetStock}. No change needed.`,
    };
  }

  await prisma.aiPendingAction.updateMany({
    where: { userId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  const action = await prisma.aiPendingAction.create({
    data: {
      userId,
      medicineId: match.id,
      type: "CORRECTION",
      payload: { targetStock },
      expiresAt: new Date(Date.now() + ACTION_TTL_MINUTES * 60 * 1000),
    },
  });

  return {
    reply:
      `I can correct **${medicineLabel(match)}** to **${targetStock} ${match.unitLabel}(s)** confirmed stock (was ${match.confirmedStock}).\n\n` +
      "Confirm below to save this correction. Nothing changes until you confirm.",
    action: {
      id: action.id,
      type: "CORRECTION",
      medicine: {
        id: match.id,
        name: medicineLabel(match),
        unitLabel: match.unitLabel,
      },
      targetStock,
      summary: `Set ${medicineLabel(match)} confirmed stock to ${targetStock}`,
    },
  };
}

async function composeReply(userId, message) {
  const text = message.trim();
  const lower = text.toLowerCase();

  const wantsDosageChange =
    /(increase|decrease|change|adjust|stop|start|skip|double|reduce|lower|raise).{0,35}(dose|dosage|tablet|capsule|medicine|medication)/i.test(
      text,
    ) ||
    /(should i|can i|is it safe to).{0,25}(take|stop|skip|increase|decrease|double)/i.test(
      text,
    );

  if (wantsDosageChange) {
    return {
      reply:
        "I cannot recommend or change medication dosages. Please follow the schedule your doctor or pharmacist supplied, and contact them with any dosage questions. I can still help you track stock and replenishment.",
    };
  }

  if (
    /(diagnos|side effect|symptom|prescri|what should i take|medical advice|is it safe|treat|allergic)/i.test(
      lower,
    )
  ) {
    return {
      reply:
        "I am not able to provide medical advice, diagnoses, or treatment guidance. Please consult a qualified healthcare professional. I can help you check stock, low-stock medicines, pharmacy availability, and replenishment requests.",
    };
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(lower)) {
    return {
      reply: `Hello! I am the TakeCare demo assistant. ${HELP}`,
    };
  }

  if (/(pending|active|my).{0,12}requests?|request status|where is my (order|request)/i.test(lower)) {
    return respondToPendingRequests(userId);
  }

  if (/(running low|low stock|running out|refill soon|below threshold|need to reorder)/i.test(lower)) {
    return respondToLowStock(userId);
  }

  if (/(pharmacy|pharmacies|chemist|drugstore)/i.test(lower) && /(find|show|search|list|which|available|listing|near)/i.test(lower)) {
    return respondToPharmacySearch(userId, text);
  }

  const inventoryReply = await respondToInventoryUpdate(userId, text);
  if (inventoryReply) return inventoryReply;

  if (/(how many|how much|stock|left|remaining|quantity|do i have|inventory)/i.test(lower)) {
    return respondToStock(userId, text);
  }

  if (/(my medicines|list medicines|what medicines|show medicines|inventory list)/i.test(lower)) {
    return respondToStock(userId, text);
  }

  if (/(help|what can you do|commands)/i.test(lower)) {
    return { reply: HELP };
  }

  if (/(dosage schedule|dose schedule|when should i take|my schedule)/i.test(lower)) {
    const medicines = await prisma.medicine.findMany({
      where: { userId, isActive: true },
    });
    const withSchedule = medicines.filter((m) => m.dosageSchedule);
    if (withSchedule.length === 0) {
      return {
        reply:
          "You have not saved a dosage schedule for any medicine. You can add the schedule supplied by your doctor in the medicine form. I cannot recommend a schedule.",
      };
    }
    return {
      reply:
        "Here are the schedules you saved:\n" +
        withSchedule
          .map((m) => `• **${medicineLabel(m)}**: ${m.dosageSchedule}`)
          .join("\n") +
        "\n\nThese are your own notes, not medical advice.",
    };
  }

  return {
    reply: `I did not quite catch that. ${HELP}`,
    suggestions: [
      "Which medicines are running low?",
      "How many tablets do I have left?",
      "Show my pending requests",
    ],
  };
}

export async function handleChat(userId, message) {
  await prisma.chatMessage.create({
    data: { userId, role: "USER", content: message },
  });

  const result = await composeReply(userId, message);
  const assistantMessage = await prisma.chatMessage.create({
    data: { userId, role: "ASSISTANT", content: result.reply },
  });

  return {
    mode: AI_MODE,
    reply: result.reply,
    action: result.action ?? null,
    suggestions: result.suggestions ?? [],
    messageId: assistantMessage.id,
  };
}

export async function confirmAiAction(userId, actionId) {
  const action = await prisma.aiPendingAction.findFirst({
    where: { id: actionId, userId },
  });
  if (!action) throw notFound("This action no longer exists");
  if (action.status !== "PENDING") {
    throw conflict("This action has already been resolved");
  }
  if (action.expiresAt < new Date()) {
    await prisma.aiPendingAction.update({
      where: { id: action.id },
      data: { status: "CANCELLED" },
    });
    throw conflict("This confirmation expired. Please ask again.");
  }

  const medicine = action.medicineId
    ? await prisma.medicine.findFirst({
        where: { id: action.medicineId, userId },
      })
    : null;
  if (!medicine) throw notFound("The medicine for this action no longer exists");

  const payload = action.payload ?? {};
  const previousStock = medicine.confirmedStock;
  const now = new Date();

  let newStock;
  let type;
  let note;

  if (action.type === "ADD_STOCK") {
    const quantity = Number(payload.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw badRequest("This action has an invalid quantity");
    }
    newStock = previousStock + quantity;
    type = "PURCHASE";
    note = "Purchase recorded via TakeCare assistant (user confirmed)";
  } else {
    const targetStock = Number(payload.targetStock);
    if (!Number.isInteger(targetStock) || targetStock < 0) {
      throw badRequest("This action has an invalid target stock");
    }
    newStock = targetStock;
    type = "CORRECTION";
    note = "Manual correction via TakeCare assistant (user confirmed)";
  }

  if (newStock === previousStock) {
    await prisma.aiPendingAction.update({
      where: { id: action.id },
      data: { status: "CANCELLED" },
    });
    return {
      message: "No change was needed, so nothing was updated.",
      medicine: serializeMedicine(medicine),
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.aiPendingAction.updateMany({
      where: { id: action.id, userId, status: "PENDING" },
      data: { status: "CONFIRMED" },
    });
    if (claimed.count !== 1) {
      throw conflict("This action has already been resolved");
    }

    const result = await tx.medicine.update({
      where: { id: medicine.id },
      data: {
        confirmedStock: newStock,
        lastConfirmedAt: now,
        lowStockNotified: newStock > medicine.reorderThreshold ? false : medicine.lowStockNotified,
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        medicineId: medicine.id,
        type,
        quantityChange: newStock - previousStock,
        previousStock,
        newStock,
        note,
        createdAt: now,
      },
    });

    await logActivity(
      {
        userId,
        type: type === "PURCHASE" ? "PURCHASE" : "CORRECTION",
        message:
          type === "PURCHASE"
            ? `Assistant recorded a confirmed purchase of ${newStock - previousStock} ${medicine.unitLabel}(s) of ${medicine.name}.`
            : `Assistant corrected ${medicine.name} stock from ${previousStock} to ${newStock}.`,
      },
      tx,
    );

    return result;
  });

  await notifyLowStockForUser(userId);

  return {
    message:
      type === "PURCHASE"
        ? `Saved. ${medicine.name} confirmed stock is now ${newStock} ${medicine.unitLabel}(s).`
        : `Saved. ${medicine.name} confirmed stock was corrected to ${newStock} ${medicine.unitLabel}(s).`,
    medicine: serializeMedicine(updated),
  };
}

export async function cancelAiAction(userId, actionId) {
  const result = await prisma.aiPendingAction.updateMany({
    where: { id: actionId, userId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  if (result.count !== 1) {
    throw conflict("This action has already been resolved or does not exist");
  }
  return { message: "Cancelled. Your inventory was not changed." };
}

export async function getChatHistory(userId) {
  return prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}
