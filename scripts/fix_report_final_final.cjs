const fs = require('fs');
let code = fs.readFileSync('src/components/ReportIssue.tsx', 'utf8');

// Ensure imports
if (!code.includes('import { createIssue')) {
    code = code.replace(
        'import { useLiveIssues } from "../hooks/useLiveIssues";',
        'import { useLiveIssues } from "../hooks/useLiveIssues";\nimport { createIssue, confirmIssue } from "../services/issueService";'
    );
}

// Replace the createIssue call completely
code = code.replace(
  /const id = await createIssue\(\{[\s\S]*?\}\);/m,
  `const res = await createIssue({
        title,
        description,
        category,
        priority,
        status: "Open",
        latitude: lat,
        longitude: lng,
        district: district,
        state: state,
        ulb: ulb,
        area: city,
        landmark: landmark,
        address: address || \`\${landmark ? landmark + ", " : ""}\${district}, \${ulb}\`,
        reportedByUID: user.uid,
        reportedByName: user.name,
        assignedInspectorEmail: user.email,
        communitySupportCount: 0,
        inspectionImages: [],
        resolutionImages: [],
        timeline: [],
        comments: [],
        imageUrl: image || ""
      } as any);`
);

// Replace confirmIssue
code = code.replace(/confirmIssue\(similarIssue\.id, user\.uid, user\.name\)/g, 'confirmIssue(similarIssue.id || "", user.uid, user.name)');

// Reapply my offline queue fix for the return logic (res vs id)
code = code.replace(
  /setCreatedId\(id\);\n      setSuccess\(true\);/m,
  `if (!res) {\n        alert('Queued for sync: The network is currently unavailable. Your complaint will be synchronized once the connection is restored.');\n        setCreatedId('offline-queued');\n        setSuccess(true);\n      } else {\n        setCreatedId(res.id);\n        setSuccess(true);\n      }`
);

fs.writeFileSync('src/components/ReportIssue.tsx', code);
console.log('Fixed ReportIssue createIssue arguments and imports');
