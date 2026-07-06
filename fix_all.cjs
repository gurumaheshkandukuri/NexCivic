const fs = require('fs');

// App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/<CitizenDashboard user=\{user\} issues=\{issues\} setActiveTab=\{setActiveTab\} \/>/g, '<CitizenDashboard user={user} issues={issues} />');
fs.writeFileSync('src/App.tsx', app);

// AdminPanel.tsx
let admin = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
admin = admin.replace(/address,/g, 'landmark: address,');
admin = admin.replace(/const file = e\.target\.files\?\.\[0\];/g, 'const file = e.target.files?.[0] as File;');
fs.writeFileSync('src/components/AdminPanel.tsx', admin);

// CitizenDashboard.tsx
let cit = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');
cit = cit.replace(/status === "Open"/g, 'status === "Submitted"');
cit = cit.replace(/onClick=\{\(\) => onClick\(issue\)\}/g, 'onClick={() => setSelectedIssue(issue)}');
cit = cit.replace(/key=\{issue\.id\}/g, 'key={issue.uid}');
cit = cit.replace(/const handleAddComment = \(\) => \{\};/g, 'const handleAddComment = (commentText: string) => {};');
cit = cit.replace(/const handleSubmitRating = \(\) => \{\};/g, 'const handleSubmitRating = (rating: number) => { onRefresh(); };\n  const onRefresh = () => {};');
fs.writeFileSync('src/components/CitizenDashboard.tsx', cit);

// MunicipalityMgrDashboard.tsx
let muni = fs.readFileSync('src/components/MunicipalityMgrDashboard.tsx', 'utf8');
muni = muni.replace(/address,/g, 'landmark: address,');
fs.writeFileSync('src/components/MunicipalityMgrDashboard.tsx', muni);

// Navbar.tsx
let nav = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
nav = nav.replace(/user\.role === "Citizen"/g, 'user.role === ROLES.CITIZEN');
nav = nav.replace(/user\.role === "Authority"/g, 'user.role === ROLES.FIELD_INSPECTOR');
nav = nav.replace(/user\.role === "MunicipalityMgr"/g, 'user.role === ROLES.MUNICIPALITY_HQ');
nav = nav.replace(/user\.points/g, 'user.xp');
fs.writeFileSync('src/components/Navbar.tsx', nav);

// issueService.ts
let issueSvc = fs.readFileSync('src/services/issueService.ts', 'utf8');
issueSvc = issueSvc.replace(/status: newStatus,/g, 'id: `${Date.now()}_${Math.random()}`,\n          status: newStatus,');
issueSvc = issueSvc.replace(/export const updateIssueStatus = async \(issueId: string, newStatus: StatusType, updateData: Partial<Issue> = \{\}\) => \{/g, 'export const updateIssueStatus = async (issueId: string, newStatus: StatusType, updateData: Partial<Issue> = {}, user?: any) => {');
fs.writeFileSync('src/services/issueService.ts', issueSvc);

console.log('Fixed bulk errors');
