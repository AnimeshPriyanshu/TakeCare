export function titleCase(value = "") {
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function medicineLabel(medicine) {
  if (!medicine) return "";
  return medicine.strength ? `${medicine.name} ${medicine.strength}` : medicine.name;
}

export function unitLabel(medicine, count) {
  const unit = medicine?.unitLabel || "unit";
  return count === 1 ? unit : `${unit}s`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

export function formatCurrency(value) {
  if (value == null) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(value) {
  if (!value) return "—";
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export const REQUEST_STATUS = {
  PENDING: {
    label: "Pending",
    tone: "amber",
    description: "Waiting for the pharmacist to review.",
  },
  ACCEPTED: {
    label: "Accepted",
    tone: "sky",
    description: "The pharmacist accepted your request.",
  },
  REJECTED: {
    label: "Rejected",
    tone: "rose",
    description: "The pharmacist could not fulfil this request.",
  },
  COUNTER_PROPOSED: {
    label: "Quantity proposed",
    tone: "violet",
    description: "The pharmacist proposed a different quantity. Review it.",
  },
  CUSTOMER_ACCEPTED: {
    label: "Offer accepted",
    tone: "indigo",
    description: "You accepted the proposed quantity. Awaiting fulfilment.",
  },
  CUSTOMER_DECLINED: {
    label: "Offer declined",
    tone: "slate",
    description: "You declined the proposed quantity.",
  },
  FULFILLED: {
    label: "Ready to confirm",
    tone: "emerald",
    description: "Confirm receipt to update your inventory.",
  },
  COMPLETED: {
    label: "Completed",
    tone: "teal",
    description: "Receipt confirmed and inventory updated.",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "slate",
    description: "This request was cancelled.",
  },
};

export const ACTIVE_REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "COUNTER_PROPOSED",
  "CUSTOMER_ACCEPTED",
  "FULFILLED",
];

export const TRANSACTION_META = {
  INITIAL: { label: "Initial stock", tone: "sky" },
  PURCHASE: { label: "Purchase", tone: "emerald" },
  CORRECTION: { label: "Correction", tone: "amber" },
  REQUEST_FULFILLMENT: { label: "Request received", tone: "teal" },
};

export function isActiveRequest(status) {
  return ACTIVE_REQUEST_STATUSES.includes(status);
}

export function requestProgress(status) {
  const steps = ["Requested", "Pharmacist response", "Fulfilment", "Receipt confirmed"];
  if (status === "PENDING") return 1;
  if (["ACCEPTED", "REJECTED", "COUNTER_PROPOSED"].includes(status)) return 2;
  if (status === "CUSTOMER_ACCEPTED") return 2;
  if (["CUSTOMER_DECLINED", "CANCELLED"].includes(status)) return 2;
  if (status === "FULFILLED") return 3;
  if (status === "COMPLETED") return 4;
  return steps.length;
}
