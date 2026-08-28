import { z } from 'zod';

import { instantSchema } from '../domain/common/time';
import { type StudyData, studyDataSchema } from '../domain/study/study-data';

export const currentExportFormatVersion = 2 as const;

export const studyExportSchema = z.object({
  format: z.literal('dose-shift'),
  version: z.literal(currentExportFormatVersion),
  exportedAt: instantSchema,
  applicationVersion: z.string().trim().min(1),
  studyData: z.array(studyDataSchema)
}).strict().readonly();

export type StudyExport = z.infer<typeof studyExportSchema>;

export function parseStudyExport(value: unknown): StudyExport {
  return studyExportSchema.parse(value);
}

export function createStudyExport(
  studyData: readonly StudyData[],
  exportedAt: z.input<typeof instantSchema>,
  applicationVersion: string
): StudyExport {
  return studyExportSchema.parse({
    format: 'dose-shift',
    version: currentExportFormatVersion,
    exportedAt,
    applicationVersion,
    studyData
  });
}

export function serializeStudyExport(studyExport: StudyExport): string {
  return JSON.stringify(studyExportSchema.parse(studyExport));
}

export function parseStudyExportJson(serialized: string): StudyExport {
  return parseStudyExport(JSON.parse(serialized) as unknown);
}
