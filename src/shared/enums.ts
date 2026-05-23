export const GENDER = ['Laki-Laki', 'Perempuan'] as const;
export type Gender = (typeof GENDER)[number];

export const HOUSEHOLD_TYPE = ['KK', 'KK-S'] as const;
export type HouseholdType = (typeof HOUSEHOLD_TYPE)[number];

export const LIFE_STAGE = [
  'Balita',
  'AUD',
  'Cabe Rawit',
  'Pra Remaja',
  'Remaja',
  'Muda-mudi',
  'Dewasa',
] as const;
export type LifeStage = (typeof LIFE_STAGE)[number];

export const MARITAL_STATUS = [
  'Belum Menikah',
  'Menikah',
  'Janda',
  'Duda',
] as const;
export type MaritalStatus = (typeof MARITAL_STATUS)[number];

export const BLOOD_TYPE = ['A', 'B', 'AB', 'O', 'Tidak Tahu'] as const;
export type BloodType = (typeof BLOOD_TYPE)[number];

export const RHESUS = ['Positif', 'Negatif', 'Tidak Tahu'] as const;
export type Rhesus = (typeof RHESUS)[number];

export const ATTENDANCE_STATUS = ['H', 'A', 'S', 'I'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

export const MEETING_TYPE = [
  'Musyawarah Kelompok',
  'Musyawarah 5 Unsur',
  'Pengkoreksian KU Bulanan',
  'Lainnya',
] as const;
export type MeetingType = (typeof MEETING_TYPE)[number];

export const VITAL_EVENT_TYPE = ['Lahir', 'Meninggal'] as const;
export type VitalEventType = (typeof VITAL_EVENT_TYPE)[number];

export const MOVEMENT_TYPE = ['Pindah Sambung', 'Sambung Baru'] as const;
export type MovementType = (typeof MOVEMENT_TYPE)[number];

export const MEMBER_CHANGE_TYPE = [
  'Menikah',
  'Perubahan Kelas',
  'Perubahan Dapukan',
] as const;
export type MemberChangeType = (typeof MEMBER_CHANGE_TYPE)[number];

export const ACTIVITY_SOURCE_KIND = ['manual', 'meeting', 'session'] as const;
export type ActivitySourceKind = (typeof ACTIVITY_SOURCE_KIND)[number];

export const ACTIVITY_RECORD_STATUS = ['Belum', 'Terlaksana'] as const;
export type ActivityRecordStatus = (typeof ACTIVITY_RECORD_STATUS)[number];

export const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;
export type BulanID = (typeof BULAN_ID)[number];

export const BULAN_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

export const HARI_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;
