import { UserProfile, Issue } from "../types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar, X, Star, Download, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { useLiveIssues } from '../hooks/useLiveIssues';

interface CitizenDashboardProps {
  user: UserProfile;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const clayCardStyle = "bg-slate-800/40 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 shadow-lg transition-all duration-300 hover:border-slate-600/80 hover:bg-slate-800/60";


export default function CitizenDashboard({ user }: CitizenDashboardProps) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [rating, setRating] = useState(0);
  const [commentText, setCommentText] = useState('');

  const handleAddComment = (commentText: string) => {};
  const handleSubmitRating = (rating: number) => { onRefresh(); };

  const { issues: userIssues, isSyncing } = useLiveIssues({ scope: 'user', userId: user.uid });
  const onRefresh = () => {};

  const issuesByStatus = userIssues.reduce((acc, issue) => {
    acc[issue.status] = (acc[issue.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.keys(issuesByStatus).map(status => ({ name: status, value: issuesByStatus[status] }));

  const issuesByCategory = userIssues.reduce((acc, issue) => {
    acc[issue.category] = (acc[issue.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.keys(issuesByCategory).map(category => ({ name: category, count: issuesByCategory[category] }));

  const getStatusChipStyle = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-green-500/20 text-green-300';
      case 'In Progress': return 'bg-blue-500/20 text-blue-300';
      case 'Open':
      default:
        return 'bg-yellow-500/20 text-yellow-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-100 mb-2">Welcome, {user.name}</h1>
      <p className="text-md text-gray-400 mb-8">Here's an overview of your contributions and reported issues.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className={clayCardStyle}>
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-cyan-400 mr-4" />
            <div>
              <p className="text-sm text-gray-400">Total Issues Reported</p>
              <p className="text-2xl font-bold text-white">{userIssues.length}</p>
            </div>
          </div>
        </div>
        <div className={clayCardStyle}>
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-green-400 mr-4" />
            <div>
              <p className="text-sm text-gray-400">Issues Resolved</p>
              <p className="text-2xl font-bold text-white">{userIssues.filter(i => i.status === 'Resolved').length}</p>
            </div>
          </div>
        </div>
        <div className={clayCardStyle}>
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-yellow-400 mr-4" />
            <div>
              <p className="text-sm text-gray-400">Pending Issues</p>
              <p className="text-2xl font-bold text-white">{userIssues.filter(i => i.status === 'Open' || i.status === 'In Progress').length}</p>
            </div>
          </div>
        </div>
        <div className={clayCardStyle}>
          <div className="flex items-center">
            <Award className="h-6 w-6 text-orange-400 mr-4" />
            <div>
              <p className="text-sm text-gray-400">Community Points</p>
              <p className="text-2xl font-bold text-white">{user.xp || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className={clayCardStyle}>
          <h2 className="text-xl font-semibold text-white mb-4">Issues by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={100} stroke="#9CA3AF" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} labelStyle={{ color: '#F9FAFB' }} />
              <Bar dataKey="count" fill="#22D3EE" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={clayCardStyle}>
          <h2 className="text-xl font-semibold text-white mb-4">Issues by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-white mb-6">Your Reported Issues</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userIssues.length > 0 ? (
            userIssues.slice(0, 9).map((issue) => (
              <div key={issue.id} className={`${clayCardStyle} flex flex-col group cursor-pointer hover:ring-2 hover:ring-cyan-500/50`} onClick={() => setSelectedIssue(issue)}>
                {issue.imageUrl && (
                  <div className="w-full h-40 mb-4 rounded-lg overflow-hidden">
                    <img src={issue.imageUrl} alt={issue.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-md font-bold text-white flex-1 pr-2">{issue.title}</h3>
                    <div className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${getStatusChipStyle(issue.status)}`}>
                        {issue.status}
                    </div>
                </div>
                
                <div className="flex items-center text-xs text-gray-400 mb-2">
                    <Tag className="w-3 h-3 mr-2" />
                    <span>{issue.category}</span>
                </div>

                <div className="flex items-center text-xs text-gray-400 mb-4">
                    <MapPin className="w-3 h-3 mr-2" />
                    <span className="truncate">{issue.address}</span>
                </div>

                <div className="border-t border-slate-700/50 mt-auto pt-3 flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-2" />
                        <span>{issue.createdAt && issue.createdAt.seconds ? new Date(issue.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="font-bold text-cyan-400">
                      +{issue.confirmCount || 0} Confirmations
                    </div>
                </div>
              </div>
            ))
          ) : (
            <div className={`md:col-span-2 lg:col-span-3 ${clayCardStyle} text-center py-12`}>
              <p className="text-gray-400">You haven't reported any issues yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
