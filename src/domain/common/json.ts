import { z } from 'zod';

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(z.string(), jsonValueSchema)
]));

export const jsonObjectSchema = z.record(z.string(), jsonValueSchema).readonly();

export type JsonObject = z.infer<typeof jsonObjectSchema>;
