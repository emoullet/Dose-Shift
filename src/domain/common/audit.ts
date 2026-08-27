import { z } from 'zod';

import { instantSchema } from './time';

export const auditMetadataFields = {
  createdAt: instantSchema,
  updatedAt: instantSchema
} as const;

export const auditMetadataSchema = z.object(auditMetadataFields)
  .strict()
  .superRefine((value, context) => {
    if (Date.parse(value.updatedAt) < Date.parse(value.createdAt)) {
      context.addIssue({
        code: 'custom',
        path: ['updatedAt'],
        message: 'updatedAt must not precede createdAt'
      });
    }
  })
  .readonly();

export type AuditMetadata = z.infer<typeof auditMetadataSchema>;
