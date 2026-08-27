import { z } from 'zod';

import { instantSchema } from '../domain/common/time';
import { studySchema } from '../domain/study/study';

export const currentExportFormatVersion = 1 as const;

export const studyExportSchema = z.object({
  format: z.literal('dose-shift'),
  version: z.literal(currentExportFormatVersion),
  exportedAt: instantSchema,
  studies: z.array(studySchema)
}).readonly();

export type StudyExport = z.infer<typeof studyExportSchema>;

export function parseStudyExport(value: unknown): StudyExport {
  return studyExportSchema.parse(value);
}
