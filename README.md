# v5.6.3 — Pre-Screening Completion Fix

- Fixed Complete Pre-Screening failing when an eligible intake advances to Pending Admission.
- Restored the repeat-admission safeguard directly on the Pre-Screening page; the page no longer depends on a helper that only exists in waitlist.js.
- Preserved the two-archive / rolling-two-year rule, DOB secondary match, Administrator/Executive Director override, written override reason, and audit entry.
- Updated Pre-Screening cache-busting references so browsers load the corrected script immediately after deployment.

KBRH Professional v5.6.2 — Staff Account UI + Flat Backend Fix

- Rebuilt Staff Accounts into a clean responsive form with properly aligned Name, Email, Position and Temporary Password fields.
- Added an Account Service status indicator instead of presenting backend failures as if they were staff records.
- Added Edit Staff Account for name, sign-in email and position.
- Existing enable/disable and password-reset controls remain.
- Firebase Functions configuration is now compatible with the required completely flat release package: firebase.json uses the ZIP root as the Functions source.
- No folders or subdirectories are included in the release ZIP.
- Once the Functions backend has been deployed once, staff account creation and modification are performed from KBRH Professional itself.

KBRH Professional v5.6.1 — Shared Admin Access + In-App Administration

- admin@kbrh.local and executivedirector@kbrh.local now have identical administrative access throughout KBRH Professional.
- Both can access System Settings, Audit Log and Staff Accounts and use all administrator-only application controls.
- Firestore rules grant both accounts the same Settings and Audit Log permissions.
- Staff account creation, temporary passwords, enable/disable controls and password-reset links remain available from Staff Accounts.
- The Web Push public VAPID key can now be maintained from System Settings instead of editing firebase-config.js for routine changes.
- System Settings now provides direct links to Staff Accounts and Audit Log.
- Routine operational administration is performed inside KBRH Professional after the backend is initially deployed.

DEPLOYMENT BOUNDARY
The live browser application cannot safely replace its own hosted source code or its own security backend. The initial v5.6.1 deployment, and future releases that change source code, Functions or Firestore rules, still require deployment to the hosting/backend service. This intentionally avoids storing GitHub/Firebase deployment credentials inside the KBRH web application. Once v5.6.1 is deployed, normal account administration, workflow settings, notification configuration and access management are handled from within KBRH Professional.

KBRH Professional v5.6.0 — Safeguards, Notifications, Account Management & Cleanup

- Roster “Days Remaining” labels changed to “Days Left” everywhere.
- Removed obsolete medication multi-resident checkbox helper after the dropdown workflow replaced it.
- Repeat-admission matching still requires TWO archived admissions inside the rolling 2-year window; DOB is used as a secondary discriminator when available.
- Repeat-admission warning is persistent in Applicant Info and advancement is held unless Admin/Executive Director records an override reason.
- Archived roster records store discharge/retention metadata and display Retention Until.
- Discharge confirmation now shows resident, date and reason and explains the 2-year-history effect.
- Automatic 2-year deletion creates a restricted 30-day recovery backup; included scheduled Cloud Function also enforces retention even when the website is closed and purges recovery copies after 30 days.
- Digital Log Book entries can be marked Important/Urgent and sent to selected staff. Recipients get in-app notifications with acknowledgement tracking.
- Optional Firebase Cloud Messaging browser push is included; external notifications intentionally contain no resident or clinical details. Add the Web Push VAPID public key to firebase-config.js to enable it.
- Staff Accounts page added for admin@kbrh.local and executivedirector@kbrh.local. It supports create, enable/disable and password reset workflows.
- New accounts can use a temporary password and are forced to replace it before accessing KBRH Professional. Temporary passwords are never stored in Firestore.
- Privileged account actions use Firebase Cloud Functions/Admin SDK; deploy the included functions and Firestore rules before using Staff Accounts.

DEPLOYMENT REQUIRED FOR NEW BACKEND FEATURES
1. Install Firebase CLI and authenticate.
2. From this project folder run: firebase deploy --only firestore:rules,functions
3. In Firebase Console > Project Settings > Cloud Messaging, create/copy the Web Push certificate public key and set window.KBRH_FCM_VAPID_KEY in firebase-config.js if browser push is desired. In-app notifications do not require the VAPID key.

KBRH Professional v5.5.52 — Medication Delivery Resident Dropdown

