-- Add a manually-orderable position to `roles` so operators can reorder
-- them in Pengaturan (drag-and-drop). The order propagates to any UI that
-- lists Pengurus by role — e.g. the Musyawarah attendee picker.
ALTER TABLE `roles` ADD `position` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- Backfill: rank existing rows by id so the initial order matches insertion.
-- Uses a correlated subquery (SQLite doesn't support ROW_NUMBER() in UPDATE
-- without a CTE in older versions; this is portable).
UPDATE `roles` SET `position` = (
  SELECT COUNT(*) FROM `roles` r2 WHERE r2.`id` <= `roles`.`id`
);
--> statement-breakpoint

CREATE UNIQUE INDEX `roles_position_uq` ON `roles` (`position`);
