const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function elapsedDaysSince(date, now = new Date()) {
  const start = new Date(date).getTime();
  const diff = now.getTime() - start;
  if (Number.isNaN(start) || diff <= 0) return 0;
  return Math.floor(diff / MS_PER_DAY);
}

export function computeEstimatedStock(medicine, now = new Date()) {
  const confirmed = Number(medicine.confirmedStock) || 0;
  const daily = Number(medicine.dailyUnits) || 0;
  const days = elapsedDaysSince(medicine.lastConfirmedAt, now);
  const consumed = daily * days;
  return {
    estimatedStock: Math.max(0, confirmed - consumed),
    confirmedStock: confirmed,
    dailyUnits: daily,
    elapsedDays: days,
    consumed,
  };
}

export function isLowStock(medicine, now = new Date()) {
  const { estimatedStock } = computeEstimatedStock(medicine, now);
  return estimatedStock <= Number(medicine.reorderThreshold ?? 0);
}

export function serializeMedicine(medicine, now = new Date()) {
  const stats = computeEstimatedStock(medicine, now);
  return {
    ...medicine,
    ...stats,
    lowStock: stats.estimatedStock <= Number(medicine.reorderThreshold ?? 0),
    daysRemaining:
      stats.dailyUnits > 0 ? Math.floor(stats.estimatedStock / stats.dailyUnits) : null,
  };
}
