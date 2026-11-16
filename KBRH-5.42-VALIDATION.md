# KBRH CMS 5.42 review package

Base: ItsRadioo/KBRH main at d23251763d170cc6f079a407952ba536435a896a, retrieved November 16, 2026.

The latest source already includes the requested Phase 1-only house-wide urine chart under Reports & Admin (Name, Done, Result, Tested For), count-only Phase 1 writeups with legacy count fallback, four-column laundry checklist and PDF, and edited log-book notification settings with searchable staff selection. These are retained in this complete source package.

Finishing changes:
- Wait for notification recipients to load before reading form selections, and reject unsupported priorities.
- Preserve the date displayed when laundry completion/time is entered; preserve an intentionally cleared date in both screen and PDF.
- Enforce single-person selection when the staff picker first loads, and clear search/recipients/group name when opening a new chat.
- Update changed script cache versions to 5.42.

Validation:
- Six local Node checks pass: Phase 1 urine roster and transaction validation; writeup count fallback, increment, floor and Phase 2 rejection; laundry columns/date persistence; changed notification priority/recipients, current message content, unchanged-setting deduplication and Normal behavior; directory-before-form capture; picker filtering, single selection and reset.
- All root JavaScript files pass node --check. git diff --check passes.
- Run node --test cms-review.test.cjs from the source directory to repeat the local tests. Firestore is mocked; no production data is used.
- Browser validation was attempted but Chromium cannot launch in this execution environment (socket operation denied). Visual layout, Firebase authentication, actual Firestore security enforcement, push delivery and multi-user behavior remain unverified end to end.

Behavior and limits:
- Notification settings changes create notifications for the newly selected recipient set. Normal creates none. Already delivered notifications are retained; they are not recalled.
- Legacy detailed writeup records are preserved; the writeups page records only a count going forward.
- Phase filtering is checked in UI and save transactions. Existing Firestore rules broadly permit authenticated writes to these app-state documents; these local tests do not establish backend Phase 1-only authorization against a custom client.

No remote commits, pushes, deployment or live data writes were performed. Existing workflow files are included unchanged; obtain approval before publishing or deploying. This ZIP is the complete source, excluding Git metadata.
