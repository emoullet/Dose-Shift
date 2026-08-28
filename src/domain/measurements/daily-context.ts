import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';
import { instantSchema, localDateSchema } from '../common/time';

const contextualFlagSchema = z.discriminatedUnion('present', [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    note: z.string().trim().min(1).optional()
  }).strict()
]).readonly();

const unusualPainSchema = z.discriminatedUnion('present', [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    severityScore: z.number().int().min(0).max(10).optional(),
    note: z.string().trim().min(1).optional()
  }).strict()
]).readonly();

export const dailyAnalysisSchema = z.discriminatedUnion('flag', [
  z.object({ flag: z.literal('normal') }).strict(),
  z.object({
    flag: z.enum(['atypical', 'exclude_from_primary_analysis']),
    reason: z.string().trim().min(1)
  }).strict()
]).readonly();

export const dailyContextSchema = z.object({
  id: entityIdSchema,
  studyId: entityIdSchema,
  localDate: localDateSchema,
  bedtime: instantSchema,
  wakeTime: instantSchema,
  sleepQualityScore: z.number().int().min(0).max(10),
  unusualPain: unusualPainSchema,
  unusualPhysicalActivity: contextualFlagSchema,
  unusualLargeOrShiftedMeal: contextualFlagSchema,
  urinaryOrInfectionSymptoms: contextualFlagSchema,
  concomitantTreatmentChange: contextualFlagSchema,
  analysis: dailyAnalysisSchema,
  generalNote: z.string().trim().min(1).optional(),
  ...auditMetadataFields
})
  .strict()
  .superRefine((context, issueContext) => {
    if (Date.parse(context.wakeTime) < Date.parse(context.bedtime)) {
      issueContext.addIssue({
        code: 'custom',
        path: ['wakeTime'],
        message: 'wakeTime must not precede bedtime'
      });
    }
  })
  .readonly();

export type DailyAnalysis = z.infer<typeof dailyAnalysisSchema>;
export type DailyContext = z.infer<typeof dailyContextSchema>;
