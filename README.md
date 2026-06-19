# Resident Chore Rotator — Full Staff Password Version

Static GitHub Pages website with:

- General staff password login
- Resident roster saved in browser memory
- Edit/archive/delete residents
- Away/omit status
- Away until date for passes/weekend leave
- Automatic return after away-until date passes
- Manual first chore assignment
- Rotate button
- Blocked chore exceptions
- Locked chore exception: resident cannot be rotated off a specific chore
- Rotation history log
- Export backup JSON
- Import backup JSON
- Separate meal chores page
- Printable chore sheet page

## Default Password

```text
changeme
```

Change this before entering real information.

## Storage

This version uses browser localStorage. Data stays on the computer/browser where it is entered.

Use Export Backup regularly.

## Template Note

The current print page uses a clean built-in template.

When you provide your exact chore template, replace or adapt `print.html` and `print.js` so the generated resident names and chores are placed into the correct template fields.


## Template Print Pages

- `print.html` recreates the uploaded weekly chore spreadsheet template in HTML and fills resident names based on active house chore assignments.
- `meal-print.html` recreates the uploaded meal/cooking schedule template and fills it from the Meal Chores page.
- The uploaded original templates are included for reference: `Resident_Chore_Schedule.xlsx` and `Resident_Cooking_Schedule.docx`.
