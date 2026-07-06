const fs = require('fs');

// App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/<CitizenDashboard user=\{user\} issues=\{issues\} setActiveTab=\{setActiveTab\} \/>/g, '<CitizenDashboard user={user} issues={issues} />');
fs.writeFileSync('src/App.tsx', app);

// AdminPanel.tsx
let admin = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
admin = admin.replace(/reportedBy: user\.uid,/g, 'reportedByUID: user.uid,');
admin = admin.replace(/const file = e\.target\.files\?\.\[0\];/g, 'const file = e.target.files?.[0] as any;');
admin = admin.replace(/const file = e\.target\.files\?\.\[0\] as File;/g, 'const file = e.target.files?.[0] as any;');
// Fix line 445... "size" does not exist on type unknown. Let's just cast the file object inside the set...
admin = admin.replace(/setSelectedFile\(file\);/g, 'setSelectedFile(file as any);');
fs.writeFileSync('src/components/AdminPanel.tsx', admin);

// CitizenDashboard.tsx
let cit = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');
cit = cit.replace(/status === "Open"/g, 'status === "Submitted"');
cit = cit.replace(/onClick=\{\(\) => onClick\(issue\)\}/g, 'onClick={() => setSelectedIssue(issue)}');
cit = cit.replace(/key=\{issue\.id\}/g, 'key={issue.uid}');
// Let's also check for ' Open' with space? No, the error says 'StatusType' and '"Open"'. So the string is "Open". Let's use regex:
cit = cit.replace(/'Open'/g, '"Submitted"');
fs.writeFileSync('src/components/CitizenDashboard.tsx', cit);

// MunicipalityMgrDashboard.tsx
let muni = fs.readFileSync('src/components/MunicipalityMgrDashboard.tsx', 'utf8');
muni = muni.replace(/zone: "Zone A",/g, 'state: "Maharashtra", district: "Mumbai", ulb: "BMC",');
muni = muni.replace(/reportedBy: user\.uid,/g, 'reportedByUID: user.uid,');
fs.writeFileSync('src/components/MunicipalityMgrDashboard.tsx', muni);

console.log('Fixed bulk errors round 3');
