const fs = require('fs');

// Fix App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/<CitizenDashboard user=\{user\} issues=\{\[\]\} \/>/g, '<CitizenDashboard user={user} />');
fs.writeFileSync('src/App.tsx', app);

// Fix CitizenDashboard.tsx
let cit = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');
cit = cit.replace(
  /const \{ issues: userIssues, isSyncing, refresh: onRefresh \} = useLiveIssues\(\{ scope: 'user', userId: user\.uid \}\);/g,
  'const { issues: userIssues, isSyncing } = useLiveIssues({ scope: \'user\', userId: user.uid });\n  const onRefresh = () => {};'
);
fs.writeFileSync('src/components/CitizenDashboard.tsx', cit);

console.log('Fixed App.tsx and CitizenDashboard.tsx refresh');
