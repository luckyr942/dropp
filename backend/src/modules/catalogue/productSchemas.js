import { z } from 'zod';

const availability = z.enum(['in_stock', 'out_of_stock', 'discontinued']);

const base = z.object({
    name: z.string().trim().min(2).max(120),
    nameAliases: z.array(z.string().trim().toLowerCase().min(1).max(50)).max(10).optional(),
    category: z.string().trim().min(2).max(60).optional(),
    price: z.coerce.number().min(0).max(10_000_000),
    discountPrice: z.coerce.number().min(0).nullable().optional(),
    unit: z.string().trim().max(30).optional(),
    stockQuantity: z.coerce.number().int().min(0).max(1_000_000),
    availability: availability.optional(),
    description: z.string().trim().max(1000).optional(),
    image: z.string().trim().url().optional(),
    isVeg: z.boolean().optional(),
});

export const createProductSchema = base;

export const updateProductSchema = base
    .partial()
    .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export const availabilitySchema = z.object({ availability });

export const stockAdjustSchema = z.object({
    delta: z.coerce.number().int().refine((n) => n !== 0, 'delta cannot be 0'),
});

export const listProductsQuerySchema = z.object({
    category: z.string().trim().optional(),
    availability: availability.optional(),
    search: z.string().trim().max(60).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
});