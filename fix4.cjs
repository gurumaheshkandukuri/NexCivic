const fs = require('fs');

// AdminPanel.tsx
let admin = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
admin = admin.replace(/reporterName:/g, 'reportedByName:');
fs.writeFileSync('src/components/AdminPanel.tsx', admin);

// MunicipalityMgrDashboard.tsx
let muni = fs.readFileSync('src/components/MunicipalityMgrDashboard.tsx', 'utf8');
muni = muni.replace(/reporterName:/g, 'reportedByName:');
fs.writeFileSync('src/components/MunicipalityMgrDashboard.tsx', muni);

// CitizenDashboard.tsx
let cit = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');
cit = cit.replace(/onClick=\{\(\) => onClick\(issue\)\}/g, 'onClick={() => setSelectedIssue(issue)}');
cit = cit.replace(/key=\{issue\.id\}/g, 'key={issue.uid}');
fs.writeFileSync('src/components/CitizenDashboard.tsx', cit);

console.log('Fixed bulk errors round 4');
