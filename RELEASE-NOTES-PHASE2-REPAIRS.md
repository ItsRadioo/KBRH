# KBRH Phase 2 Issues and Phase 1 Candidate Flag (TEST)

- Phase 1 roster: staff can set a Phase 2 Candidate checkbox from the resident edit modal or inline editing; the flag appears on the resident card. It is informational and does not automatically transfer the resident.
- Phase 2 digital logbook: Issue / Repair action available only when Phase 2 scope is selected. Capture location, description, priority and status; edit the entry to update its status. Records use the existing Phase 2 logbook Firestore storage and permissions.
- Existing resident data and logs remain unchanged.

Test: set candidate flag, reload, check persistence; create Phase 2 issue, reload, edit status, print report; verify Phase 1 logbook does not show Phase 2 issues.

Known limitation: Phase 2 logbook currently stores entries in one shared document; concurrency and large-log scaling require future work. This build has not been live-tested against Firebase.
