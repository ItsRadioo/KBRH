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
