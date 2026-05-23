CREATE TABLE `activity_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`activity_type_id` integer NOT NULL,
	`status` text NOT NULL,
	`executed_date` text,
	`attendee_count` integer,
	`location` text,
	`source_meeting_id` integer,
	FOREIGN KEY (`report_id`) REFERENCES `monthly_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity_type_id`) REFERENCES `activity_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_records_report_type_uq` ON `activity_records` (`report_id`,`activity_type_id`);--> statement-breakpoint
CREATE TABLE `activity_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`source_kind` text NOT NULL,
	`meeting_type` text,
	`session_type_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`session_type_id`) REFERENCES `session_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`session_id` integer NOT NULL,
	`status` text NOT NULL,
	`arrival_at` integer,
	`donation_amount` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_member_session_uq` ON `attendance` (`member_id`,`session_id`);--> statement-breakpoint
CREATE TABLE `circular_roster` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`period` text NOT NULL,
	`paraf` integer DEFAULT false NOT NULL,
	`circulation_amount` integer,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `family_visits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`household_id` integer,
	`family_name` text,
	`notes` text,
	FOREIGN KEY (`report_id`) REFERENCES `monthly_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_no` text NOT NULL,
	`type` text NOT NULL,
	`head_member_id` integer,
	`address` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `households_household_no_uq` ON `households` (`household_no`);--> statement-breakpoint
CREATE TABLE `meeting_attendees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meeting_attendees_meeting_member_uq` ON `meeting_attendees` (`meeting_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_date` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`result_notes` text,
	`suggestions` text
);
--> statement-breakpoint
CREATE TABLE `member_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`change_type` text NOT NULL,
	`change_date` text NOT NULL,
	`member_id` integer NOT NULL,
	`old_value` text,
	`new_value` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `member_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movement_type` text NOT NULL,
	`movement_date` text NOT NULL,
	`member_id` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` integer NOT NULL,
	`full_name` text NOT NULL,
	`nickname` text,
	`gender` text NOT NULL,
	`life_stage` text NOT NULL,
	`marital_status` text NOT NULL,
	`blood_type` text NOT NULL,
	`rhesus` text NOT NULL,
	`birth_place` text,
	`birth_date` text,
	`role_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `monthly_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`lima_bab_lancar` integer,
	`lima_bab_kurang_lancar` integer,
	`lima_bab_kurang_sambung` integer,
	`lima_bab_tabayyun` integer,
	`rencana_bece` text,
	`beras_jimpitan` text,
	`fotocopy_dalil` text,
	`other_notes` text,
	`visit_plans` text,
	`construction_projects` text,
	`finalized_at` integer,
	`demographics_snapshot` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_reports_month_year_uq` ON `monthly_reports` (`month`,`year`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `session_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_types_name_unique` ON `session_types` (`name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_date` text NOT NULL,
	`session_type_id` integer NOT NULL,
	FOREIGN KEY (`session_type_id`) REFERENCES `session_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_type_date_uq` ON `sessions` (`session_type_id`,`session_date`);--> statement-breakpoint
CREATE TABLE `sick_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `monthly_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vital_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`event_date` text NOT NULL,
	`member_id` integer,
	`name` text,
	`gender` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
