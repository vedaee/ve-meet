// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBPOpJXtLGkYHB23JCd3shbkb96-nPu684",
  authDomain: "kbc-buzzer.firebaseapp.com",
  databaseURL: "https://kbc-buzzer-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kbc-buzzer",
  storageBucket: "kbc-buzzer.appspot.com",
  messagingSenderId: "219551427564",
  appId: "1:219551427564:web:2aae1660750bcbc20b2ec9"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Export for use in Room.js
export { db, ref, set, push, onValue };
