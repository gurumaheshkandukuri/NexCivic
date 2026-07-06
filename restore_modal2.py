import re

with open('src/components/CitizenDashboard.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

with open('old_dashboard_utf8.tsx', 'r', encoding='utf-8') as f:
    old_code = f.read()

# Extract modal code
start_marker = "{/* DETAIL MODAL WITH PROGRESS TIMELINE */}"
end_marker = "    </div>\n  );\n}\n"
start_idx = old_code.find(start_marker)
end_idx = old_code.rfind(end_marker)

modal_code = old_code[start_idx:end_idx]
modal_code = modal_code.replace("selectedIssue", "currentSelectedIssue")
modal_code = modal_code.replace("Γ£ò", '<X className="w-5 h-5" />')

live_modal = f"""
      {{/* Live issue mapping */}}
      {{(() => {{
        const currentSelectedIssue = selectedIssue ? issues.find(i => i.id === selectedIssue.id) || selectedIssue : null;
        return (
          <>
            {modal_code}
          </>
        );
      }})()}}
"""

code = code.replace(
    "import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar, Star, Download } from 'lucide-react';",
    "import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar, Star, Download, Plus, Clock, MessageSquare, X } from 'lucide-react';"
)

code = code.replace(
    "import { submitResolutionRating } from '../services/issueService';",
    "import { submitResolutionRating, addCommentToIssue, submitIssueRating } from '../services/issueService';"
)

code = code.replace(
    "interface CitizenDashboardProps {\n  user: UserProfile;\n}",
    "interface CitizenDashboardProps {\n  user: UserProfile;\n  setActiveTab?: (tab: string) => void;\n}"
)

code = code.replace(
    "function CitizenIssueCard({ issue, user, onRefresh }: { issue: Issue, user: UserProfile, onRefresh?: () => void }) {",
    "function CitizenIssueCard({ issue, user, onRefresh, onClick }: { issue: Issue, user: UserProfile, onRefresh?: () => void, onClick?: () => void }) {"
)

code = code.replace(
    'className={`${clayCardStyle} flex flex-col group`}',
    'className={`${clayCardStyle} flex flex-col group cursor-pointer`} onClick={onClick}'
)

new_dashboard_func = """export default function CitizenDashboard({ user, setActiveTab }: CitizenDashboardProps) {
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
"""

code = code.replace(
    """export default function CitizenDashboard({ user }: CitizenDashboardProps) {
  const { issues, isSyncing, isOffline, lastSynced } = useLiveIssues({
    scope: "user",
    userId: user.uid
  });""",
    new_dashboard_func
)

header_code = """      <div className="flex justify-between items-end mb-2">
        <h1 className="text-3xl font-bold text-gray-100">Welcome, {user.name}</h1>
        <span className="text-[10px] text-gray-400 font-mono">Last Updated: Just now</span>
      </div>"""
new_header_code = """      <div className="flex justify-between items-end mb-2">
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
      </div>"""
code = code.replace(header_code, new_header_code)

card_inst = "<CitizenIssueCard key={issue.complaintId || issue.uid} issue={issue} user={user} />"
new_card_inst = "<CitizenIssueCard key={issue.complaintId || issue.uid} issue={issue} user={user} onClick={() => setSelectedIssue(issue)} />"
code = code.replace(card_inst, new_card_inst)

main_end_idx = code.rfind("    </div>\n  );\n}")
if main_end_idx != -1:
    code = code[:main_end_idx] + live_modal + code[main_end_idx:]

with open('src/components/CitizenDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Modal restored successfully.")
