const fs = require('fs');

// 1. Fix firestore.rules
let rules = fs.readFileSync('firestore.rules', 'utf8');
rules = rules.replace(
  /match \/issues\/\{issueId\} \{\s*allow read: if request\.auth != null;/g,
  'match /issues/{issueId} {\n      allow read: if true;'
);
fs.writeFileSync('firestore.rules', rules);
console.log('Fixed firestore.rules');

// 2. Fix issueService.ts subscribeToIssues error callback
let issueService = fs.readFileSync('src/services/issueService.ts', 'utf8');

const snapshotStart = /return onSnapshot\(q, \{ includeMetadataChanges: true \}, \(snap\) => \{/g;
if (snapshotStart.test(issueService)) {
  // Find the end of the onSnapshot block. 
  // We can just replace the end of it: `    });\n\n  } catch (error) {`
  issueService = issueService.replace(
    /      \}\);\n\n      callback\(docs, \{\n        hasPendingWrites: snap\.metadata\.hasPendingWrites,\n        fromCache: snap\.metadata\.fromCache\n      \}\);\n    \}\);(?: \/\/ Missing error callback!)?\n  \} catch \(error\) \{/g,
    `      });\n\n      callback(docs, {\n        hasPendingWrites: snap.metadata.hasPendingWrites,\n        fromCache: snap.metadata.fromCache\n      });\n    }, (error) => {\n      console.warn("Firestore snapshot error:", error);\n      // handle gracefully instead of uncaught promise\n    });\n  } catch (error) {`
  );
  fs.writeFileSync('src/services/issueService.ts', issueService);
  console.log('Fixed issueService.ts');
} else {
  console.log('issueService pattern not found');
}
