import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase-init.js";
import fs from "fs";

// To run this script: npx tsx scripts/fullDatabaseAudit.ts
// Requires temporary rules elevation to read all collections.

async function auditDatabase() {
  console.log("Starting NexCivic Database Audit (READ-ONLY)...\n");
  const report: string[] = [];
  let errorCount = 0;

  const logError = (msg: string) => {
    console.error(msg);
    report.push(`[ERROR] ${msg}`);
    errorCount++;
  };

  const logInfo = (msg: string) => {
    console.log(msg);
    report.push(`[INFO] ${msg}`);
  };

  try {
    // 1. Audit Users
    logInfo("Auditing 'users' collection...");
    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (!data.role) logError(`User ${doc.id} missing role.`);
      else if (!["CITIZEN", "FIELD_INSPECTOR", "MUNICIPALITY_HQ"].includes(data.role)) {
        logError(`User ${doc.id} has invalid role: ${data.role}`);
      }
      if (data.uid && data.uid !== doc.id) logError(`User ${doc.id} uid mismatch: ${data.uid}`);
    });
    logInfo(`Scanned ${usersSnap.size} users.`);

    // 2. Audit Issues
    logInfo("\nAuditing 'issues' collection...");
    const issuesSnap = await getDocs(collection(db, "issues"));
    issuesSnap.forEach((doc) => {
      const data = doc.data();
      if (!data.complaintId) logError(`Issue ${doc.id} missing complaintId.`);
      if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
        logError(`Issue ${doc.id} has invalid coordinates: lat=${data.latitude}, lng=${data.longitude}`);
      }
      if (!data.status) logError(`Issue ${doc.id} missing status.`);
      if (data.timeline && Array.isArray(data.timeline)) {
        data.timeline.forEach((item: any, i: number) => {
          if (!item.id || typeof item.id !== "string") {
            logError(`Issue ${doc.id} timeline[${i}] has invalid id: ${item.id}`);
          }
        });
      } else {
        logError(`Issue ${doc.id} missing or invalid timeline array.`);
      }
    });
    logInfo(`Scanned ${issuesSnap.size} issues.`);

    // 3. Audit Notifications
    logInfo("\nAuditing 'notifications' collection...");
    const notifSnap = await getDocs(collection(db, "notifications"));
    notifSnap.forEach((doc) => {
      const data = doc.data();
      if (!data.userUID) logError(`Notification ${doc.id} missing userUID.`);
      if (data.userId) logError(`Notification ${doc.id} contains legacy field 'userId'.`);
    });
    logInfo(`Scanned ${notifSnap.size} notifications.`);

    // 4. Audit Counters
    logInfo("\nAuditing 'counters' collection...");
    try {
      const countersSnap = await getDocs(collection(db, "counters"));
      countersSnap.forEach((doc) => {
        const data = doc.data();
        if (typeof data.currentSequence !== "number") logError(`Counter ${doc.id} has invalid currentSequence: ${data.currentSequence}`);
      });
      logInfo(`Scanned ${countersSnap.size} counters.`);
    } catch (err: any) {
      logError(`Failed to audit counters: ${err.message}`);
    }

    // 5. Audit Zones
    logInfo("\nAuditing 'zones' collection...");
    try {
      const zonesSnap = await getDocs(collection(db, "zones"));
      zonesSnap.forEach((doc) => {
        const data = doc.data();
        if (!data.inspectorUID) logError(`Zone ${doc.id} missing inspectorUID.`);
      });
      logInfo(`Scanned ${zonesSnap.size} zones.`);
    } catch (err: any) {
      logError(`Failed to audit zones: ${err.message}`);
    }

    // Write Report
    logInfo(`\nAudit complete. Found ${errorCount} inconsistencies.`);
    fs.writeFileSync("audit_results_phase4.txt", report.join("\n"));
    console.log("Report written to audit_results_phase4.txt");
    process.exit(0);

  } catch (error) {
    console.error("FATAL AUDIT ERROR:", error);
    process.exit(1);
  }
}

auditDatabase();