- Medication Delivery now uses a single Resident dropdown instead of the scrolling checkbox list.
- The dropdown uses the same active Phase 1/Phase 2 resident source as the Log Book.
- Existing medication log-entry storage remains compatible.

KBRH Professional v5.5.51 — Two-Archive Repeat Admission Threshold

- Blue returning-resident highlighting now requires TWO matching archived KBRH admission/discharge records within the rolling 2-year window.
- A single archived admission does not trigger the blue warning.
- The intensive-treatment-centre alert is shown only when at least two qualifying archive records match the applicant.
- Rolling two-year automatic archive deletion from v5.5.50 remains unchanged.

KBRH Professional v5.5.50 — Rolling 2-Year Retention + Repeat Admission Alert

- Archived roster records are automatically removed individually once 2 years have elapsed from their recorded discharge/archive timestamp.
- Retention is rolling per admission: e.g. when a 2026 record expires in 2028, a 2027 record remains until its own 2-year anniversary.
- Cleanup runs when the application loads/receives the shared Firestore state and persists the removal back to Firestore.
- Automatic retention deletions are written to the audit log.
- Waitlist applicants matching an archived resident within the rolling 2-year window remain highlighted blue.
- When such an applicant is added, the system displays a Returning Resident Alert instructing staff that the applicant should attend a more intensive treatment centre before qualifying for KBRH again.
- The repeat-admission alert is also recorded in the applicant activity history.
- Permanent manual deletion of archived roster records remains unavailable.

KBRH Professional v5.5.49 — Roster Retention + Returning Resident Flag

- Removed permanent deletion of archived roster resident records from the Roster UI and code.
- Archived/discharged resident records are retained; this enforces at least the requested 2-year retention period.
- Active waitlist names are automatically checked against archived roster residents discharged in the previous 2 years.
- An exact normalized first-name + last-name match is highlighted blue on both desktop and compact/mobile waitlist views.
- Matching ignores capitalization and common punctuation/spacing differences.
- v5.5.48 Log Book active-resident filtering is retained.

KBRH Professional v5.5.48 — Log Book Active Residents Fix

- Digital Log Book resident selectors now exclude archived/discharged residents.
- Phase 1 and Phase 2 selectors continue using the normalized live roster source.
- This matches the Current Roster definition: resident exists in state.roster, is not archived, and belongs to the selected phase.
- v5.5.47 significant-only audit behavior and v5.5.46 mobile overhaul are retained.

KBRH Professional v5.5.47 — Significant-Changes Audit Log

- Removed audit entries for ordinary button presses and navigation.
- Audit Log now focuses on significant saved system changes.
- Continues tracking notes, client additions/removals, offers/status changes, client information edits and other persisted record changes.
- Each audit entry retains the authenticated user, date/time and originating page.
- Admin-only read access and append-only Firestore protections remain unchanged.
- v5.5.46 mobile overhaul and all earlier workflow changes are retained.

KBRH Professional v5.5.46 — Mobile UI Overhaul

- Rebuilt phone navigation as an off-canvas hamburger menu with backdrop and mobile Sign Out.
- Desktop navigation and desktop layout remain intact above the mobile breakpoint.
- Cards, forms and controls now use the available phone width.
- Form fields use mobile-safe 16px input sizing and larger touch targets.
- Multi-column forms stack into one column on phones.
- Modals become full-width bottom sheets with a 94dvh maximum height and internal scrolling.
- Data tables are contained in deliberate touch-scroll panels instead of overflowing the page.
- Table action columns remain visible at the right edge while scrolling.
- Pre-Screening completed-step navigation is horizontally scrollable on phones.
- Pre-Screening choices, dashboard actions and common action buttons are enlarged/reflowed for touch use.
- Extra-small phone layout added below 420px.
- Existing v5.5.45 Change Log, Further Review workflow, section navigation and v5.5.44 incarcerated workflow retained.

KBRH Professional v5.5.45 — Change Log + Pre-Screening Review

- Audit Log is restricted to admin@kbrh.local in both the UI and included Firestore rules.
- All authenticated users can append audit records, but only admin@kbrh.local can read them.
- Every button press and primary navigation action is logged with user, date/time and page.
- Existing saved-state auditing continues to log notes and record changes.
- Audit records cannot be edited or deleted by the application.
- Further Review Required pre-screenings now have a Reviewed checkbox.
- Marking Reviewed prompts for APPROVED or DENIED and records reviewer identity and timestamp.
- Approved reviews can proceed through Pending Admission; denied reviews do not.
- Completed pre-screening sections become clickable navigation buttons at the top.
- Future/uncompleted sections remain locked.

