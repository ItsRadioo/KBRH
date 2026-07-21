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
