import { z } from 'zod';
import { HttpError } from './errors.js';
import { LISTING_TYPES } from './models/listing.js';

const location = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createListingSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  price: z.number().positive(),
  type: z.enum(LISTING_TYPES),
  bedrooms: z.number().int().min(0).max(50),
  location,
  agentId: z.string().trim().min(1).max(100),
});

export const updateListingSchema = createListingSchema
  .extend({ location: location.partial() })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });

export const idParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid listing id'),
});

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const listQuerySchema = z.object(pagination);

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type Pagination = z.infer<typeof listQuerySchema>;

export function validate<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || null,
      message: issue.message,
    }));
    throw new HttpError(400, 'Validation failed', details);
  }
  return result.data;
}
