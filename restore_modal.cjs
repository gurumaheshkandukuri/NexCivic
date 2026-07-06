const fs = require('fs');

const oldCode = fs.readFileSync('old_dashboard_utf8.tsx', 'utf8');
const newCode = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');

// Extract modal
const modalStartIdx = oldCode.indexOf('{/* DETAIL MODAL WITH PROGRESS TIMELINE */}');
const modalEndIdx = oldCode.indexOf('    </div>\n  );\n}\n');
const modalCode = oldCode.substring(modalStartIdx, modalEndIdx);

let updatedCode = newCode.replace('import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar, Star, Download, Plus } from \'lucide-react\';', 'import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar, Star, Download, Plus, Clock, MessageSquare, X } from \'lucide-react\';');

updatedCode = updatedCode.replace('import { submitResolutionRating } from \'../services/issueService\';', 'import { submitResolutionRating, addCommentToIssue, submitIssueRating } from \'../services/issueService\';');

// Add onClick to CitizenIssueCard props
updatedCode = updatedCode.replace(
  'function CitizenIssueCard({ issue, user, onRefresh }: { issue: Issue, user: UserProfile, onRefresh?: () => void }) {',
  'function CitizenIssueCard({ issue, user, onRefresh, onClick }: { issue: Issue, user: UserProfile, onRefresh?: () => void, onClick?: () => void }) {'
);

updatedCode = updatedCode.replace(
  'className={`${clayCardStyle} flex flex-col group`}',
  'className={`${clayCardStyle} flex flex-col group cursor-pointer`} onClick={onClick}'
);

updatedCode = updatedCode.replace(
  'export default function CitizenDashboard({ user, setActiveTab }: CitizenDashboardProps) {',
  `export default function CitizenDashboard({ user, setActiveTab }: CitizenDashboardProps) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [commentText, setCommentText] = useState("");
  const [rating, setRating] = useState<number>(5);

  const handleAddComment = async (issueId: string) => {
    if (!commentText.trim()) return;
    await addCommentToIssue(issueId, {
      userId: user.uid,
      name: user.name,
      text: commentText,
      role: "Citizen"
    });
    setCommentText("");
  };

  const handleSubmitRating = async (issueId: string) => {
    await submitIssueRating(issueId, rating, user.uid);
  };
`
);

// Map the click handler on the list of cards
updatedCode = updatedCode.replace(
  '<CitizenIssueCard key={issue.complaintId || issue.uid} issue={issue} user={user} />',
  '<CitizenIssueCard key={issue.complaintId || issue.uid} issue={issue} user={user} onClick={() => setSelectedIssue(issue)} />'
);

// Replace "X" char with lucide X icon or simple X
let liveModalCode = modalCode.replace('Γ£ò', '<X className="w-6 h-6" />');

// Inject modal before the final </div>
const mainEndIdx = updatedCode.lastIndexOf('</div>\n  );\n}');

// But we need to use the LIVE selected issue
liveModalCode = liveModalCode.replace(/selectedIssue/g, 'currentSelectedIssue');
liveModalCode = `
      {/* Live issue mapping */}
      {(() => {
        const currentSelectedIssue = selectedIssue ? issues.find(i => i.id === selectedIssue.id) || selectedIssue : null;
        return (
          <>
            ${liveModalCode}
          </>
        );
      })()}
`;

updatedCode = updatedCode.substring(0, mainEndIdx) + liveModalCode + updatedCode.substring(mainEndIdx);

fs.writeFileSync('src/components/CitizenDashboard.tsx', updatedCode);
console.log('Modal injected successfully.');
