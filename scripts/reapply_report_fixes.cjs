const fs = require('fs');

try {
  let code = fs.readFileSync('src/components/ReportIssue.tsx', 'utf8');

  // Fix 1: App.tsx required issues prop
  code = code.replace(
    'export default function ReportIssue({ user, issues, onSuccess, setActiveTab }: ReportIssueProps) {',
    'export default function ReportIssue({ user, onSuccess, setActiveTab }: ReportIssueProps) {'
  );

  // Fix 2: Remove dbService
  code = code.replace(
    /import \{[^}]*\} from "\.\.\/dbService";\n?/g,
    ''
  );

  // Fix 3: Issue coordinates
  code = code.replace(/issue\.lat/g, 'issue.latitude');
  code = code.replace(/issue\.lng/g, 'issue.longitude');

  // Fix 4: User profile zone to region? wait, in UserProfile type, it's usually `district` or `region` or just omitted.
  code = code.replace(/user\.zone/g, 'user.district');

  // Fix 5: user.id to user.uid
  code = code.replace(/user\.id/g, 'user.uid');

  // Fix 6: useLiveIssues
  if (!code.includes('useLiveIssues')) {
    code = code.replace(
      'import { UserProfile, Issue } from "../types";',
      'import { UserProfile, Issue } from "../types";\nimport { useLiveIssues } from "../hooks/useLiveIssues";'
    );
    code = code.replace(
      'export default function ReportIssue({ user, onSuccess, setActiveTab }: ReportIssueProps) {',
      'export default function ReportIssue({ user, onSuccess, setActiveTab }: ReportIssueProps) {\n  const { issues } = useLiveIssues({ scope: "all" });'
    );
  }

  // Remove `issues: Issue[];` from ReportIssueProps if it exists
  code = code.replace(/issues: Issue\[\];\n?/g, '');

  fs.writeFileSync('src/components/ReportIssue.tsx', code);
  console.log('Reapplied ReportIssue fixes successfully');
} catch(e) {
  console.error(e);
}
