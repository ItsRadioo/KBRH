KBRH PROFESSIONAL — INDEPENDENT REVIEW PACKAGE

Base: user-uploaded KBRH-main (4).zip, with staff chat as supplied in the prior package.

Changes in this review build:
- Replaced placeholder chat-badge.js with real-time unread-conversation counts on navigation links.
- Prevented simultaneous staff-wide channel creation from racing by using a Firestore transaction.
- Updated cache versions for modified scripts.

Existing direct messages, group conversations, staff-wide channel and all other KBRH files are preserved.

IMPORTANT:
- This is a limited chat polish build, not the full proposed roadmap. Read receipts, pinned announcements,
  @mentions, handover, global search, discharge checklist, and new dashboards are NOT implemented here.
- A static local file:// preview may not support Firebase authentication. Test on a separate hosted test site.
- The .github/workflows/firebase-backend.yml file is a GitHub Actions workflow. Pushing backend files to the
  configured main branch can deploy live Firebase Functions and rules. Do not push to production to test.
- This package includes existing firestore.rules, which must be deployed in an isolated Firebase test project
  for meaningful end-to-end security testing. Do not assume UI-only tests validate authorization.
- No live Firebase or browser integration tests were run.
