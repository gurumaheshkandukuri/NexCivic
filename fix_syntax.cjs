const fs = require('fs');

let admin = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
admin = admin.replace(/user\.email,/g, '');
fs.writeFileSync('src/components/AdminPanel.tsx', admin);

let muni = fs.readFileSync('src/components/MunicipalityMgrDashboard.tsx', 'utf8');
muni = muni.replace(/user\.email,/g, '');
fs.writeFileSync('src/components/MunicipalityMgrDashboard.tsx', muni);

console.log('Fixed syntax error');