KBRH Professional v5.5.44 — Incarcerated Waitlist Status Workflow

- Applicants marked Incarcerated no longer show Give Offer as their primary waitlist action.
- Their primary action is now Update Status.
- Update Status opens the applicant row for editing so staff can change the current status.
- Give Offer is hidden from the More actions menu while the applicant remains Incarcerated.
- The Give Offer function also blocks an incarcerated applicant as a safeguard until their status is updated.

KBRH Professional v5.5.43 — Log Book Current Roster Fix

- Digital Log Book now uses the same normalized live roster source as the Verbal Warning Log.
- Phase 1 Log Book lists current Phase 1 roster residents from state.roster.
- Phase 2 Log Book lists current Phase 2 roster residents from the same source.
- Removed the raw Firestore listener that was replacing normalized roster data and causing an empty or incorrect resident list.

KBRH Professional v5.5.42 — Active Log Book Residents Fix

- Log Book resident selectors now use only the current active roster.
- Phase 1 shows only active, non-archived Phase 1 residents.
- Phase 2 shows only active, non-archived Phase 2 residents.
- The broader residents/chore list is no longer used, preventing pre-admission and historical names from appearing.

KBRH Professional v5.5.41 — Phase 2 Admin Access Fix

- Fixed Phase 2 Log Book visibility for the application's recognized Admin identity/role.
- Phase 2 access still explicitly includes attendantj@kbrh.local, executivedirector@kbrh.local, and admin@kbrh.local.
- Firebase authenticated email remains supported, with application staff/profile identity and role as additional authorization sources.
- Phase 1 and Phase 2 log data remain separate.

KBRH Professional v5.5.39 — Log Book Edit & Daily Reports

- Existing log entries can be edited for correction.
- Original author/time remain intact; edits record editor and edit timestamp.
- Daily report can be selected by date and printed.

KBRH Professional v5.5.38 — Digital Log Book

Adds Resident In/Out, Medication Delivery, and staff-attributed Note entries with live Firestore updates.

# v5.5.37 — Pre-Admission Meal Chores

- Pre-screening and Pending Admission clients already added to the chore roster are now eligible for Meal Chores.
- Meal chore selectors update from the same real-time pre-admission chore roster state.
- Pre-admission clients are labelled with their workflow source in meal selectors.
- Printable meal schedules resolve pre-admission client names correctly.
- No admission status is changed by assigning a meal chore.

# v5.5.36 — Real-Time Pre-Admission Chore Eligibility

- Pre-admission chore candidates now mirror the CURRENT Pre-Screening and Pending Admissions lists.
- Historical pre-screening records no longer make former applicants appear in the chore selector.
- Pre-Screening eligibility uses the same active Offer Given / not Pending Admission criteria as the Pre-Screening page.
- Pending Admission eligibility requires the current status to be exactly Pending Admission.
- Firestore snapshot updates automatically refresh the selector and remove stale chore-only selections when a client leaves both current lists.

# v5.5.35 — Pre-Admission Chore Assignment

- House Chores can now manually include clients who are still in Pre-Screening or Pending Admission.
- Added a Pre-Admission Chore Assignment selector showing the source status for each person.
- Added people participate in manual chore assignment, rotation, exceptions, locks, away status, printable schedules, and chore checks through the existing resident chore model.
- Removing a pre-admission person from chores does not alter their admissions record.
- The selection is persisted in shared app state.
- If the same person later appears on the Current Roster, the chore sync avoids a duplicate name and preserves the existing chore setup where possible.

# KBRH Professional v5.5.34 — Retroactive Automatic Capitalization

- Applies the existing automatic capitalization rules retroactively to stored structured fields.
- Existing names, cities, provinces, contacts, employers/source names, organizations and referral sources are normalized to uppercase where applicable.
- Existing address/street fields are normalized to title case.
- Notes, clinical/medical narratives, emails, phone numbers, IDs, postal codes, URLs and other excluded fields are untouched.
- Uses a one-time migration marker and Firestore merge writes; it does not clear or replace unrelated data.
- Future saves also normalize applicable structured fields before persistence.

