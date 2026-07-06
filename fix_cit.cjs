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

// 4. Inject useLiveIssues hook
cit = cit.replace(
  /  const \[commentText, setCommentText\] = useState\(''\);/g,
  `  const [commentText, setCommentText] = useState('');\n\n  const { issues: userIssues } = useLiveIssues({ scope: 'user', userId: user.uid });`
);

// 5. Remove the old userIssues filter line
cit = cit.replace(/  const userIssues = issues\.filter\(issue => issue\.reportedByUID === user\.uid\);\n/g, '');

fs.writeFileSync('src/components/CitizenDashboard.tsx', cit);

// Let's also verify App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/<CitizenDashboard \n                  user=\{user\} \n                  issues=\{\[\]\} \n                \/>/g, '<CitizenDashboard user={user} />');
fs.writeFileSync('src/App.tsx', app);

console.log('Fixed CitizenDashboard to use useLiveIssues');
