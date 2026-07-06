const fs = require('fs');

// App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/<CitizenDashboard\s+user=\{user\}\s+issues=\{issues\}\s+setActiveTab=\{setActiveTab\}\s*\/>/g, '<CitizenDashboard user={user} issues={issues} />');
fs.writeFileSync('src/App.tsx', app);

// AdminPanel.tsx
let admin = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
admin = admin.replace(/lat,/g, 'latitude: lat,');
admin = admin.replace(/lng,/g, 'longitude: lng,');
admin = admin.replace(/const file = e\.target\.files\?\.\[0\];/g, 'const file = e.target.files?.[0] as any;');
admin = admin.replace(/const file = e\.target\.files\?\.\[0\] as File;/g, 'const file = e.target.files?.[0] as any;');
fs.writeFileSync('src/components/AdminPanel.tsx', admin);

// CitizenDashboard.tsx
let cit = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');
cit = cit.replace(/status === "Open"/g, 'status === "Submitted"');
cit = cit.replace(/onClick=\{\(\) => onClick\(issue\)\}/g, 'onClick={() => setSelectedIssue(issue)}');
cit = cit.replace(/key=\{issue\.id\}/g, 'key={issue.uid}');
fs.writeFileSync('src/components/CitizenDashboard.tsx', cit);

// MunicipalityMgrDashboard.tsx
let muni = fs.readFileSync('src/components/MunicipalityMgrDashboard.tsx', 'utf8');
muni = muni.replace(/lat,/g, 'latitude: lat,');
muni = muni.replace(/lng,/g, 'longitude: lng,');
fs.writeFileSync('src/components/MunicipalityMgrDashboard.tsx', muni);

// issueService.ts
let issueSvc = fs.readFileSync('src/services/issueService.ts', 'utf8');
// Fix missing id in TimelineItem near line 427
// Look for timeline events without id
issueSvc = issueSvc.replace(/\{\s*status:\s*([^,]+),\s*updatedByUID:/g, '{ id: `${Date.now()}_${Math.random()}`, status: $1, updatedByUID:');

// Fix createActivityLog in line 861 (remove the 4th argument)
issueSvc = issueSvc.replace(/createActivityLog\(user\.uid, `Submitted recommendation \$\{recommendation\} for issue \$\{issueId\}`,\s*user\.role,\s*issueId\);/g, 'createActivityLog(user.uid, `Submitted recommendation ${recommendation} for issue ${issueId}`, user.role);');
fs.writeFileSync('src/services/issueService.ts', issueSvc);

console.log('Fixed bulk errors round 2');
