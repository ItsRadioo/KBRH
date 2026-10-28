# KBRH Professional — operations and handover (test build)

## Scope and limits
This release adds a **read-only system-health page** and a safer urine-screen submission UI. It does **not** migrate Firestore data, modify security rules, create backups, or establish a maintenance-free service. The underlying application still uses a shared `kbrh/choreTracker` document; multi-user write conflicts remain a concern.

## Free-tier operation
GitHub Pages can host the static interface at no charge under applicable terms. Firebase Authentication and Firestore have free usage allowances and limits, not a guarantee of unlimited free operation. Review the current Firebase pricing/quotas regularly. Automated managed Firestore exports, Cloud Functions and some backup/monitoring services can require billing. Do not enable them without explicit organizational approval.

## Ownership handover
1. Transfer the repository into an organization-controlled GitHub organization, with two owners and 2FA.
2. Ensure two organization-authorized administrators control the Firebase project, recovery email and billing settings.
3. Document the production URL, repository, Firebase project ID, deployed rules, domain and release version.
4. Remove former employees' GitHub/Firebase access promptly and rotate any compromised secrets.
5. Never place resident records or real screening data into GitHub, issue trackers or test fixtures.

## Incident handling
1. Preserve the form if a save fails; do not assume success.
2. Record UTC/local time, page, error code, and the displayed diagnostic reference; omit resident identifiers.
3. Run `system-health.html` while signed in as an administrator.
4. Escalate repeated save failures to the designated technical custodian; do not change Firestore rules to `allow read, write: if true`.
5. Verify a record after a fresh reload before treating it as stored.

## Backups and restore
Use an approved, access-controlled organizational backup solution. Validate a **restore** in a separate Firebase project quarterly. The existing repository ZIP is only application code and is **not a database backup**. Firestore managed exports and automated schedules may not be free. Avoid downloading live resident data to personal computers.

## Release procedure
1. Deploy to a separate Firebase project for tests, with synthetic data only.
2. Verify staff sign-in, restricted roles, roster, urine screen save + reload, admission, reports, and chat.
3. Confirm no Firestore permission errors, browser freezes or duplicate screening submissions.
4. Keep a tagged copy of the prior release; deploy only after written sign-off.
5. Roll back code by redeploying the prior tagged release. Database changes require a separately documented restoration plan.

## Known risks / future engineering work
- Refactor the shared roster document into per-resident documents with migration and rollback.
- Add security-rule tests and a reliable automated test harness.
- Provide a secure server-side admin workflow for account creation and password resets.
- Add a privacy-reviewed monitoring and backup solution within an approved budget.
- Do not claim unassisted production readiness until a second administrator completes a handover drill.
