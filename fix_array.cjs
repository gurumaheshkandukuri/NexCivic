const fs = require('fs');

let admin = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
admin = admin.replace(/const files = Array\.from\(e\.target\.files \|\| \[\]\);/g, 'const files = Array.from(e.target.files || []) as File[];');
fs.writeFileSync('src/components/AdminPanel.tsx', admin);

console.log('Fixed Array.from');
