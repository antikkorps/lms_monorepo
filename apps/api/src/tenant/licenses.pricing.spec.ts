import { describe, it, expect } from 'vitest';
import { calculateLicensePrice } from './licenses.pricing.js';
import type { VolumeDiscountTier } from '../database/models/Tenant.js';

const defaultTiers: VolumeDiscountTier[] = [
  { minSeats: 50, discountPercent: 30 },
  { minSeats: 20, discountPercent: 20 },
  { minSeats: 10, discountPercent: 10 },
];

describe('calculateLicensePrice', () => {
  describe('unlimited license', () => {
    it('should calculate unlimited price as coursePrice * multiplier', () => {
      const result = calculateLicensePrice(100, 'unlimited', null, defaultTiers);
      expect(result.totalPrice).toBe(1000);
      expect(result.discountPercent).toBe(0);
      expect(result.savings).toBe(0);
      expect(result.seats).toBeNull();
    });
  });

  describe('seats license with default tiers', () => {
    it('should apply no discount for less than 10 seats', () => {
      const result = calculateLicensePrice(100, 'seats', 5, defaultTiers);
      expect(result.pricePerSeat).toBe(100);
      expect(result.totalPrice).toBe(500);
      expect(result.discountPercent).toBe(0);
      expect(result.savings).toBe(0);
    });

    it('should apply 10% discount for 10+ seats', () => {
      const result = calculateLicensePrice(100, 'seats', 10, defaultTiers);
      expect(result.pricePerSeat).toBe(90);
      expect(result.totalPrice).toBe(900);
      expect(result.discountPercent).toBe(10);
      expect(result.savings).toBe(100);
    });

    it('should apply 20% discount for 20+ seats', () => {
      const result = calculateLicensePrice(100, 'seats', 25, defaultTiers);
      expect(result.pricePerSeat).toBe(80);
      expect(result.totalPrice).toBe(2000);
      expect(result.discountPercent).toBe(20);
      expect(result.savings).toBe(500);
    });

    it('should apply 30% discount for 50+ seats', () => {
      const result = calculateLicensePrice(100, 'seats', 50, defaultTiers);
      expect(result.pricePerSeat).toBe(70);
      expect(result.totalPrice).toBe(3500);
      expect(result.discountPercent).toBe(30);
      expect(result.savings).toBe(1500);
    });

    it('should default to 1 seat when seats is null', () => {
      const result = calculateLicensePrice(100, 'seats', null, defaultTiers);
      expect(result.seats).toBe(1);
      expect(result.totalPrice).toBe(100);
    });
  });

  describe('seats license with custom tenant tiers', () => {
    const customTiers: VolumeDiscountTier[] = [
      { minSeats: 5, discountPercent: 15 },
      { minSeats: 25, discountPercent: 40 },
    ];

    it('should use custom tiers when provided', () => {
      const result = calculateLicensePrice(100, 'seats', 5, customTiers);
      expect(result.discountPercent).toBe(15);
      expect(result.pricePerSeat).toBe(85);
    });

    it('should apply highest matching custom tier', () => {
      const result = calculateLicensePrice(100, 'seats', 30, customTiers);
      expect(result.discountPercent).toBe(40);
      expect(result.pricePerSeat).toBe(60);
      expect(result.totalPrice).toBe(1800);
    });
  });

  describe('fallback with empty tiers', () => {
    it('should apply no discount when tiers array is empty', () => {
      const result = calculateLicensePrice(100, 'seats', 100, []);
      expect(result.discountPercent).toBe(0);
      expect(result.pricePerSeat).toBe(100);
      expect(result.totalPrice).toBe(10000);
    });
  });

  describe('rounding', () => {
    it('should round to 2 decimal places', () => {
      const result = calculateLicensePrice(99.99, 'seats', 10, defaultTiers);
      // 99.99 * 0.9 = 89.991 → 89.99
      expect(result.pricePerSeat).toBe(89.99);
      // 89.99 * 10 = 899.9 → 899.9
      expect(result.totalPrice).toBe(899.91);
    });
  });

  describe('tiers included in result', () => {
    it('should include tiers in the result', () => {
      const result = calculateLicensePrice(100, 'seats', 10, defaultTiers);
      expect(result.tiers).toEqual(defaultTiers);
    });
  });
});