# v5.5.33 — Capitalize Names When Resident Edit Is Saved

- Removed the automatic one-time database-wide name migration from the normal load path.
- Whenever a resident/client is edited and saved, First Name, Last Name, and Emergency Contact name are checked and stored in uppercase.
- Applies to both the individual Edit Resident modal and Edit All Residents workflow.
- Existing records are not bulk rewritten merely by loading the site; they are persisted in normalized form when that client is edited and saved.
- New-entry automatic capitalization from v5.5.31 remains in place.

KBRH Professional v5.5.32 — Existing Name Capitalization Migration

KBRH Professional v5.5.30

- Added Current Income Source step to Pre-Screening.
- Preserves the completed pre-screening record when an applicant moves to Roster.
- Resident Display Info now shows historical pre-screening notes and income information.
- Existing residents can resolve their historical pre-screening by linked waitlist/applicant ID when available.

KBRH Professional v5.5.11

Added Tool Sign-Out under Daily Operations. Tracks Resident Name, Reason, Time Out, Time In, Tool, and ID #; active tools can be marked returned; authenticated staff attribution is stored automatically; printable six-column history included.

KBRH Professional v5.5.2

Restores Bus Pass Tracker and fixes expanded sidebar/search overflow.

# KBRH Resident Chore Rotator

This build includes:

- Firebase email/password login
- Firestore shared resident and chore data
- House chore rotation
- Away/archived residents
- Locked chore support
- Meal schedule generator
- Random meal schedule generator
- Printable meal schedule
- Excel cleaning schedule export

## Important

Upload all files in this ZIP to the root of your GitHub repository.

If your Firebase project ever changes, update `firebase-config.js`.

The cleaning schedule export:
- Does not use a template season selector
- Applies updates to every worksheet in the workbook
- Uses the selected start date
- Automatically sets the end date to 7 days after the selected start date
- Centers Column A text
- Left-aligns Column B text

## Professional UI v2

This package includes a visual redesign with a shared top navigation bar, updated typography, cleaner cards, modern forms, improved tables, refined modal styling, and a redesigned login screen. Existing Firebase configuration, IDs, JavaScript behaviour, and data structures were retained.

## v2.1 update
- The Roster "Add Client" form now opens in a modal window.
- The Waitlist "Add Applicant" form now opens in a modal window.
- Existing edit, validation, Firebase storage, and table behaviour are preserved.

## Version 2.3 display update
The House Chores page now includes explicit Expand/Collapse buttons for Current Residents, Chores, Generated Chore Table, and Rotation History Log. Expand All and Collapse All controls are included, and each section's display preference is remembered in the browser.


## v2.9
- Waitlist Status is now a dropdown: N/A, Incarcerated, or Offer Given.
- Incarcerated applicants are highlighted yellow.
- Offer Given applicants are highlighted green.
- Selecting Offer Given requires an offer note, which is added to the applicant's notes history.


Version 3.0: Added manual waitlist position changes from the applicant Actions modal. Moving an applicant changes only their active waitlist order and does not change their application date.


## v3.5
- Centred the primary navigation between the page title/emblem and Sign Out on desktop and laptop screens.
- Preserved the compact mobile navigation layout.

## v3.6 interface update
- Replaced the boxed navigation buttons with a cleaner application-toolbar style.
- Increased header contrast with a deeper navy background, white brand mark, teal accent border, and gold active-page indicator.
- Navigation remains centred, with the page title on the left and Sign Out on the right.
- Responsive spacing preserves readability on laptops and smaller screens.


## Version 3.7
- Added live Phase 1 resident count and 18-bed capacity status.
- Individual resident editing now uses a grouped, two-column modal with a sticky footer.
- Edit All Residents remains unchanged for bulk table edits.


## v3.9
- Added compact responsive tables for active and archived waitlists at widths up to 1350px.
- Added a read-only Applicant Information modal.
- Preserved row status colours and existing Actions workflows.
- Full waitlist table remains available while inline editing.


## Version 4.0
Adds Write-Up Tracker and Chore Check Tracker. The chore checks include Washrooms, Upstairs Floors, Main Floor Morning, Main Floor Night, Basement, and Resident Rooms 1-14 excluding 5.


