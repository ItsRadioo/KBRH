# KBRH — Consolidated release and deployment notes

## RELEASE-NOTES-2026-10-28.txt

KBRH Operational Handover TEST
- Added read-only admin system-health page
- Prevented duplicate urine-screen submit clicks and added diagnostic reference
- Added operations, recovery and handover instructions
- No Firestore rules or data schema changes
- No automatic backups or account management claims


## RELEASE-NOTES-URINE-WAITLIST.md

# Test release — urine history and waitlist layout

## Changes
- New follow-up urine screens are append-only documents at `kbrhUrineScreens/{residentId}/records/{screenId}`.
- Historical screens in the roster remain readable and are merged with the new records by ID in the history viewer. No destructive migration is performed.
- THC-positive screening updates roster protocol status separately; failure of this status update is reported separately from the saved screen.
- Waitlist removes Upcoming Intakes and Recent Transfers summary panels. Underlying transfer history and undo logic are retained.
- Add Applicant moved into the Current Waitlist heading; Choose Compact Columns and Collapse Table share one toolbar.
- Four obsolete release-note files removed. HTML functional pages intentionally remain separate pending full regression testing.

## Required deployment steps
1. Deploy `firestore.rules` to the **matching test Firebase project** BEFORE using the new follow-up screening feature. Merely uploading the ZIP to GitHub Pages does not deploy rules.
2. Deploy the website to the independent test site. Refresh without cache.
3. Use a designated authorized screening account; create a follow-up screen and reload the page to verify history. Confirm the new Firestore document exists.
4. Verify old embedded screening history is still visible. Test with another authorized staff member.
5. Test THC-positive protocol status, admission screens, waitlist Add Applicant, table collapse and compact columns.
6. Do not deploy to production without a tested backup and rollback procedure.

## Known limits
- The rest of the application still uses a shared roster document and can have concurrent-update conflicts.
- Firestore rules elsewhere in this application remain broader than recommended for sensitive resident records.
- Live authenticated Firebase tests and full page regression tests have not been run.
- New screening history is separate from the existing roster export; update exports before treating them as complete backups.


## RELEASE-NOTES-PHASE2-REPAIRS.md

# KBRH Phase 2 Issues and Phase 1 Candidate Flag (TEST)

- Phase 1 roster: staff can set a Phase 2 Candidate checkbox from the resident edit modal or inline editing; the flag appears on the resident card. It is informational and does not automatically transfer the resident.
- Phase 2 digital logbook: Issue / Repair action available only when Phase 2 scope is selected. Capture location, description, priority and status; edit the entry to update its status. Records use the existing Phase 2 logbook Firestore storage and permissions.
- Existing resident data and logs remain unchanged.

Test: set candidate flag, reload, check persistence; create Phase 2 issue, reload, edit status, print report; verify Phase 1 logbook does not show Phase 2 issues.

Known limitation: Phase 2 logbook currently stores entries in one shared document; concurrency and large-log scaling require future work. This build has not been live-tested against Firebase.


## STAFF-STABILITY-REVIEW.txt

KBRH Staff Stability & File Consolidation — independent test build

Changes:
- Staff profile lookup has an 8-second upper wait bound; a failed/missing lookup can retry on later navigation.
- Display name resolves name, fullName, or firstName + lastName; falls back to Firebase displayName/email.
- Auth initialization catches unexpected errors; notification/retest startup is noncritical.
- Chat unread listeners no longer recreate all per-conversation listeners for metadata-only updates.
- Consolidated chat-badge.js into chat-floating.js and removed the redundant request.
- Updated cache-busting script versions.

IMPORTANT: This is NOT a verified live Firebase fix. A staff profile still cannot load if Firestore access is blocked, the profile does not exist, or the Firebase project is incorrect. Check browser console and Firestore permissions if the symptom continues.

Independent test: deploy to a separate staging Firebase project and test with 2+ non-admin accounts. Verify names, roster/dashboard loads, chat and notifications, and page navigation. Do not put resident data in a public test deployment.

No Firestore security rules were loosened. Other unrelated scripts remain separate for safe maintenance.


## PERMISSIONS-DEPLOYMENT-NOTES.txt

v5.6.26: Deploy firestore.rules for admin pageAccess updates. Staff Accounts now saves page selections in kbrh/staffProfiles. Existing accounts default to prior access until edited. IMPORTANT SECURITY LIMITATION: Page checks and navigation hiding run in browser JavaScript; current Firestore rules still permit any signed-in user to read/write shared kbrh data. Therefore this is NOT secure per-page data authorization. Production enforcement requires restructuring data by page/domain and adding corresponding Firestore rules plus server-side Cloud Function checks. Do not treat page restrictions as confidentiality boundaries. The createStaffAccount callable must return the new uid for initial permissions to save; otherwise use Edit after creating the account.
