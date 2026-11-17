# Core CMS record storage repair

The failing document is `kbrh/choreTracker`. The new storage separates its applicants, residents, schedules, maps and nested histories into bounded records under `kbrhStateGenerations/{generation}/records/{record}`. Records use stable IDs, contain no growing lists of child IDs, and are capped at 48,000 JSON bytes. Long text is split into smaller Unicode-safe parts. Small primitive arrays/maps are kept inside their bounded parent records to avoid multiplying reads for checklist items. History insertions preserve existing ordering positions instead of rewriting every older note.

## Deployment and cutover

1. Deploy the updated Functions and rules together with the updated static pages. The existing backend workflow now runs the synthetic page and emulator suites before deployment. Staff must refresh pages after deployment. Old cached clients can read the original, but direct writes are denied.
2. Sign into the CMS as Admin or Executive Director and open System Health. The migration controls are restricted on the server as well as in the interface.
3. Select **Copy and verify records**. This locks core CMS changes, retains the original document, and copies at most 200 records per resumable step. If interrupted, select the same button again to resume from the recorded cursor.
4. Verification compares every encoded document, the document count and a SHA-256 digest of the reconstructed state against the original. Extra, missing, corrupt or changed source values prevent activation.
5. Select **Activate verified storage** only after verification reports ready. This atomically changes the storage pointer. Reload roster, waitlist, admission and reports to verify operational access. Do not create disposable people in production for testing.
6. Confirm a real authorized save and fresh reload during normal work. Confirm Intake receives an archive notification during the next legitimate archive operation.

The original document remains intact. No live data is included in this repository. Cancellation before activation resumes the original; staged copies remain retained. After activation, the original is a historical recovery copy, not current state. **Reverting JavaScript alone is not a database rollback.** A post-activation restore must include subsequent edits and its own verified recovery procedure. Set an organizational retention period for the preserved original and staged generations; this release never purges them automatically.

## Save and access behavior

All core CMS writes pass through `saveCMSRecords`. A revision check prevents stale staff sessions from overwriting a newer save. A conflict preserves the stored state and asks the user to reload. A save is atomic, limited to 350 changed records and 3 MiB of encoded changes; exceptionally large bulk edits are rejected with an actionable error. Initial reads use 300-document query pages and verify that the revision remained stable. Subsequent reads use a bounded change journal and a cache in the signed-in tab’s session storage. The cache is tied to the Firebase UID, is never served without an authenticated server revision check, and is cleared on sign-out. Gaps beyond 25 revisions, missing journals, corrupt caches or storage quotas fall back to a fresh paged read.

Only the enabled Firebase Auth user for `intake@kbrh.local` can permanently delete a waitlist applicant, through the dedicated deletion action. Staff, Admin and ED can archive applicants. Archives and Intake notifications commit in the same transaction. If Intake is missing or disabled, the archive fails without claiming success. Per-applicant tombstones stop older browser sessions from resurrecting deleted applicants. Legitimate admissions retain the source applicant as archived. Migration itself does not send historical archive notifications.

The retention job uses the active store and commits its 30-day recovery copy atomically with removal. It pauses during migration. No browser performs retention writes. THC reminder jobs read active records rather than the preserved original. Laundry completion dates stay blank for paper use; the weekly range still starts on the upcoming Monday.

## Verification

- `npm ci`
- `npm run test:pages`
- `npm run test:storage` (requires Java; explicitly uses a demo Firestore emulator, never production)

The storage suite covers resumable migration, corrupted-copy rejection, verified activation, growth beyond 1 MiB, bounded records, long Unicode text, duplicate IDs, long-history insertion, stale edits, browser adapter reads/saves, Intake deletion, anti-resurrection tombstones, atomic notifications, missing Intake, retention backups, and actual security rules. Page tests use synthetic fixtures and mocked storage; they are DOM checks, not visual browser tests.

## Practical limits and scope

This fixes the shared core-state document limit. Other independently stored modules—digital logbooks, electronics turn-in, house-wide urine-test days, write-up counts, staff profiles and presence—retain their existing stores. Their growing documents require separate normalization work; this release does not claim the entire application is free of every Firestore limit. Chat and individual urine-screen records already use separate records.

Core pages still assemble a full state in memory for compatibility. Query paging bounds each initial request; the session cache and revision journal avoid repeated full-history reads in ordinary use. Larger datasets still increase initial load time, and the server currently validates saves against a full record read. A later UI refactor should request only the records each page needs. The 48 KB cap prevents the original document-size failure in this new store; it is not a promise that network, billing, permissions or other service errors cannot occur.
