import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

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

async function checkLatest() {
  const q = query(collection(db, "issues"), orderBy("createdAt", "desc"), limit(3));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    console.log(`Document ID: ${doc.id}`);
    console.dir(doc.data(), { depth: null });
    console.log("-----------------------");
  });
}

checkLatest();
