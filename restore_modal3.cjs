const fs = require('fs');

let code = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');
let old_code = fs.readFileSync('old_dashboard_utf8.tsx', 'utf8');

const start_marker = "{/* DETAIL MODAL WITH PROGRESS TIMELINE */}";
const start_idx = old_code.indexOf(start_marker);

// Find the last )} which closes the selectedIssue && ( condition.
const end_idx = old_code.lastIndexOf('      )}\r\n\r\n    </div>');

if (start_idx === -1 || end_idx === -1) {
    console.log("Could not find modal code.");
    process.exit(1);
}

// Extract up to the closing )} plus its newline
let modal_code = old_code.substring(start_idx, end_idx + 9);
modal_code = modal_code.replace(/selectedIssue/g, "currentSelectedIssue");
modal_code = modal_code.replace(/Γ£ò/g, '<X className="w-5 h-5" />');

const live_modal = `
      {/* Live issue mapping */}
      {(() => {
        const currentSelectedIssue = selectedIssue ? issues.find(i => i.id === selectedIssue.id) || selectedIssue : null;
        return (
          <>
            ${modal_code}
          </>
        );
      })()}
`;

code = code.replace(
    "import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar, Star, Download } from 'lucide-react';",
    "import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar, Star, Download, Plus, Clock, MessageSquare, X } from 'lucide-react';"
);

code = code.replace(
    "import { submitResolutionRating } from '../services/issueService';",
    "import { submitResolutionRating, addCommentToIssue, submitIssueRating } from '../services/issueService';"
);

code = code.replace(
    "interface CitizenDashboardProps {\n  user: UserProfile;\n}",
    "interface CitizenDashboardProps {\n  user: UserProfile;\n  setActiveTab?: (tab: string) => void;\n}"
);
if (!code.includes("setActiveTab?:")) {
  code = code.replace(
      "interface CitizenDashboardProps {\r\n  user: UserProfile;\r\n}",
      "interface CitizenDashboardProps {\r\n  user: UserProfile;\r\n  setActiveTab?: (tab: string) => void;\r\n}"
  );
}

code = code.replace(
    "function CitizenIssueCard({ issue, user, onRefresh }: { issue: Issue, user: UserProfile, onRefresh?: () => void }) {",
    "function CitizenIssueCard({ issue, user, onRefresh, onClick }: { issue: Issue, user: UserProfile, onRefresh?: () => void, onClick?: () => void }) {"
);

code = code.replace(
    'className={`${clayCardStyle} flex flex-col group`}',
    'className={`${clayCardStyle} flex flex-col group cursor-pointer`} onClick={onClick}'
);

const new_dashboard_func = `export default function CitizenDashboard({ user, setActiveTab }: CitizenDashboardProps) {
  const { issues, isSyncing, isOffline, lastSynced } = useLiveIssues({
    scope: "user",
    userId: user.uid
  });

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
`;

code = code.replace(
    `export default function CitizenDashboard({ user }: CitizenDashboardProps) {\n  const { issues, isSyncing, isOffline, lastSynced } = useLiveIssues({\n    scope: "user",\n    userId: user.uid\n  });`,
    new_dashboard_func
);
if (!code.includes("React.useState")) {
  code = code.replace(
      `export default function CitizenDashboard({ user }: CitizenDashboardProps) {\r\n  const { issues, isSyncing, isOffline, lastSynced } = useLiveIssues({\r\n    scope: "user",\r\n    userId: user.uid\r\n  });`,
      new_dashboard_func
  );
}

const header_code = `      <div className="flex justify-between items-end mb-2">\n        <h1 className="text-3xl font-bold text-gray-100">Welcome, {user.name}</h1>\n        <span className="text-[10px] text-gray-400 font-mono">Last Updated: Just now</span>\n      </div>`;
const header_code2 = `      <div className="flex justify-between items-end mb-2">\r\n        <h1 className="text-3xl font-bold text-gray-100">Welcome, {user.name}</h1>\r\n        <span className="text-[10px] text-gray-400 font-mono">Last Updated: Just now</span>\r\n      </div>`;

const new_header_code = `      <div className="flex justify-between items-end mb-2">
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

code = code.replace(header_code, new_header_code);
code = code.replace(header_code2, new_header_code);

const card_inst = "<CitizenIssueCard key={issue.complaintId || issue.uid} issue={issue} user={user} />";
const new_card_inst = "<CitizenIssueCard key={issue.complaintId || issue.uid} issue={issue} user={user} onClick={() => setSelectedIssue(issue)} />";
code = code.replace(card_inst, new_card_inst);

const main_end_idx = code.lastIndexOf("    </div>\n  );\n}");
if (main_end_idx !== -1) {
    code = code.substring(0, main_end_idx) + live_modal + code.substring(main_end_idx);
} else {
    const main_end_idx2 = code.lastIndexOf("    </div>\r\n  );\r\n}");
    if (main_end_idx2 !== -1) {
        code = code.substring(0, main_end_idx2) + live_modal + code.substring(main_end_idx2);
    } else {
        console.log("Could not find end of CitizenDashboard.");
        process.exit(1);
    }
}

fs.writeFileSync('src/components/CitizenDashboard.tsx', code);
console.log("Modal restored successfully.");
