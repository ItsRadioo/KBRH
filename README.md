# KBRH Resident Chore Rotator — Firebase/Firestore Version

This version stores residents, chores, locks, away status, meal schedules, and history in Firebase Firestore so all logged-in staff see the same data from any device.

## Upload These Files

Upload all files to the root of your GitHub repository.

Important files:
- index.html
- login.html
- meal-chores.html
- print.html
- style.css
- script.js
- meal-chores.js
- print.js
- template-export.js
- auth.js
- data-store.js
- firebase-config.js
- Resident_Chore_Schedule.xlsx
- firestore.rules

## Firebase Setup

1. Go to Firebase Console.
2. Create a project.
3. Create a Web App.
4. Copy the Firebase config into `firebase-config.js`.
5. Go to Authentication.
6. Enable Email/Password sign-in.
7. Add staff users under Authentication → Users.
8. Go to Firestore Database.
9. Create a database.
10. Add these rules:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /kbrh/choreTracker {
      allow read, write: if request.auth != null;
    }
  }
}
```

## How Staff Use It

Staff only use the website. They do not need to open Firebase.

- Log in
- Add/edit/archive residents
- Mark away until date
- Rotate chores
- Generate meal week
- Print/export template

## Migrating Old Browser Data

On the device that already has the correct resident list:

1. Log in to the new Firebase version.
2. Go to House Chores.
3. Click **Migrate This Browser Data Online**.
4. Confirm.

After that, other devices should see the shared data after logging in.
