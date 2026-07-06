const fs = require('fs');
let code = fs.readFileSync('src/components/ReportIssue.tsx', 'utf8');

if (!code.includes('useLiveIssues')) {
  code = code.replace(
    'import { UserProfile, Issue } from "../types";',
    'import { UserProfile, Issue } from "../types";\nimport { useLiveIssues } from "../hooks/useLiveIssues";'
  );

  code = code.replace(
    'export default function ReportIssue({ user, onSuccess, setActiveTab }: ReportIssueProps) {',
    `export default function ReportIssue({ user, onSuccess, setActiveTab }: ReportIssueProps) {
  const { issues } = useLiveIssues({ scope: "all" });`
  );
  
  fs.writeFileSync('src/components/ReportIssue.tsx', code);
  console.log('Fixed ReportIssue.tsx');
} else {
  console.log('Already fixed ReportIssue.tsx');
}