## v4.0.2
- Added a printable Chore Notes Report containing only two columns: Room / Chore and Note.
- The report includes saved notes from today and omits inspections without notes.


## v4.1 — Pre-Screening
- Added a Pre-Screening page limited to active waitlist applicants with status Offer Given.
- Added guided intake script, per-question notes, sobriety calculation, testing disclosures, application highlights, goals, outcome, draft saving, and completion tracking.
- Pre-screening records are stored in the existing shared Firestore application document under `preScreenings`.


## v4.2.1
- Active waitlist is continuously grouped by call-in status.
- Call In applicants appear first, Late Call applicants second, and No Call applicants last.
- Relative order is preserved within each status group.
- Changing a call-in status moves that applicant to the end of the selected group.

- v4.2.3: Improved contrast and readability in compact waitlist column selector boxes.

## v4.3 — Modern UI Refresh + Resident Incident Reports
- Added `kbrh-modern.css` as the presentation-only modern theme layer.
- Modernized the application shell, navigation, cards, tables, forms, modals, buttons, status colours, and responsive layouts without changing existing Firebase storage paths.
- Preserved the fixed-width Phase 1 occupancy card.
- Preserved waitlist semantic row colours, including light red for two consecutive No Calls.
- Added Resident Incident Reports to primary navigation.
- Incident reports are populated from the active roster and stored in the shared `incidentReports` application-state array.
- Added printable resident incident report view and Executive Director review/follow-up fields.

## v5.0 UI overhaul
- Desktop application shell now uses a fixed left navigation workspace.
- Responsive top navigation is retained for smaller screens.
- Added contextual page heroes and KPI summaries.
- Redesigned cards, data grids, forms, buttons, settings panels, and modal workflows.
- Preserved existing page IDs, Firebase wiring, and JavaScript data logic.
- Existing print-only pages are intentionally left visually isolated from the app shell.


## v5.3 Staff accountability
- Session-only Firebase authentication; staff must sign in again after the browser session ends.
- Required staff profile name mapped to each Firebase UID.
- Automatic audit log entries include staff name, email, page, timestamp, and change summary.
- New notes and staff-authored records use the signed-in staff identity.
- Completed pre-screenings include a printable summary.
- Deploy the included firestore.rules before using staff profiles/audit log.


## Staff identity setup (v5.3.1)
Staff identities are stored in the existing Firestore document `kbrh/staffProfiles`. Create a map field named `profiles`. Inside `profiles`, create one map keyed by each Firebase Authentication UID. Each UID map should contain `name` (string), `email` (string), `role` (string), and `active` (boolean). The website reads the authenticated UID and resolves the staff name from this map. Users cannot edit their own identity in the website.

Pre-Screening includes a printable summary on the Summary step after the questionnaire is completed.

## v5.3.8
- Collapsing the desktop sidebar now gives tables the full reclaimed viewport width.
- Desktop table cells switch to no-wrap while the sidebar is hidden, reducing unnecessary word wrapping.
- Tables remain horizontally scrollable only when their actual content is wider than the full screen.

## v5.3.10 layout fix
- Collapsed sidebar now fully removes the desktop shell offset and recenters the roster across the viewport.
- Phase 1 roster uses reclaimed width with no-wrap desktop cells.
- OPOC has reserved width for checkbox/status text.
- Actions remains a normal fully visible column instead of overlapping/pinning over OPOC.

v5.3.11: Repaired Resident Incident Report modal overflow and checkbox/label layout. Incident type and immediate-action choices now stay fully inside their bordered cards, labels align beside checkboxes, and the modal no longer scrolls horizontally.


## v5.3.12
- Chore Check History modal now has a dedicated vertically scrollable history area while keeping the header and Close action accessible.


## v5.3.13 — Waitlist Positioning
- Restored persistent manual waitlist positioning.
- Manual position changes are no longer immediately undone by automatic call-in sorting.
- New applicants are appended to the bottom of the active waitlist.
- Reinstated applicants continue to return to the bottom.
- Call-In / Late Call / No Call updates still move the applicant into the appropriate status group in the order those updates are made.


## Staff Directory
The Staff List page reads active staff from `kbrh/staffProfiles`. Add a `primaryPhone` string to each staff UID map, for example:

```text
profiles
  UID
    name: "Greg"
    role: "Executive Director"
    primaryPhone: "705-555-0123"
    active: true
```

