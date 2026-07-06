const fs = require('fs');

const hookFiles = [
  'src/hooks/useLiveIssues.ts',
  'src/hooks/useLiveNotifications.ts'
];

for (const file of hookFiles) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('reference types="vite/client"')) {
    c = '/// <reference types="vite/client" />\n' + c;
    fs.writeFileSync(file, c);
    console.log('Fixed ' + file);
  }
}
