import { eq } from 'drizzle-orm';

import { todayISO } from '../../shared/dates';
import type {
  EditMemberInput,
  MemberFilter,
  MemberRow,
  NewMemberInput,
  RecordMovementInput,
} from '../../shared/member';
import type { DB, DBLike } from '../db';
import { households, members, roles } from '../db/schema';
import { eventLogService } from './eventLogService';
import {
  HouseholdNotFoundError,
  householdService,
} from './householdService';

export interface MemberDeps {
  db: DB;
  /** Defaults to () => new Date() for production; injected in tests. */
  clock?: () => Date;
}

export class MemberNotFoundError extends Error {
  constructor(id: number) {
    super(`Jama'ah dengan id ${id} tidak ditemukan`);
    this.name = 'MemberNotFoundError';
  }
}

export class AlreadyInactiveError extends Error {
  constructor(id: number) {
    super(`Jama'ah id ${id} sudah dalam status mutasi`);
    this.name = 'AlreadyInactiveError';
  }
}

export class HeadReassignmentRequiredError extends Error {
  constructor(public readonly householdId: number) {
    super(
      `Jama'ah ini adalah kepala KK ${householdId} — pilih kepala baru sebelum menyimpan.`,
    );
    this.name = 'HeadReassignmentRequiredError';
  }
}

function today(deps: MemberDeps): string {
  return todayISO(deps.clock?.());
}

function buildMemberRows(db: DBLike): MemberRow[] {
  const allMembers = db.select().from(members).all();
  const allRoles = db.select().from(roles).all();
  const allHouseholds = db
    .select({
      id: households.id,
      headMemberId: households.headMemberId,
    })
    .from(households)
    .all();
  return allMembers.map((m) => ({
    id: m.id,
    householdId: m.householdId,
    fullName: m.fullName,
    nickname: m.nickname,
    gender: m.gender,
    lifeStage: m.lifeStage,
    maritalStatus: m.maritalStatus,
    bloodType: m.bloodType,
    rhesus: m.rhesus,
    birthPlace: m.birthPlace,
    birthDate: m.birthDate,
    roleId: m.roleId,
    roleName: m.roleId
      ? (allRoles.find((r) => r.id === m.roleId)?.name ?? null)
      : null,
    isActive: m.isActive,
    isHead: allHouseholds.some(
      (h) => h.id === m.householdId && h.headMemberId === m.id,
    ),
    isSerkiler: m.isSerkiler,
  }));
}

function applyFilter(rows: MemberRow[], filter: MemberFilter): MemberRow[] {
  let out = rows;
  if (filter.activeOnly) out = out.filter((r) => r.isActive);
  if (filter.pengurusOnly) out = out.filter((r) => r.roleId !== null);
  if (filter.lifeStage) out = out.filter((r) => r.lifeStage === filter.lifeStage);
  if (filter.gender) out = out.filter((r) => r.gender === filter.gender);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    out = out.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.nickname?.toLowerCase().includes(q) ?? false),
    );
  }
  return out;
}

function fetchRow(db: DBLike, id: number): MemberRow {
  const row = buildMemberRows(db).find((r) => r.id === id);
  if (!row) throw new MemberNotFoundError(id);
  return row;
}

