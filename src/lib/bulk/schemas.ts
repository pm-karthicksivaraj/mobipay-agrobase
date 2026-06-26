/**
 * Agrobase V3 — Bulk Import Zod Schemas
 *
 * Exported separately so both the import engine and the validate endpoint can reuse them.
 */

import { z } from 'zod/v4'

export const farmerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z
    .string()
    .min(7, 'Phone must be at least 7 characters')
    .regex(/^[+]?[\d\s\-()]{7,15}$/, 'Invalid phone number format'),
  gender: z.enum(['Male', 'Female', 'Other', 'male', 'female', 'other']).optional().default('Male'),
  member_type: z.enum(['General', 'Commercial', 'general', 'commercial']).optional().default('General'),
  village: z.string().optional(),
  district: z.string().optional(),
  farm_size_hectares: z.coerce.number().positive().optional(),
  main_crops: z.string().optional(),
  group_name: z.string().optional(),
  education: z.enum(['Primary', 'Secondary', 'UG', 'PG', 'Other', 'primary', 'secondary', 'ug', 'pg', 'other']).optional(),
  national_id_no: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_no: z.string().optional(),
  date_of_birth: z.string().optional(),
})

export const purchaseSchema = z.object({
  farmer_phone: z.string().min(7, 'Farmer phone must be at least 7 characters'),
  commodity: z.string().min(1, 'Commodity is required'),
  variety: z.string().optional(),
  quantity: z.string().min(1, 'Quantity is required'),
  unit_price: z.coerce.number().positive('Unit price must be positive').optional(),
  total_amount: z.coerce.number().positive('Total amount must be positive').optional(),
  group_name: z.string().optional(),
  purchase_date: z.string().optional(),
  status: z.enum(['PENDING', 'REVIEWED', 'APPROVED', 'PAID', 'pending', 'reviewed', 'approved', 'paid']).optional(),
})