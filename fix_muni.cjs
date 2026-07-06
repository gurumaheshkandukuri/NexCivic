const fs = require('fs');
let c = fs.readFileSync('src/components/MunicipalityMgrDashboard.tsx','utf8');
c = c.replace(/categoriesList/g, 'CATEGORY_LIST');
c = c.replace(/status: "Open",/g, 'status: "Submitted",');
c = c.replace(/onRefresh\(\);/g, '');
fs.writeFileSync('src/components/MunicipalityMgrDashboard.tsx', c);
console.log('Fixed MunicipalityMgrDashboard');
