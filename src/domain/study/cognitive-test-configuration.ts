import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';
import { instantSchema } from '../common/time';

const pvtAdministrationConfigurationBaseFields = {
  durationSeconds: z.number().int().positive().optional(),
  device: z.string().trim().min(1),
  responseMethod: z.string().trim().min(1)
} as const;

export const pvtAdministrationConfigurationSchema = z.discriminatedUnion('source', [
  z.object({
    ...pvtAdministrationConfigurationBaseFields,
    source: z.literal('external'),
    implementationVersion: z.string().trim().min(1).optional()
  }).strict(),
  z.object({
    ...pvtAdministrationConfigurationBaseFields,
    source: z.literal('integrated'),
    implementationVersion: z.string().trim().min(1)
  }).strict()
]).readonly();

export const cognitiveTestConfigurationSchema = z.object({
  id: entityIdSchema,
  studyId: entityIdSchema,
  memoryItemCount: z.number().int().positive(),
  memoryDifficultyLevel: z.string().trim().min(1),
  distractorType: z.string().trim().min(1),
  stimulusGenerationRulesVersion: z.string().trim().min(1),
  pvtLapseThresholdMs: z.number().int().positive(),
  pvtAdministration: pvtAdministrationConfigurationSchema,
  frozenAt: instantSchema,
  ...auditMetadataFields
})
  .strict()
  .superRefine((configuration, context) => {
    if (Date.parse(configuration.frozenAt) < Date.parse(configuration.createdAt)) {
      context.addIssue({
        code: 'custom',
        path: ['frozenAt'],
        message: 'frozenAt must not precede creation'
      });
    }
  })
  .readonly();

export type PvtAdministrationConfiguration = z.infer<typeof pvtAdministrationConfigurationSchema>;
export type CognitiveTestConfiguration = z.infer<typeof cognitiveTestConfigurationSchema>;
