import { z } from 'zod';

export const csvRowSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z
    .enum(['learner', 'instructor', 'manager'])
    .optional()
    .default('learner'),
});

export const csvUploadSchema = z.object({
  rows: z.array(csvRowSchema).min(1, 'At least one row is required').max(500, 'Maximum 500 rows per import'),
});

export type CsvRow = z.infer<typeof csvRowSchema>;
