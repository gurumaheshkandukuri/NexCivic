import React, { useState } from 'react';
import { Issue, UserProfile } from '../types';
import { addCommentToIssue, submitIssueRating } from '../services/issueService';
import { Clock, MessageSquare, Tag, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';

interface ComplaintDetailsModalProps {
  issue: Issue;
  user: UserProfile;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ComplaintDetailsModal({ issue, user, onClose, onRefresh }: ComplaintDetailsModalProps) {
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const getCrossOrigin = (src: string | undefined | null) => {
    if (!src) return undefined;
    return src.startsWith('http') ? 'anonymous' : undefined;
  };

  const issueId = issue.uid || issue.complaintId; // Fallback

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addCommentToIssue(issueId, {
        userId: user.uid,
        name: user.name,
        text: commentText,
        role: user.role
      });
      setCommentText('');
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) return;
    try {
      await submitIssueRating(issueId, rating, user.uid);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadResolutionReport = async () => {
    setIsDownloading(true);
    try {
      const modalContent = document.getElementById('resolution-report-content');
      if (!modalContent) return;
      
      const imgData = await htmlToImage.toPng(modalContent, { pixelRatio: 2 });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Calculate aspect ratio. We need original dimensions for this.
      // html-to-image maintains the DOM element's aspect ratio.
      const rect = modalContent.getBoundingClientRect();
      const pdfHeight = (rect.height * pdfWidth) / rect.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Resolution_Report_${issue.complaintId}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF report", error);
      alert("Failed to generate PDF. Please ensure all images have finished loading.");
    } finally {
      setIsDownloading(false);
    }
  };

  const locationText = [issue.landmark, issue.area, issue.ulb, issue.district].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="glass max-w-2xl w-full bg-slate-900 rounded-3xl p-6 border border-slate-700 max-h-[90vh] overflow-y-auto flex flex-col gap-5 text-left relative"
        onClick={(e) => e.stopPropagation()}
        id="resolution-report-content"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.03)] transition-all z-10"
        >
          X
        </button>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-2 flex-wrap">
            <span>{issue.category || "General Incident"}</span>
            <span>•</span>
            <span>Priority: {issue.priority || "Medium"}</span>
            <span>•</span>
            <span>Reference: #{issue.complaintId}</span>
          </span>
          <h3 className="font-display font-extrabold text-xl md:text-2xl text-white mt-1">
            {issue.title}
          </h3>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
            "{issue.description}"
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <MapPin className="w-3 h-3" />
            <span>{locationText}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <Tag className="w-3 h-3" />
            <span>Status: {issue.status}</span>
            <span>•</span>
            <span className="text-cyan-400 font-bold">+{issue.communitySupportCount || 0} Confirmations</span>
          </div>
        </div>

        {(issue.imageUrl || issue.imageData) && (
          <div className="text-left mt-2">
             <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Original Image</span>
             <div className="h-48 bg-gray-500/10 rounded-xl overflow-hidden border border-gray-700/50">
               <img src={issue.imageUrl || issue.imageData || ""} alt="Complaint Evidence" className="w-full h-full object-cover" crossOrigin={getCrossOrigin(issue.imageUrl || issue.imageData)} />
             </div>
          </div>
        )}

        {issue.assignedInspectorName && (
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-left mt-2">
            <span className="text-[10px] uppercase font-bold text-blue-400 font-mono tracking-wider block mb-1">
               Assigned Inspector
            </span>
            <p className="text-xs text-gray-200">
              {issue.assignedInspectorName}
            </p>
          </div>
        )}

        {issue.inspectionRemarks && (
          <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 text-left">
            <span className="text-[10px] uppercase font-bold text-orange-400 font-mono tracking-wider block mb-1">
              Official Inspection & Resolution Notes
            </span>
            <p className="text-xs text-gray-100 leading-relaxed italic">
              "{issue.inspectionRemarks}"
            </p>
            {issue.workCompleted && <p className="text-[10px] text-gray-400 mt-2">Works: {issue.workCompleted}</p>}
            {issue.materialsUsed && <p className="text-[10px] text-gray-400 mt-1">Materials: {issue.materialsUsed}</p>}
            {issue.estimatedCost && <p className="text-[10px] text-gray-400 mt-1">Cost: {issue.estimatedCost}</p>}
          </div>
        )}

        {/* Chronological Timeline */}
        <div className="bg-slate-800/50 p-5 rounded-2xl border border-gray-700 flex flex-col gap-4 mt-2">
          <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1.5 font-mono tracking-wider">
            <Clock className="w-4 h-4 text-cyan-400" /> Timeline & Action History
          </span>
          <div className="relative border-l border-gray-600 ml-3 pl-6 flex flex-col gap-5 py-2">
            
            <div className="relative text-left">
              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full border border-cyan-400 bg-slate-900 shadow-[0_0_8px_rgba(6,182,212,0.3)]" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-xs text-cyan-400">Report Submitted</span>
                <span className="text-[10px] text-gray-400">By {issue.reportedByName || "Resident"}</span>
                <span className="text-[8px] font-mono text-gray-500">
                  {issue.createdAt && (issue.createdAt as any).seconds ? new Date((issue.createdAt as any).seconds * 1000).toLocaleString() : ""}
                </span>
              </div>
            </div>

            {issue.timeline && Array.isArray(issue.timeline) && issue.timeline.map((item, idx) => (
              <div key={idx} className="relative text-left">
                <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full border border-blue-400 bg-slate-900 shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-xs text-blue-400">Status Update: {item.status}</span>
                  <span className="text-[10px] text-gray-400">By {item.updatedByName || "Authority"}</span>
                  {item.remarks && <span className="text-[10px] text-gray-300 italic p-1 bg-gray-800/50 rounded mt-1">"{item.remarks}"</span>}
                  <span className="text-[8px] font-mono text-gray-500">
                    {item.timestamp && (item.timestamp as any).seconds ? new Date((item.timestamp as any).seconds * 1000).toLocaleString() : ""}
                  </span>
                </div>
              </div>
            ))}

            {issue.comments && Array.isArray(issue.comments) && issue.comments.map((com: any, idx: number) => (
               <div key={`com-${idx}`} className="relative text-left mt-2">
                 <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full border border-purple-400 bg-slate-900" />
                 <div className="flex flex-col gap-1">
                   <span className="font-bold text-xs text-purple-400">Comment Posted</span>
                   <span className="text-[10px] text-gray-400">By {com.userName || "Resident"} ({com.role || "Citizen"})</span>
                   <span className="text-[11px] text-gray-300 mt-1 p-2 bg-gray-800 rounded">{com.message}</span>
                   <span className="text-[8px] font-mono text-gray-500 mt-1">
                    {com.createdAt && (com.createdAt as any).seconds ? new Date((com.createdAt as any).seconds * 1000).toLocaleString() : ""}
                  </span>
                 </div>
               </div>
            ))}
          </div>
        </div>

        {/* Resolution specific sections */}
        {issue.status === "Resolved" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
             <div className="text-left">
               <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Administrative Proof (Before/After)</span>
               <div className="flex flex-col gap-2">
                 {(issue.inspectionImages && issue.inspectionImages.length > 0) ? (
                   issue.inspectionImages.map((img: string, idx: number) => (
                     <img key={idx} src={img} className="w-full h-32 object-cover rounded-xl border border-gray-700" crossOrigin={getCrossOrigin(img)} />
                   ))
                 ) : (
                    <div className="w-full h-32 bg-gray-800 rounded-xl flex items-center justify-center text-xs text-gray-500">No proof photos provided</div>
                 )}
               </div>
             </div>
             <div className="flex flex-col gap-4">
                {issue.rating == null && (
                  <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 text-center">
                    <span className="text-xs font-bold text-green-400 block mb-2">Provide Satisfaction Rating</span>
                    <div className="flex justify-center gap-2 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className={`text-xl ${rating >= star ? "text-yellow-400" : "text-gray-600"} hover:text-yellow-300 transition-colors`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleSubmitRating}
                      className="px-4 py-2 bg-green-500 text-white font-bold rounded-xl text-xs w-full"
                    >
                      Submit Rating
                    </button>
                  </div>
                )}
                {issue.rating != null && (
                  <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 text-center flex flex-col items-center justify-center h-full">
                    <span className="text-xs font-bold text-green-400 block mb-1">Your Rating</span>
                    <div className="flex gap-1 text-yellow-400 text-xl">
                      {Array.from({ length: 5 }).map((_, idx) => (
                         <span key={idx}>{idx < issue.rating! ? "★" : "☆"}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Download PDF Button */}
                <button
                  onClick={handleDownloadResolutionReport}
                  disabled={isDownloading}
                  className="mt-auto px-4 py-3 bg-blue-600 hover:bg-blue-500 transition-colors text-white font-bold rounded-xl text-xs w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDownloading ? "Generating..." : "Download Resolution Report"}
                </button>
             </div>
          </div>
        )}

        {issue.status !== "Resolved" && (
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1.5 font-mono">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Add Comment
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type your comment..."
                className="p-2.5 rounded-xl bg-slate-800 border border-gray-700 focus:border-cyan-400 outline-none text-xs text-white flex-grow"
              />
              <button
                type="button"
                onClick={handleAddComment}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 transition-colors text-slate-900 font-bold rounded-xl text-xs"
              >
                Post
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
