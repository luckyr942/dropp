import { z } from 'zod';
import { normalizeIndianPhone } from './phone.js';

export const indianPhone = z
    .string()
    .trim()
    .refine((v) => normalizeIndianPhone(v) !== null, 'Enter a valid Indian mobile number')
    .transform((v) => normalizeIndianPhone(v));

export const optionalEmail = z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('').transform(() => undefined));