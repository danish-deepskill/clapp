-- Standing membership flag for the Serkiler iuran rotation. The curated
-- subset (CONTEXT §2) lives on the member as a property, not as per-period
-- circular_roster rows — resolves CONTEXT §6 #7 (standing, not re-chosen).
-- circular_roster still holds per-period paraf + circulation_amount.
ALTER TABLE `members` ADD `is_serkiler` integer DEFAULT false NOT NULL;
