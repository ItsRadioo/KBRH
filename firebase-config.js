const firebaseConfig = {
  apiKey: "AIzaSyA_SxK18sGoJDDcPq1jWkJ1MWc15-ArBBc",
  authDomain: "kbrh-chore-assignment.firebaseapp.com",
  projectId: "kbrh-chore-assignment",
  storageBucket: "kbrh-chore-assignment.firebasestorage.app",
  messagingSenderId: "13613958689",
  appId: "1:13613958689:web:9e6ae5537756e529490560"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
