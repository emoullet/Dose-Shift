import { z } from 'zod';

import { entityIdSchema } from '../common/identity';
import { instantSchema, timeZoneSchema } from '../common/time';

export const studySchema = z.object({
  id: entityIdSchema,
  protocolVersion: z.string().trim().min(1),
  timeZone: timeZoneSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema
}).readonly();

export type Study = z.infer<typeof studySchema>;
