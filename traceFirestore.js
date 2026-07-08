import { initializeApp } from "firebase/app";
import { getFirestore, doc, collection, runTransaction, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCl4mQ-SkSV-u63hspS5-eDM5x83a13_ig",
  authDomain: "nexcivic-49dbe.firebaseapp.com",
  projectId: "nexcivic-49dbe",
  storageBucket: "nexcivic-49dbe.firebasestorage.app",
  messagingSenderId: "296161779327",
  appId: "1:296161779327:web:8e3a2b72a4e21b777a8844",
  measurementId: "G-Q7Y2KKXC1W"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testTrace() {
  const newIssueRef = doc(collection(db, "issues"));
  const complaintId = "NC-TRACE-001";
  
  try {
    console.log("TRACE: Start transaction");
    await runTransaction(db, async (transaction) => {
      // Just set a dummy payload
      transaction.set(newIssueRef, {
        complaintId,
        imageUrl: null,
      });
    });
    console.log("TRACE: Transaction committed");

    // We skip storage upload to test updateDoc directly
    const fakeUrl = "https://example.com/fake.jpg";
    
    console.log("TRACE: Calling updateDoc");
    await updateDoc(newIssueRef, {
      imageUrl: fakeUrl
    });
    console.log("TRACE: updateDoc finished");

  } catch (e) {
    console.error("TRACE ERROR:", e);
  }
}

testTrace();
