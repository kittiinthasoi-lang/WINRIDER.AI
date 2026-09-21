/**
 * Authoritative server fare calculation.
 * This module intentionally has no client/UI dependencies so the same formula
 * can be used by order creation, quote validation, and settlement.
 */
export type ServerFareQuote = {
  serviceId: string;
  distanceKm: number;
  baseFareBaht: number;
  serviceSurchargeBaht: number;
  fareBaht: number;
};

const SERVICE_SURCHARGES: Record<string, number> = {
  express: 5,
};

export function calculateServerFare(serviceId: string, distanceKm: number): ServerFareQuote {
  if (!Number.isFinite(distanceKm) || distanceKm < 0 || distanceKm > 500) {
    throw new Error("INVALID_DISTANCE");
  }
  const normalizedDistance = Math.round(distanceKm * 100) / 100;
  const baseFareBaht = 15 + Math.max(0, Math.round((normalizedDistance - 1) * 7.5));
  const serviceSurchargeBaht = SERVICE_SURCHARGES[serviceId] || 0;
  const fareBaht = baseFareBaht + serviceSurchargeBaht + 5;
  return { serviceId, distanceKm: normalizedDistance, baseFareBaht, serviceSurchargeBaht, fareBaht };
}
