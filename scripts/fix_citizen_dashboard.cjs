const fs = require('fs');
let code = fs.readFileSync('src/components/CitizenDashboard.tsx', 'utf8');

// 1. Add imports if needed
if (!code.includes('import { X, Star, Download, Image as ImageIcon }')) {
  code = code.replace(
    "import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar } from 'lucide-react';",
    "import { Award, TrendingUp, FileText, CheckCircle, AlertTriangle, MapPin, Tag, Calendar, X, Star, Download, Image as ImageIcon } from 'lucide-react';"
  );
}

// 2. Make cards clickable
code = code.replace(
  '              <div key={issue.id} className={`${clayCardStyle} flex flex-col group`}>',
  '              <div key={issue.id} className={`${clayCardStyle} flex flex-col group cursor-pointer hover:ring-2 hover:ring-cyan-500/50`} onClick={() => setSelectedIssue(issue)}>'
);

// 3. Add Modal render
const modalRender = `
      {/* Complaint Details Modal */}
      {selectedIssue && (() => {
        // Realtime Issue Data
        const activeIssue = userIssues.find(i => i.id === selectedIssue.id) || selectedIssue;
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto animate-zoomIn flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-700/50 bg-slate-800/50">
                <div>
                  <h3 className="text-xl font-bold text-white">{activeIssue.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-cyan-400">ID: {activeIssue.complaintId || activeIssue.id}</span>
                    <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${getStatusChipStyle(activeIssue.status)}\`}>
                      {activeIssue.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedIssue(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1">
                
                {/* Image & Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {activeIssue.imageUrl || (activeIssue.inspectionImages && activeIssue.inspectionImages.length > 0) ? (
                    <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50">
                      <img src={activeIssue.imageUrl || (activeIssue.inspectionImages ? activeIssue.inspectionImages[0] : '')} alt="Issue" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-48 md:h-64 rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-col items-center justify-center text-slate-500">
                      <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                      <span className="text-xs">No image provided</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-4 text-sm text-slate-300">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Description</span>
                      <p className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/30">{activeIssue.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Category</span>
                        <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-cyan-400" /> {activeIssue.category}</div>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Priority</span>
                        <div className="flex items-center gap-1.5 text-rose-400">{activeIssue.priority}</div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Location Details</span>
                      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/30 text-xs">
                        <div className="flex items-start gap-2 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                          <span>{activeIssue.landmark || activeIssue.address}, {activeIssue.area}, {activeIssue.district}, {activeIssue.state}</span>
                        </div>
                        {activeIssue.ulb && <div className="ml-5.5 text-slate-400">ULB: {activeIssue.ulb}</div>}
                        <div className="ml-5.5 text-[9px] text-slate-500 font-mono mt-1">
                          {activeIssue.latitude?.toFixed(5)}, {activeIssue.longitude?.toFixed(5)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline & Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-700/50 pt-6">
                  
                  {/* Timeline */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" /> Resolution Timeline</h4>
                    <div className="space-y-4 pl-2 border-l-2 border-slate-700/50 ml-2">
                      <div className="relative">
                        <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-slate-900" />
                        <p className="text-xs font-bold text-slate-200">Issue Submitted</p>
                        <p className="text-[10px] text-slate-500">{activeIssue.createdAt?.seconds ? new Date(activeIssue.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</p>
                      </div>
                      {['Assigned', 'Accepted', 'Inspection Started', 'Inspection Completed', 'Awaiting HQ Review', 'Resolved'].includes(activeIssue.status) && (
                        <div className="relative">
                          <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-slate-900" />
                          <p className="text-xs font-bold text-slate-200">Processing by Authority</p>
                        </div>
                      )}
                      {activeIssue.status === 'Resolved' && (
                        <div className="relative">
                          <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-green-400 ring-4 ring-slate-900" />
                          <p className="text-xs font-bold text-slate-200">Resolved</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resolution / Inspector Details */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyan-400" /> Authority Details</h4>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30 text-xs">
                      <div className="mb-2">
                        <span className="text-slate-500 font-bold uppercase text-[10px]">Community Support</span>
                        <p className="text-slate-300 font-bold">{activeIssue.confirmCount || 0} Confirmations</p>
                      </div>
                      {activeIssue.assignedInspectorName && (
                        <div className="mb-2">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Assigned Inspector</span>
                          <p className="text-slate-300">{activeIssue.assignedInspectorName}</p>
                        </div>
                      )}
                      {activeIssue.notes && (
                        <div className="mb-2">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Inspection Notes</span>
                          <p className="text-slate-300 bg-slate-900/50 p-2 rounded mt-1 border border-slate-700/50 italic">"{activeIssue.notes}"</p>
                        </div>
                      )}
                    </div>

                    {activeIssue.status === 'Resolved' && (
                      <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-green-400">Resolution Report Available</span>
                          <button className="flex items-center gap-1 text-[10px] font-bold bg-green-500 text-slate-900 px-3 py-1.5 rounded-lg hover:bg-green-400 transition-colors">
                            <Download className="w-3 h-3" /> Download PDF
                          </button>
                        </div>
                        <div className="border-t border-green-500/20 pt-3">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Rate Resolution</span>
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(star => (
                              <button key={star} onClick={() => handleSubmitRating(star)} className="p-1 hover:scale-110 transition-transform">
                                <Star className={\`w-6 h-6 \${(activeIssue.citizenRating || 0) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}\`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}`;

code = code.replace(
  '    </div>\n  );\n}',
  modalRender
);

fs.writeFileSync('src/components/CitizenDashboard.tsx', code);
console.log('Fixed CitizenDashboard');
