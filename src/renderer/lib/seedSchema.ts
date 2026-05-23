import { z } from 'zod';

import {
  BLOOD_TYPE,
  GENDER,
  HOUSEHOLD_TYPE,
  LIFE_STAGE,
  MARITAL_STATUS,
  RHESUS,
} from '@shared/enums';

// Role is intentionally NOT a Zod enum here. The `roles` lookup table is the
// single source of truth (see CLAUDE.md / project memory). At seed-import time
// the role value is checked against seeded `roles.name` rows separately, after
// the roles master list has been committed.
const RoleName = z.string().nullable();

const MemberSchema = z.object({
  full_name: z.string().min(2),
  nickname: z.string().nullable(),
  gender: z.enum(GENDER),
  life_stage: z.enum(LIFE_STAGE),
  marital_status: z.enum(MARITAL_STATUS),
  blood_type: z.enum(BLOOD_TYPE),
  rhesus: z.enum(RHESUS),
  birth_place: z.string().nullable(),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  is_head: z.boolean(),
  is_active: z.boolean(),
  role: RoleName,
});

const HouseholdSchema = z
  .object({
    household_no: z.string().regex(/^\d{3}$/),
    type: z.enum(HOUSEHOLD_TYPE),
    address: z.string().nullable(),
    members: z.array(MemberSchema).min(1),
  })
  .refine((h) => h.members.filter((m) => m.is_head).length === 1, {
    message: 'Exactly one is_head per household',
  });

export const SeedSchema = z.object({
  version: z.literal('1.0.0'),
  kelompok: z.object({ name: z.string(), region: z.string() }),
  households: z.array(HouseholdSchema).min(1),
});

export type Seed = z.infer<typeof SeedSchema>;
export type SeedMember = z.infer<typeof MemberSchema>;
export type SeedHousehold = z.infer<typeof HouseholdSchema>;
