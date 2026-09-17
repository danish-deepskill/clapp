/** Notify-only update check (CONTEXT §5, HANDOFF §10): no auto-install. */
export interface UpdateInfo {
  currentVersion: string;
  /** Latest published release, or null when the check could not complete. */
  latestVersion: string | null;
  /** True when latestVersion is newer than currentVersion. */
  isNewer: boolean;
  /** Release page for the manual download. */
  releaseUrl: string;
  checkedAt: string;
  /** Set when the check failed (offline, API error). */
  error: string | null;
}
