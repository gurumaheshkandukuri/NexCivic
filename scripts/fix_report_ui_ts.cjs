const fs = require('fs');
let code = fs.readFileSync('src/components/ReportIssue.tsx', 'utf8');

// 1. Remove setCity calls from GPS fetching
code = code.replace(/setCity\(fetchedCity\);/g, '// city removed from state');

// 2. Fix fullDetailsLocation string
code = code.replace(/const fullDetailsLocation = `\$\{landmark \? `\$\{landmark\}, ` : ""\}\$\{district\}, \$\{city\}`;/g, 'const fullDetailsLocation = `${landmark ? `${landmark}, ` : ""}${district}, ${ulb}`;');

// 3. Fix createIssue object
code = code.replace(/state: "Maharashtra",\s*ulb: "BMC",\s*area: city,/g, 'state: state,\n        ulb: ulb,\n        area: ulb,');

fs.writeFileSync('src/components/ReportIssue.tsx', code);
console.log('Fixed compile errors in ReportIssue.tsx');
