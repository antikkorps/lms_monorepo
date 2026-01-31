import { z } from 'zod';

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

export type CreateCourseCheckoutBody = z.infer<typeof createCourseCheckoutSchema>;
export type VerifyPurchaseBody = z.infer<typeof verifyPurchaseSchema>;
export type ProcessRefundBody = z.infer<typeof processRefundSchema>;
