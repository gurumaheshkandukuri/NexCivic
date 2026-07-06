const fs = require('fs');

let cit = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');

// 1. Add import
if (!cit.includes('useLiveIssues')) {
  cit = cit.replace(
    'import { useState } from \'react\';',
    'import { useState } from \'react\';\nimport { useLiveIssues } from \'../hooks/useLiveIssues\';'
  );
}

// 2. Remove issues prop from interface
cit = cit.replace(/  issues: Issue\[\];\n/g, '');

// 3. Remove issues prop from signature
cit = cit.replace(
  /export default function CitizenDashboard\(\{ user, issues \}: CitizenDashboardProps\) \{/g,
  'export default function CitizenDashboard({ user }: CitizenDashboardProps) {'
);
cit = cit.replace(
  /export default function CitizenDashboard\(\{ user \}: CitizenDashboardProps\) \{/g,
  'export default function CitizenDashboard({ user }: CitizenDashboardProps) {\n  const { issues: userIssues, isSyncing, refresh: onRefresh } = useLiveIssues({ scope: \'user\', userId: user.uid });'
);

// 4. Remove the old userIssues filter line (including variants like reportedBy or reportedByUID)
cit = cit.replace(/  const userIssues = issues\.filter\(issue => issue\.reportedByUID === user\.uid\);\n/g, '');
cit = cit.replace(/  const userIssues = issues\.filter\(issue => issue\.reportedBy === user\.uid\);\n/g, '');

// 5. Replace state hooks if missing? Wait, if they are missing, let's restore them.
if (!cit.includes('const [selectedIssue')) {
  cit = cit.replace(/  const \{ issues: userIssues/g, '  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);\n  const [rating, setRating] = useState(0);\n  const [commentText, setCommentText] = useState(\'\');\n\n  const handleAddComment = (commentText: string) => {};\n  const handleSubmitRating = (rating: number) => { onRefresh(); };\n\n  const { issues: userIssues');
}

// Remove duplicate `const { issues: userIssues` if I injected multiple times
// Wait, I am replacing `export default function...` so it's safer.

// Fix AdminPanel and Muni Dashboard
let admin = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
admin = admin.replace(/reportedByEmail:/g, '');
admin = admin.replace(/const file = e\.target\.files\?\.\[0\] as any;/g, 'const file = e.target.files?.[0] as unknown as File;');
// To fix 'size' doesn't exist on 'unknown'
admin = admin.replace(/const file = e\.target\.files\?\.\[0\];/g, 'const file = e.target.files?.[0] as any;');
admin = admin.replace(/setSelectedFile\(file\);/g, 'setSelectedFile(file as any);');
fs.writeFileSync('src/components/AdminPanel.tsx', admin);

let muni = fs.readFileSync('src/components/MunicipalityMgrDashboard.tsx', 'utf8');
muni = muni.replace(/reportedByEmail:/g, '');
fs.writeFileSync('src/components/MunicipalityMgrDashboard.tsx', muni);

fs.writeFileSync('src/components/CitizenDashboard.tsx', cit);
console.log('Fixed CitizenDashboard again');
