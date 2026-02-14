import { config } from '../config/index.js';
import type { VolumeDiscountTier } from '../database/models/Tenant.js';
import type { LicenseType } from '../database/models/enums.js';

export interface LicensePriceResult {
  coursePrice: number;
  licenseType: LicenseType | string;
  seats: number | null;
  pricePerSeat: number;
  totalPrice: number;
  discountPercent: number;
  savings: number;
  tiers: VolumeDiscountTier[];
}

/**
 * Get applicable discount tiers for a tenant.
 * Uses tenant-specific overrides if set, otherwise falls back to global config defaults.
 */
export async function getDiscountTiers(tenantId: string): Promise<VolumeDiscountTier[]> {
  const { Tenant } = await import('../database/models/Tenant.js');
  const tenant = await Tenant.findByPk(tenantId, { attributes: ['settings'] });
  if (tenant?.settings?.volumeDiscountTiers?.length) {
    return [...tenant.settings.volumeDiscountTiers].sort((a, b) => b.minSeats - a.minSeats);
  }
  return [...config.licensing.volumeDiscountTiers].sort((a, b) => b.minSeats - a.minSeats);
}

/**
 * Calculate the price for a license purchase.
 * Supports both unlimited and seats-based license types with volume discounts.
 */
export function calculateLicensePrice(
  coursePrice: number,
  licenseType: LicenseType | string,
  seats: number | null,
  tiers: VolumeDiscountTier[]
): LicensePriceResult {
  if (licenseType === 'unlimited') {
    const totalPrice = coursePrice * config.licensing.unlimitedMultiplier;
    return {
      coursePrice,
      licenseType,
      seats: null,
      pricePerSeat: totalPrice,
      totalPrice,
      discountPercent: 0,
      savings: 0,
      tiers,
    };
  }

  const seatCount = seats || 1;
  const sortedTiers = [...tiers].sort((a, b) => b.minSeats - a.minSeats);

  let discountPercent = 0;
  for (const tier of sortedTiers) {
    if (seatCount >= tier.minSeats) {
      discountPercent = tier.discountPercent;
      break;
    }
  }

  const pricePerSeat = coursePrice * (1 - discountPercent / 100);
  const totalPrice = pricePerSeat * seatCount;
  const savings = coursePrice * seatCount - totalPrice;

  return {
    coursePrice,
    licenseType,
    seats: seatCount,
    pricePerSeat: Math.round(pricePerSeat * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    discountPercent,
    savings: Math.round(savings * 100) / 100,
    tiers,
  };
}
