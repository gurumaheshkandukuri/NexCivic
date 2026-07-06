const fs = require('fs');

let code = fs.readFileSync('src/components/ReportIssue.tsx', 'utf8');

if (!code.includes('createIssue')) {
    // Actually it does include createIssue below, but not imported
}

if (!code.includes('import { createIssue')) {
    code = code.replace(
        'import { useLiveIssues } from "../hooks/useLiveIssues";',
        'import { useLiveIssues } from "../hooks/useLiveIssues";\nimport { createIssue, confirmIssue } from "../services/issueService";'
    );
}

fs.writeFileSync('src/components/ReportIssue.tsx', code);
console.log('Fixed ReportIssue imports');
