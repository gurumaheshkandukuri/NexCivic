import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import fs from "fs";

// Read Firebase config
const configPath = decodeURIComponent(new URL('../firebase-applet-config.json', import.meta.url).pathname);
// Handle windows path issue with URL
const fixedPath = configPath.replace(/^\/([A-Za-z]:)/, '$1');
const firebaseConfig = JSON.parse(fs.readFileSync(fixedPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function auditDatabase() {
    console.log("Starting Database Audit...");
    try {
        await signInWithEmailAndPassword(auth, "aphq@nexcivic.org", "NexCivic@2026");
        console.log("Authenticated for audit.");
    } catch (e) {
        console.error("Auth failed:", e.message);
        process.exit(1);
    }
    let auditReport = {
        deletedUsers: 0,
        normalizedIssues: 0,
        deletedIssues: 0,
        deletedNotifications: 0
    };

    try {
        // 1. Audit Users
        const usersSnap = await getDocs(collection(db, "users"));
        for (const userDoc of usersSnap.docs) {
            const data = userDoc.data();
            let updates = {};
            
            // Fix Roles
            if (data.role === "Citizen") updates.role = "CITIZEN";
            if (data.role === "FieldInspector") updates.role = "FIELD_INSPECTOR";
            if (data.role === "MunicipalityHQ") updates.role = "MUNICIPALITY_HQ";
            
            if (Object.keys(updates).length > 0) {
                console.log(`Normalizing User ${userDoc.id}:`, updates);
                await updateDoc(userDoc.ref, updates);
            }
            
            // Check for orphaned profiles (no UID or missing critical data)
            if (!data.uid || !data.role) {
                console.log(`Deleting invalid user profile ${userDoc.id}`);
                await deleteDoc(userDoc.ref);
                auditReport.deletedUsers++;
            }
        }

        // 2. Audit Issues
        const issuesSnap = await getDocs(collection(db, "issues"));
        for (const issueDoc of issuesSnap.docs) {
            const data = issueDoc.data();
            
            // Delete missing fields / orphaned issues
            if (!data.complaintId || !data.reportedByUID) {
                console.log(`Deleting invalid issue ${issueDoc.id}`);
                await deleteDoc(issueDoc.ref);
                auditReport.deletedIssues++;
                continue;
            }

            let updates = {};
            
            // Fix undefined coordinates
            if (data.latitude === undefined || typeof data.latitude !== "number") updates.latitude = 19.076;
            if (data.longitude === undefined || typeof data.longitude !== "number") updates.longitude = 72.8777;

            // Fix timeline IDs
            if (data.timeline && Array.isArray(data.timeline)) {
                let timelineChanged = false;
                const newTimeline = data.timeline.map((t, index) => {
                    if (!t.id) {
                        timelineChanged = true;
                        return { ...t, id: `${Date.now()}_${index}_${data.reportedByUID || 'sys'}` };
                    }
                    return t;
                });
                if (timelineChanged) {
                    updates.timeline = newTimeline;
                }
            }

            if (Object.keys(updates).length > 0) {
                console.log(`Normalizing Issue ${issueDoc.id}:`, Object.keys(updates));
                await updateDoc(issueDoc.ref, updates);
                auditReport.normalizedIssues++;
            }
        }

        console.log("Database Audit Complete.", auditReport);
    } catch (e) {
        console.error("Audit Failed:", e);
    }
    process.exit(0);
}

auditDatabase();
