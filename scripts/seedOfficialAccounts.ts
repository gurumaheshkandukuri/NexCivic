import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json" assert { type: "json" };
import { OFFICIAL_ACCOUNTS } from "../src/config/officialAccounts";
import { locationData } from "../src/constants/locations";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SEED_PASSWORD = "NexCivic@2026";

async function seed() {
  console.log("Starting NexCivic official accounts seeding script...");
  let createdCount = 0;
  let updatedCount = 0;

  for (const account of OFFICIAL_ACCOUNTS) {
    let uid = "";
    let isNewUser = false;
    
    try {
      console.log(`\nProcessing account: ${account.email}`);
      const userCred = await createUserWithEmailAndPassword(auth, account.email, SEED_PASSWORD);
      uid = userCred.user.uid;
      isNewUser = true;
      console.log(`[AUTH] Successfully created auth user. UID: ${uid}`);
      createdCount++;
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        console.log(`[AUTH] User ${account.email} already exists. Logging in to get UID...`);
        try {
          const userCred = await signInWithEmailAndPassword(auth, account.email, SEED_PASSWORD);
          uid = userCred.user.uid;
          console.log(`[AUTH] Found existing UID: ${uid}`);
          updatedCount++;
        } catch (signInErr) {
          console.error(`[ERROR] Failed to sign in existing user ${account.email}. Ensure the password is correct:`, signInErr);
          continue;
        }
      } else {
        console.error(`[ERROR] Failed to create user ${account.email}:`, err);
        continue;
      }
    }

    try {
      // Step 2: Determine Assigned ULBs dynamically
      let assignedULBs: string[] = [];
      if (account.assignedDistrict && account.assignedState) {
        const stateData = locationData[account.assignedState as keyof typeof locationData];
        if (stateData && stateData[account.assignedDistrict as keyof typeof stateData]) {
          assignedULBs = stateData[account.assignedDistrict as keyof typeof stateData];
        }
      } else if (!account.assignedDistrict && account.assignedState) {
        // For HQ, dynamically aggregate all ULBs in the state
        const stateData = locationData[account.assignedState as keyof typeof locationData];
        if (stateData) {
          Object.values(stateData).forEach((ulbs: any) => {
            assignedULBs.push(...ulbs);
          });
        }
      }

      console.log(`[FIRESTORE] Writing profile document for user: ${account.email} (${account.role})`);
      
      // Preserve existing createdAt if updating
      let createdAt: any = serverTimestamp();
      if (!isNewUser) {
        const existingDoc = await getDoc(doc(db, "users", uid));
        if (existingDoc.exists() && existingDoc.data().createdAt) {
          createdAt = existingDoc.data().createdAt;
        }
      }

      const userProfile = {
        uid: uid,
        name: account.email.split('@')[0],
        email: account.email,
        role: account.role,
        assignedState: account.assignedState,
        assignedDistrict: account.assignedDistrict,
        assignedULBs: assignedULBs,
        xp: 0,
        badges: [],
        createdAt: createdAt,
        lastLogin: null,
        isActive: true,
      };

      await setDoc(doc(db, "users", uid), userProfile, { merge: true });
      console.log(`[FIRESTORE] Successfully seeded Firestore profile for ${account.email}`);
    } catch (dbErr) {
      console.error(`[ERROR] Failed to write Firestore profile for user ${account.email}:`, dbErr);
    }
  }

  console.log("\n=================================");
  console.log("Seeding Complete!");
  console.log(`Accounts Created: ${createdCount}`);
  console.log(`Accounts Updated (Auth Pre-existed): ${updatedCount}`);
  console.log("=================================");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding process crashed:", err);
  process.exit(1);
});
