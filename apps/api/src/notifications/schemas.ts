import { z } from 'zod';
import { DigestFrequency, NotificationType } from '../database/models/enums.js';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

export const updatePreferencesSchema = z.object({
  emailEnabled: z
    .record(z.nativeEnum(NotificationType), z.boolean())
    .optional(),
  inAppEnabled: z
    .record(z.nativeEnum(NotificationType), z.boolean())
    .optional(),
  digestFrequency: z.nativeEnum(DigestFrequency).optional(),
  digestDay: z.number().int().min(0).max(6).optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
