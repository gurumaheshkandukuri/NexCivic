const fs = require('fs');

const oldCode = fs.readFileSync('old_dashboard_utf8.tsx', 'utf8');
let newCode = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');

// Extract modal
const modalStartIdx = oldCode.indexOf('{/* DETAIL MODAL WITH PROGRESS TIMELINE */}');
const modalEndIdx = oldCode.lastIndexOf('    </div>\n  );\n}\n');
let modalCode = oldCode.substring(modalStartIdx, modalEndIdx);

newCode = newCode.replace(
  "import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar, Star, Download } from 'lucide-react';",
  "import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar, Star, Download, Plus, Clock, MessageSquare, X } from 'lucide-react';"
);

newCode = newCode.replace(
  "import { submitResolutionRating } from '../services/issueService';",
  "import { submitResolutionRating, addCommentToIssue, submitIssueRating } from '../services/issueService';"
);

newCode = newCode.replace(
  "interface CitizenDashboardProps {\r\n  user: UserProfile;\r\n}",
  "interface CitizenDashboardProps {\r\n  user: UserProfile;\r\n  setActiveTab?: (tab: string) => void;\r\n}"
);
if (!newCode.includes("setActiveTab?")) {
  newCode = newCode.replace(
    "interface CitizenDashboardProps {\n  user: UserProfile;\n}",
    "interface CitizenDashboardProps {\n  user: UserProfile;\n  setActiveTab?: (tab: string) => void;\n}"
  );
}

newCode = newCode.replace(
  "function CitizenIssueCard({ issue, user, onRefresh }: { issue: Issue, user: UserProfile, onRefresh?: () => void }) {",
  "function CitizenIssueCard({ issue, user, onRefresh, onClick }: { issue: Issue, user: UserProfile, onRefresh?: () => void, onClick?: () => void }) {"
);

newCode = newCode.replace(
  "className={`${clayCardStyle} flex flex-col group`}",
  "className={`${clayCardStyle} flex flex-col group cursor-pointer`} onClick={onClick}"
);

newCode = newCode.replace(
  "export default function CitizenDashboard({ user }: CitizenDashboardProps) {",
  `export default function CitizenDashboard({ user, setActiveTab }: CitizenDashboardProps) {
  const [selectedIssue, setSelectedIssue] = React.useState<Issue | null>(null);
  const [commentText, setCommentText] = React.useState("");
  const [rating, setRating] = React.useState<number>(5);

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

const oldHeader = `      <div className="flex justify-between items-end mb-2">\r
        <h1 className="text-3xl font-bold text-gray-100">Welcome, {user.name}</h1>\r
        <span className="text-[10px] text-gray-400 font-mono">Last Updated: Just now</span>\r
      </div>`;
const oldHeaderLF = `      <div className="flex justify-between items-end mb-2">\n        <h1 className="text-3xl font-bold text-gray-100">Welcome, {user.name}</h1>\n        <span className="text-[10px] text-gray-400 font-mono">Last Updated: Just now</span>\n      </div>`;

const newHeader = `      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Welcome, {user.name}</h1>
          <span className="text-[10px] text-gray-400 font-mono">Last Updated: Just now</span>
        </div>
        <button 
          onClick={() => setActiveTab?.('report')}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-2.5 px-6 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          <span>Report New Issue</span>
        </button>
      </div>`;

newCode = newCode.replace(oldHeader, newHeader);
newCode = newCode.replace(oldHeaderLF, newHeader);

newCode = newCode.replace(
  "<CitizenIssueCard key={issue.complaintId || issue.uid} issue={issue} user={user} />",
  "<CitizenIssueCard key={issue.complaintId || issue.uid} issue={issue} user={user} onClick={() => setSelectedIssue(issue)} />"
);

modalCode = modalCode.replace(/selectedIssue/g, "currentSelectedIssue");
modalCode = modalCode.replace(/Γ£ò/g, '<X className="w-5 h-5" />');

const liveModal = `
      {/* Live issue mapping */}
      {(() => {
        const currentSelectedIssue = selectedIssue ? issues.find(i => i.id === selectedIssue.id) || selectedIssue : null;
        return (
          <>
            ${modalCode}
          </>
        );
      })()}
`;

const mainEndIdx = newCode.lastIndexOf("    </div>\n  );\n}");
let finalCode = newCode;
if (mainEndIdx !== -1) {
    finalCode = newCode.substring(0, mainEndIdx) + liveModal + newCode.substring(mainEndIdx);
} else {
    const mainEndIdx2 = newCode.lastIndexOf("    </div>\r\n  );\r\n}");
    if (mainEndIdx2 !== -1) {
        finalCode = newCode.substring(0, mainEndIdx2) + liveModal + newCode.substring(mainEndIdx2);
    } else {
        console.log("Could not find end of dashboard.");
        process.exit(1);
    }
}

fs.writeFileSync('src/components/CitizenDashboard.tsx', finalCode);
console.log("Modal injected.");
