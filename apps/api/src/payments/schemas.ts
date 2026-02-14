import { z } from 'zod';
import { sanitizeText } from '../utils/sanitize.js';

export const createCourseCheckoutSchema = z.object({
  courseId: z.string().uuid(),
});

export const verifyPurchaseSchema = z.object({
  sessionId: z.string().min(1),
});

export const processRefundSchema = z.object({
  reason: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v ? sanitizeText(v) : v)
    .describe('Reason for the refund (stored in database)'),
  amount: z
    .number()
    .positive()
    .optional()
    .describe('Amount in cents for partial refund. Omit for full refund.'),
  stripeReason: z
    .enum(['duplicate', 'fraudulent', 'requested_by_customer'])
    .optional()
    .default('requested_by_customer')
    .describe('Stripe refund reason code'),
});

// Refund request schemas (for learners)
export const requestRefundSchema = z.object({
  reason: z
    .string()
    .min(10, 'Please provide a reason (at least 10 characters)')
    .max(1000)
    .transform(sanitizeText)
    .describe('Reason for requesting a refund'),
});

// Admin refund request review
export const reviewRefundRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v ? sanitizeText(v) : v)
    .describe('Reason for rejection (required if rejecting)'),
});

export type CreateCourseCheckoutBody = z.infer<typeof createCourseCheckoutSchema>;
export type VerifyPurchaseBody = z.infer<typeof verifyPurchaseSchema>;
export type ProcessRefundBody = z.infer<typeof processRefundSchema>;
export type RequestRefundBody = z.infer<typeof requestRefundSchema>;
export type ReviewRefundRequestBody = z.infer<typeof reviewRefundRequestSchema>;
