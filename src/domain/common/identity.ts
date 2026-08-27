import { z } from 'zod';

export const entityIdSchema = z.uuid().brand<'EntityId'>();

export type EntityId = z.infer<typeof entityIdSchema>;

export function createEntityId(): EntityId {
  return entityIdSchema.parse(crypto.randomUUID());
}
