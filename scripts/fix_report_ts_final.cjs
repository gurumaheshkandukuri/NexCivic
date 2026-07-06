const fs = require('fs');
let code = fs.readFileSync('src/components/ReportIssue.tsx', 'utf8');

// 1. Inject useLiveIssues inside ReportIssue component body
if (!code.includes('const { issues } = useLiveIssues')) {
  code = code.replace(
    'export default function ReportIssue({ user, onSuccess, setActiveTab }: ReportIssueProps) {\n  const [title, setTitle] = useState("");',
    'export default function ReportIssue({ user, onSuccess, setActiveTab }: ReportIssueProps) {\n  const { issues } = useLiveIssues({ scope: "all" });\n  const [title, setTitle] = useState("");'
  );
}

// 2. Fix `createIssue` call arguments to match Issue type
const oldCreateIssue = `      const id = await createIssue({
        title,
        description,
        category,
        priority,
        location: city,
        address: address || fullDetailsLocation,
        lat,
        lng,
        zone: user.district || "Zone A",
        reportedBy: user.uid,
        reporterName: user.name,
        reporterEmail: user.email,
        imageUrl: image || "",
        suggestedDepartment: ''
      });`;

const newCreateIssue = `      const id = await createIssue({
        title,
        description,
        category,
        priority,
        status: "Open",
        latitude: lat,
        longitude: lng,
        district: district,
        state: "Maharashtra",
        ulb: "BMC",
        area: city,
        landmark: landmark,
        address: address || fullDetailsLocation,
        reportedByUID: user.uid,
        reportedByName: user.name,
        assignedInspectorEmail: user.email,
        communitySupportCount: 0,
        inspectionImages: [],
        resolutionImages: [],
        timeline: [],
        comments: [],
        imageUrl: image || ""
      } as any);`;

code = code.replace(oldCreateIssue, newCreateIssue);

// 3. Fix confirmIssue 
code = code.replace('confirmIssue(similarIssue.id, user.uid, user.name)', 'confirmIssue(similarIssue.id || "", user.uid, user.name)');

fs.writeFileSync('src/components/ReportIssue.tsx', code);
console.log('Fixed ReportIssue compilation errors');
