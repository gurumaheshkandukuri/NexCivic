const fs = require('fs');
let c = fs.readFileSync('src/utils/analytics/inspectorAnalytics.ts','utf8');
c = c.replace(/"Awaiting_HQ"/g, '"Awaiting HQ Review"');
c = c.replace(/status === "Open"/g, 'status === "Submitted"');
fs.writeFileSync('src/utils/analytics/inspectorAnalytics.ts', c);
console.log('Fixed inspectorAnalytics.ts');

let d = fs.readFileSync('src/hooks/useLiveAnalytics.ts','utf8');
d = d.replace(/generateInspectorAnalytics\(issues, user\.uid\)/g, 'generateInspectorAnalytics(issues)');
fs.writeFileSync('src/hooks/useLiveAnalytics.ts', d);
console.log('Fixed useLiveAnalytics.ts');