The directory is read-only in the website; staff contact data remains managed in Firestore.


## v5.3.17
- Renamed the navigation entry from Staff List to Staff Contacts so it is clearly visible as the contact page.
- Staff Contacts page remains staff-list.html and uses kbrh/staffProfiles.

## v5.3.20
- Pre-Screening sobriety decision now includes Schedule Intake Date as a third option alongside Detox and Return to Waitlist.
- Scheduled intake defaults to five calendar days after the recorded last-use date and cannot be set earlier.
- Optional intake time and scheduling notes are supported.
- Scheduled-intake outcome keeps the offer active and writes the scheduled admission details into the waitlist note and printable pre-screening summary.


## v5.3.23
- Chore Check assigned resident names are now captured in a shared weekly snapshot.
- Snapshot rolls over every Monday at 12:01 a.m. Eastern Time (America/Toronto).
- Chore/room names stay static for the full week even if House Chore assignments or roster room assignments change mid-week.
- If the Chore Checks page is open at rollover, it refreshes automatically; otherwise the snapshot refreshes the next time an authenticated user opens the page after rollover.

## v5.3.24
Waitlist ordering update: applicants with no call-in history are ordered automatically by Application Date (oldest first). Once an applicant has any call-in record, their persisted waitlist position becomes authoritative. Recording the first call-in locks the applicant's currently displayed position before applying any Call In/Late Call/No Call workflow movement. Manual position changes are available only after call-in history exists, preventing manual edits from fighting the application-date ordering rule.

## v5.4.0 workflow update
- Added Upcoming Intakes to the Waitlist page, driven by completed pre-screening records with a scheduled intake date.
- Strengthened consecutive No Call follow-up with an admin-configurable threshold and visible row warning.
- Added admission-date validation before Move to Roster from both Waitlist and Pre-Screening.
- Added person-level Activity History to Applicant Information and Resident Information.
- Added persistent Recent Transfers with Undo Transfer protection.
- Added admin-only System Settings for admin@kbrh.local.
- Settings include standard call-in day, consecutive No Call threshold, and chore-check assignment rollover day/time.
- Chore Check weekly snapshots now use the configured rollover day/time in America/Toronto.
- Updated Firestore rules so only admin@kbrh.local can write /kbrh/settings.


## v5.4.1
- Settings navigation is rendered only for admin@kbrh.local. For all other authenticated accounts, admin-only navigation elements are removed from the DOM.
- Direct access to settings.html remains blocked for non-admin users.
- Firestore settings writes remain restricted to admin@kbrh.local.

## v5.5.0 UX overhaul
- Added Dashboard with active resident, waitlist, intake and follow-up KPIs.
- Added grouped/collapsible navigation with remembered state.
- Added global resident/applicant search in the header.
- Added sticky table headers and standardized modal overflow behavior.
- Existing workflows and Firestore schema are preserved.


## v5.5.1 Home routing
- `index.html` is now the Dashboard and is the application home page.
- House Chores moved to `house-chores.html`.
- Successful login opens the Dashboard.
- Navigation links were updated accordingly.

## v5.5.4 Sidebar correction
- Forces every navigation group to occupy a full sidebar row.
- Makes the navigation area independently scrollable when all groups are expanded.
- Constrains global search and its results to the sidebar width.
- Removes hover movement from group controls and navigation links.
- Keeps the sidebar collapse chevron fixed in place when hovered/focused.


## v5.5.4
- Fixed the sidebar brand title so “Ken Brown Recovery Home” stays fully visible rather than being clipped.

## v5.5.5
- Removed the desktop KB badge from the sidebar header.
- Increased the desktop sidebar width so “Ken Brown Recovery Home” stays on one line without clipping or wrapping.

## v5.5.9 — Pre-Screening Edit Authority Fix
- Completed pre-screenings remain editable; the Save Draft button becomes Save Changes after completion.
- Open pre-screening edits are protected from live Firestore snapshots so an incoming refresh cannot overwrite unsaved staff changes.
- Saving now starts from the newest server document and uses a Firestore transaction; the most recent explicit save wins.
- Editing a completed pre-screening recalculates the outcome and updates the applicant's current pre-screening status/workflow information.
- Changes to last-use date, substance, sobriety decision, or scheduled intake date persist and are reflected in Upcoming Intakes.
- Completed-record edits create a concise revision note/activity entry rather than duplicating the original completion record.


