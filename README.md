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
