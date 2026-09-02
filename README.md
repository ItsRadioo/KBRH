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