## v5.5.13
Tool Sign-Out now includes persistent Tool Inventory. Add a tool once, then use the inventory Sign Out action to select resident and reason. Tool name and ID are carried automatically into the sign-out record.


## v5.5.16 – Weekend Menu Builder Print Fix
- Restored the hidden Weekend Menu Builder page.
- Add/remove days with Lunch, Supper, optional Dessert, and Chore fields.
- Generate Table creates a clean printable table.
- Print Table / Save PDF hides the editor, navigation, and webpage controls so only the generated table prints.

## v5.5.17
- Restored the original Weekend Menu Builder layout exactly.
- Print Table now opens a dedicated print/PDF document containing only the generated menu table, preserving the original document formatting.

## v5.5.19 — Weekend Menu direct PDF export
- Weekend Menu Builder screen and generated-table formatting remain unchanged.
- Replaced browser printing with the same jsPDF-based direct-download approach used by Charts.
- **Download PDF** creates a letter-size portrait PDF from the entered menu/chore data without opening a print window or popup.
- PDF preserves day headings, Meals/Chore columns, Lunch/Supper, and Sunday Dessert.
- Long content and additional days automatically continue onto another PDF page when required.


## v5.5.20 – Verbal Warning Issuer Tracking
- Verbal warnings now include a Warning Issued By field that defaults to the currently signed-in staff member.
- The issuer can be overridden when a staff member enters a warning on another staff member's behalf.
- When the signed-in user differs from the issuer, the system records and displays the signed-in user as Entered By.
- When issuer and signed-in user match, only the issuer is shown.
- Existing warning records remain compatible and use the previous staff attribution as the issuer.


## v5.5.21
- Added standardized discharge/outcome modal on roster archive/discharge.
- Added outcome tracking fields for consistent reporting.
- Added Outcome Reports page with intakes, completions, involuntary removals, success rate, monthly summary, and CSV export.
- Residents moved back to the waitlist are excluded from intake reporting.
- Success rate = Program Completed / (Program Completed + Involuntary Discharge / Removed). Other departures do not affect success rate.


## v5.5.22 — Admissions Workflow & Professional UI
- Added Pending Admissions as a distinct pre-admission stage.
- Successful/proceeding completed pre-screenings automatically enter Pending Admissions.
- Pending applicants do not count as intakes until Admit to Program is confirmed.
- Added streamlined waitlist Next Action controls with full manual actions retained under More.
- Added one-click Give Offer and direct Start Pre-Screening shortcuts.
- Added persistent Collapse/Expand controls to large tables.
- Refined pre-screening presentation without changing its questions or branching flow.
- Added Pending Admissions dashboard visibility and professional UI polish.


v5.5.24: Tightened waitlist desktop columns without wrapping; Notes links now show View (count); completed pre-screens display Pre-Screened instead of Offer Given + Pre-Screened.


## v5.5.25
Adaptive content-width tables enforced globally; kbrh-v5.css references cache-busted so deployed browsers load the new rules immediately.


## v5.5.28
Corrected full-width dynamic table sizing. Waitlist Last Call-In is elastic; both primary and More controls are contained side-by-side within the Actions column.


## v5.5.28
Fixed false pre-screening save-conflict verification that blocked edits and Pending Admission transitions after a successful Firestore transaction.


## v5.5.29
- Standardized the primary navigation panel across all application pages to match the Roster navigation.
- Preserves page-specific active highlighting and admin-only Settings visibility.


## v5.5.31
- Added global automatic capitalization for person names, city/province, emergency/contact names, employer/source and referral/organization fields.
- Address/street text uses title-style capitalization.
- Email, phone, postal code, notes, counselling, medication/medical and narrative fields are intentionally excluded.
- Capitalization changes the actual input value so saved Firestore data uses the normalized capitalization.

v5.5.40 — Restricted Phase 2 Log Book
- Adds a separate Phase 2 digital log book.
- Phase 2 access is restricted in the UI to attendantj@kbrh.local, executivedirector@kbrh.local, and admin@kbrh.local.
- Authorized users can switch between Phase 1 and Phase 2 logs.
- Phase 2 resident selectors show current Phase 2 residents only; Phase 1 selectors show current Phase 1 residents.
- Entries, edits, live display, and date reports remain separated by log book.
