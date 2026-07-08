import { initializeApp } from "firebase/app";
import { getFirestore, doc, collection, runTransaction, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

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
const storage = getStorage(app);

async function testPipeline() {
  const newIssueRef = doc(collection(db, "issues"));
  const complaintId = "NC-TEST-001";
  
  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(newIssueRef, {
        complaintId,
        imageUrl: null,
        title: "Test Pipeline",
        createdAt: serverTimestamp()
      });
    });
    console.log("Transaction finished");

    const storageRef = ref(storage, `issues/${complaintId}/citizen_upload_test.jpg`);
    console.log("Uploading bytes...");
    
    // Node.js doesn't have File easily, use uploadString for base64 test
    await uploadString(storageRef, 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAP...', 'data_url');
    console.log("Uploaded bytes");

    const uploadedImageUrl = await getDownloadURL(storageRef);
    console.log("Got download URL:", uploadedImageUrl);

    await updateDoc(newIssueRef, {
      imageUrl: uploadedImageUrl
    });
    console.log("Firestore imageUrl updated with:", uploadedImageUrl);

  } catch (e) {
    console.error("Pipeline failed:", e);
  }
}

testPipeline();
