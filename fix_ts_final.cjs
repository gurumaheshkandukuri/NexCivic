const fs = require('fs');

// CitizenDashboard.tsx
let cit = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');
cit = cit.replace(/const userIssues = issues\.filter\(issue => issue\.reportedByUID === user\.uid\);\n/g, '');
cit = cit.replace(/user\.id/g, 'user.uid');
cit = cit.replace(/user\.points/g, 'user.xp');
fs.writeFileSync('src/components/CitizenDashboard.tsx', cit);

// AdminPanel.tsx
let admin = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
admin = admin.replace(/reporterEmail:/g, 'reportedByEmail:');
admin = admin.replace(/const file = e\.target\.files\?\.\[0\] as any;/g, 'const file = e.target.files?.[0] as unknown as File;');
fs.writeFileSync('src/components/AdminPanel.tsx', admin);

// MunicipalityMgrDashboard.tsx
let muni = fs.readFileSync('src/components/MunicipalityMgrDashboard.tsx', 'utf8');
muni = muni.replace(/reporterEmail:/g, 'reportedByEmail:');
fs.writeFileSync('src/components/MunicipalityMgrDashboard.tsx', muni);

console.log('Fixed TS errors');
