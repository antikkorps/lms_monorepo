import { z } from 'zod';

export const createCourseCheckoutSchema = z.object({
  courseId: z.string().uuid(),
});

export const verifyPurchaseSchema = z.object({
  sessionId: z.string().min(1),
});

export type CreateCourseCheckoutBody = z.infer<typeof createCourseCheckoutSchema>;
export type VerifyPurchaseBody = z.infer<typeof verifyPurchaseSchema>;
