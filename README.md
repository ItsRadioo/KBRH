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
