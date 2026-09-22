/**
 * Authoritative WINRIDER.AI fare calculation.
 * Keep the customer-facing fare formula in one place and reuse it for
 * booking preview, server validation, and the client persistence fallback.
 */
export type FareAddons = {
  expressBoxBaht?: number;
  dreamRideBaht?: number;
  amenitiesBaht?: number;
  serviceAddonBaht?: number;
};

export type ServerFareQuote = {
  serviceId: string;
  distanceKm: number;
  baseFareBaht: number;
  serviceSurchargeBaht: number;
  fareBaht: number;
  addons: FareAddons;
};

export function calculateBaseFareBaht(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0 || distanceKm > 500) throw new Error("INVALID_DISTANCE");
  const normalizedDistance = Math.round(distanceKm * 100) / 100;
  const distanceFareBaht = normalizedDistance <= 1 ? 0 : Math.round((normalizedDistance - 1) * 7.5);
  // WINRIDER.AI app rule: 15 baht base + distance fare + 5 baht protection fund.
  return 15 + distanceFareBaht + 5;
}

function normalizeAddon(value: number | undefined, name: string): number {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) throw new Error("INVALID_" + name);
  return Math.round(amount * 100) / 100;
}

export function calculateAppFare(serviceId: string, distanceKm: number, addons: FareAddons = {}): ServerFareQuote {
  const normalizedDistance = Math.round(distanceKm * 100) / 100;
  const baseFareBaht = calculateBaseFareBaht(normalizedDistance);
  const normalizedAddons: FareAddons = {
    expressBoxBaht: normalizeAddon(addons.expressBoxBaht, "EXPRESS_BOX"),
    dreamRideBaht: normalizeAddon(addons.dreamRideBaht, "DREAM_RIDE"),
    amenitiesBaht: normalizeAddon(addons.amenitiesBaht, "AMENITIES"),
    serviceAddonBaht: normalizeAddon(addons.serviceAddonBaht, "SERVICE_ADDON"),
  };
  const addonTotal = Object.values(normalizedAddons).reduce((sum, value) => sum + Number(value || 0), 0);
  return {
    serviceId,
    distanceKm: normalizedDistance,
    baseFareBaht,
    serviceSurchargeBaht: 0,
    fareBaht: Math.round((baseFareBaht + addonTotal) * 100) / 100,
    addons: normalizedAddons,
  };
}

/** Backward-compatible helper for existing callers. */
export function calculateServerFare(serviceId: string, distanceKm: number): ServerFareQuote {
  return calculateAppFare(serviceId, distanceKm, { expressBoxBaht: serviceId === "express" ? 5 : 0 });
}
