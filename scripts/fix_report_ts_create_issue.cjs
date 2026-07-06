const fs = require('fs');
let code = fs.readFileSync('src/components/ReportIssue.tsx', 'utf8');

// Replace createIssue(...) call
code = code.replace(
  /const id = await createIssue\(\{[\s\S]*?\}\);/,
  `const id = await createIssue({
        title,
        description,
        category,
        priority,
        status: "Open",
        latitude: lat,
        longitude: lng,
        district: district,
        state: "Maharashtra",
        ulb: "BMC",
        area: city,
        landmark: landmark,
        address: address || fullDetailsLocation,
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

fs.writeFileSync('src/components/ReportIssue.tsx', code);
console.log('Fixed ReportIssue createIssue');