export const memberService = {
  list(deps: MemberDeps, filter: MemberFilter = {}): MemberRow[] {
    return applyFilter(buildMemberRows(deps.db), filter);
  },

  get(deps: MemberDeps, id: number): MemberRow | null {
    const row = buildMemberRows(deps.db).find((r) => r.id === id);
    return row ?? null;
  },

  /**
   * Tambah Jama'ah. Wraps household resolution, member insert, head-of-new-KK
   * assignment, and the §8 event-log trigger in one transaction.
   */
  addMember(deps: MemberDeps, input: NewMemberInput): MemberRow {
    return deps.db.transaction((tx) => {
      // 1. Resolve household.
      let householdId: number;
      let isNewHouseholdHead = false;
      if (input.household.mode === 'create-new') {
        const hh = householdService.create(tx, {
          type: 'KK-S',
          address: input.household.address ?? null,
        });
        householdId = hh.id;
        isNewHouseholdHead = true;
      } else {
        const target = tx
          .select()
          .from(households)
          .where(eq(households.id, input.household.householdId))
          .get();
        if (!target) {
          throw new HouseholdNotFoundError(input.household.householdId);
        }
        householdId = target.id;
      }

      // 2. Insert member.
      const inserted = tx
        .insert(members)
        .values({
          householdId,
          fullName: input.fullName.trim(),
          nickname: input.nickname?.trim() || null,
          gender: input.gender,
          lifeStage: input.lifeStage,
          maritalStatus: input.maritalStatus,
          bloodType: input.bloodType,
          rhesus: input.rhesus,
          birthPlace: input.birthPlace?.trim() || null,
          birthDate: input.birthDate ?? null,
          roleId: input.roleId ?? null,
          isActive: true,
        })
        .returning({ id: members.id })
        .get();

      // 3. Resolve cycle: new KK gets this member as head.
      if (isNewHouseholdHead) {
        tx.update(households)
          .set({ headMemberId: inserted.id })
          .where(eq(households.id, householdId))
          .run();
      }

      // 4. §8 auto-trigger. Skipped when silentLog=true (Mode Pendataan Awal).
      if (!input.silentLog) {
        const logDate = input.logDate ?? today(deps);
        if (input.logAs === 'Lahir') {
          eventLogService.recordVital(tx, {
            eventType: 'Lahir',
            eventDate: logDate,
            memberId: inserted.id,
            name: input.fullName.trim(),
            gender: input.gender,
            notes: input.logNotes ?? null,
          });
        } else if (input.logAs === 'Sambung Baru') {
          eventLogService.recordMovement(tx, {
            movementType: 'Sambung Baru',
            movementDate: logDate,
            memberId: inserted.id,
            notes: input.logNotes ?? null,
          });
        }
      }

      return fetchRow(tx, inserted.id);
    });
  },

  /**
   * Edit Jama'ah — personal / household / dapukan changes only.
   * Status_keanggotaan (Aktif/Pindah/Meninggal) goes through recordMovement;
   * editMember NEVER flips is_active (enforces mandatory-movement rule).
   */
  editMember(
    deps: MemberDeps,
    id: number,
    input: EditMemberInput,
  ): MemberRow {
    return deps.db.transaction((tx) => {
      const current = tx.select().from(members).where(eq(members.id, id)).get();
      if (!current) throw new MemberNotFoundError(id);

      const changeDate = today(deps);
      const logChanges = !input.silentLog;

      // §8: marital_status change.
      if (
        logChanges &&
        input.maritalStatus !== undefined &&
        input.maritalStatus !== current.maritalStatus
      ) {
        eventLogService.recordChange(tx, {
          changeType: 'Menikah',
          changeDate,
          memberId: id,
          oldValue: current.maritalStatus,
          newValue: input.maritalStatus,
        });
      }

      // §8: life_stage change.
      if (
        logChanges &&
        input.lifeStage !== undefined &&
        input.lifeStage !== current.lifeStage
      ) {
        eventLogService.recordChange(tx, {
          changeType: 'Perubahan Kelas',
          changeDate,
          memberId: id,
          oldValue: current.lifeStage,
          newValue: input.lifeStage,
        });
      }

      // §8: role_id change.
      if (
        logChanges &&
        input.roleId !== undefined &&
        input.roleId !== current.roleId
      ) {
        const oldRoleName = current.roleId
          ? (tx.select().from(roles).where(eq(roles.id, current.roleId)).get()
              ?.name ?? null)
          : null;
        const newRoleName = input.roleId
          ? (tx.select().from(roles).where(eq(roles.id, input.roleId)).get()
              ?.name ?? null)
          : null;
        eventLogService.recordChange(tx, {
          changeType: 'Perubahan Dapukan',
          changeDate,
          memberId: id,
          oldValue: oldRoleName,
          newValue: newRoleName,
        });
      }

      // Household move (no automatic event-log entry — household reassignment
      // isn't itself a Catatan Peristiwa concept).
      let newHouseholdId: number | undefined;
      if (input.household) {
        if (input.household.mode === 'create-new') {
          const hh = householdService.create(tx, {
            type: 'KK-S',
            address: input.household.address ?? null,
          });
          newHouseholdId = hh.id;
          tx.update(households)
            .set({ headMemberId: id })
            .where(eq(households.id, newHouseholdId))
            .run();
        } else {
          const target = tx
            .select()
            .from(households)
            .where(eq(households.id, input.household.householdId))
            .get();
          if (!target) {
            throw new HouseholdNotFoundError(input.household.householdId);
          }
          newHouseholdId = target.id;
        }
        // Clear old household's head if this member was it.
        const oldHh = tx
          .select()
          .from(households)
          .where(eq(households.id, current.householdId))
          .get();
        if (oldHh?.headMemberId === id) {
          tx.update(households)
            .set({ headMemberId: null })
            .where(eq(households.id, current.householdId))
            .run();
        }
      }

      // Build the patch.
      const patch: Partial<{
        fullName: string;
        nickname: string | null;
        gender: typeof current.gender;
        lifeStage: typeof current.lifeStage;
        maritalStatus: typeof current.maritalStatus;
        bloodType: typeof current.bloodType;
        rhesus: typeof current.rhesus;
        birthPlace: string | null;
        birthDate: string | null;
        roleId: number | null;
        isSerkiler: boolean;
        householdId: number;
        updatedAt: Date;
      }> = {};
      if (input.fullName !== undefined) patch.fullName = input.fullName.trim();
      if (input.nickname !== undefined) {
        patch.nickname = input.nickname?.trim() || null;
      }
      if (input.gender !== undefined) patch.gender = input.gender;
      if (input.lifeStage !== undefined) patch.lifeStage = input.lifeStage;
      if (input.maritalStatus !== undefined) {
        patch.maritalStatus = input.maritalStatus;
      }
      if (input.bloodType !== undefined) patch.bloodType = input.bloodType;
      if (input.rhesus !== undefined) patch.rhesus = input.rhesus;
      if (input.birthPlace !== undefined) {
        patch.birthPlace = input.birthPlace?.trim() || null;
      }
      if (input.birthDate !== undefined) patch.birthDate = input.birthDate;
      if (input.roleId !== undefined) patch.roleId = input.roleId;
      // Serkiler membership is roster curation, not a life event — no
      // member_changes log entry (not a HANDOFF §8 trigger).
      if (input.isSerkiler !== undefined) patch.isSerkiler = input.isSerkiler;
      if (newHouseholdId !== undefined) patch.householdId = newHouseholdId;
      patch.updatedAt = deps.clock?.() ?? new Date();

      tx.update(members).set(patch).where(eq(members.id, id)).run();

      return fetchRow(tx, id);
    });
  },

  /**
   * Catat Kepindahan — Pindah Sambung or Meninggal. Inserts the event-log row
   * and flips is_active=false in a single transaction. If the affected member
   * is the head of their household, newHeadMemberId is required.
   */
  recordMovement(
    deps: MemberDeps,
    input: RecordMovementInput,
  ): MemberRow {
    return deps.db.transaction((tx) => {
      const current = tx
        .select()
        .from(members)
        .where(eq(members.id, input.memberId))
        .get();
      if (!current) throw new MemberNotFoundError(input.memberId);
      if (!current.isActive) throw new AlreadyInactiveError(input.memberId);

      const hh = tx
        .select()
        .from(households)
        .where(eq(households.id, current.householdId))
        .get();
      const isHead = hh?.headMemberId === input.memberId;

      if (isHead) {
        if (input.newHeadMemberId === undefined) {
          throw new HeadReassignmentRequiredError(current.householdId);
        }
        householdService.setHead(tx, current.householdId, input.newHeadMemberId);
      }

      if (!input.silentLog) {
        if (input.kind === 'Pindah Sambung') {
          eventLogService.recordMovement(tx, {
            movementType: 'Pindah Sambung',
            movementDate: input.date,
            memberId: input.memberId,
            notes: input.notes ?? null,
          });
        } else {
          eventLogService.recordVital(tx, {
            eventType: 'Meninggal',
            eventDate: input.date,
            memberId: input.memberId,
            name: current.fullName,
            gender: current.gender,
            notes: input.notes ?? null,
          });
        }
      }

      tx.update(members)
        .set({
          isActive: false,
          updatedAt: deps.clock?.() ?? new Date(),
        })
        .where(eq(members.id, input.memberId))
        .run();

      return fetchRow(tx, input.memberId);
    });
  },
};
