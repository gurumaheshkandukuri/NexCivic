import { useState, useEffect } from "react";
import { UserProfile, Issue } from "../types";
import { signOut } from "firebase/auth";
import { auth } from "../firebase-init";
import { 
  User, 
  Mail, 
  Phone, 
  Home, 
  Award, 
  TrendingUp, 
  CheckCircle, 
  BarChart, 
  LogOut,
  Moon,
  Sun
} from "lucide-react";

interface ProfilePageProps {
  user: UserProfile;
  issues: Issue[];
  theme: "light" | "dark";
}

export default function ProfilePage({ user, issues, theme }: ProfilePageProps) {
  const [userIssues, setUserIssues] = useState<Issue[]>([]);

  useEffect(() => {
    const filtered = issues.filter(issue => issue.reportedBy === user.id);
    setUserIssues(filtered);
  }, [issues, user.id]);

  const stats = [
    { name: "Reports Filed", value: userIssues.length, icon: BarChart },
    { name: "Reputation Points", value: user.points, icon: Award },
    { name: "Success Rate", value: `${userIssues.filter(i => i.status === "Resolved").length / (userIssues.length || 1) * 100}%`, icon: TrendingUp },
    { name: "Issues Resolved", value: userIssues.filter(i => i.status === "Resolved").length, icon: CheckCircle }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
      
      {/* Profile Header Card */}
      <div className="glass rounded-3xl p-6 md:p-8 border border-slate-200/50 dark:border-white/10 flex flex-col md:flex-row items-center gap-6 text-left">
        <div className="relative">
          {user.avatar ? (
            <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-[var(--cyan)] shadow-lg" alt="User Avatar" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-4xl font-bold text-white">{user.name.charAt(0)}</div>
          )}
          <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[var(--bg-mid)]" />
        </div>

        <div className="flex-grow text-center md:text-left">
          <h2 className="font-display font-black text-2xl text-[var(--text-1)]">{user.name}</h2>
          <p className="text-xs text-[var(--text-2)] mt-1">{user.role} Profile</p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-gray-400 mt-3">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {user.phone}</span>
            <span className="flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> {user.zone}</span>
          </div>
        </div>

        <button 
          onClick={() => signOut(auth)}
          className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {stats.map(stat => (
          <div key={stat.name} className="glass p-5 rounded-2xl border border-slate-200/50 dark:border-white/10 flex flex-col gap-1">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--cyan)]/15 to-[var(--blue)]/15 flex items-center justify-center text-[var(--cyan)]`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">{stat.name}</span>
            <span className="font-display font-extrabold text-2xl text-[var(--text-1)]">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-10">
        <h3 className="font-display font-bold text-lg text-[var(--text-1)] mb-4">Recent Grievance Reports</h3>
        <div className="flex flex-col gap-3">
          {userIssues.slice(0, 5).map(issue => (
            <div key={issue.id} className="glass p-4 rounded-xl border border-slate-200/50 dark:border-white/10 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[var(--text-1)]">{issue.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{issue.category} &bull; {issue.address}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ 
                issue.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400' : 
                issue.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400' : 
                'bg-rose-500/10 text-rose-400' 
              }`}>
                {issue.status}
              </span>
            </div>
          ))}
          {userIssues.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-6 italic">No issues reported yet.</p>
          )}
        </div>
      </div>

    </div>
  );
}
