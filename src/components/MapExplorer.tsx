import { useState, useEffect } from "react";
import { 
  Search, 
  Sparkles, 
  Filter, 
  MapPin, 
  Flame, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2, 
  X,
  Plus,
  Navigation,
  Star
} from "lucide-react";
import { ROLES } from "../constants/roles";
import { STATUS } from "../constants/status";
import { Issue, UserProfile } from "../types";
import InteractiveMap from "./InteractiveMap";
import { confirmIssue, submitResolutionRating } from "../services/issueService";
import TelanganaDashboard from "./TelanganaDashboard";

import { useLiveIssues } from "../hooks/useLiveIssues";

interface MapExplorerProps {
  user: UserProfile | null;
}

// Haversine formula for distance calculation
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; // Distance in km
  return d;
}

export default function MapExplorer({ user }: MapExplorerProps) {
  const [viewMode, setViewMode] = useState<"incidents" | "telangana">("incidents");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedZone, setSelectedZone] = useState("All");
  const [filterByNearby, setFilterByNearby] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const [rating, setRating] = useState<number>(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const { issues, isSyncing, isOffline, lastSynced } = useLiveIssues({
    scope: "all",
    enabled: !!user
  });

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    // Legacy data protection: ignore issues without valid coordinates
    const lat = Number(issue.latitude);
    const lng = Number(issue.longitude);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
       return false; 
    }

    // Search matching Title/Description/District
    const matchesSearch = 
      (issue.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.landmark || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "All" || issue.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || 
      (selectedStatus === "Open" && [STATUS.SUBMITTED, STATUS.ASSIGNED, STATUS.ACCEPTED].includes(issue.status as any)) ||
      (selectedStatus === "In Progress" && [STATUS.INSPECTION_STARTED, STATUS.INSPECTION_COMPLETED, STATUS.RECOMMENDED_RESOLUTION, STATUS.RECOMMENDED_REJECTION].includes(issue.status as any)) ||
      (selectedStatus === "Resolved" && [STATUS.AWAITING_HQ_REVIEW, STATUS.RESOLVED, STATUS.REJECTED].includes(issue.status as any));
    const matchesPriority = selectedPriority === "All" || issue.priority === selectedPriority;
    const matchesZone = selectedZone === "All" || issue.area === selectedZone;

    if (filterByNearby && userLocation) {
        const distance = getDistance(userLocation.lat, userLocation.lng, issue.latitude, issue.longitude);
        return distance <= 5; // 5km radius
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority && matchesZone;
  });

  const handleConfirmAction = async (issueId: string) => {
    if (!user) {
      alert("Please log in to confirm and upvote this issue.");
      return;
    }
    try {
      await confirmIssue(issueId, user.uid, user.name);
      
      const updated = issues.find(i => i.uid === issueId || i.complaintId === issueId);
      if (updated) setSelectedIssue(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRatingSubmit = async () => {
    if (!user || !selectedIssue || !selectedIssue.uid || rating === 0) return;
    setIsSubmittingRating(true);
    try {
      await submitResolutionRating(selectedIssue.uid, user, rating, ratingFeedback);
      // Update local state to reflect rating
      setSelectedIssue({
        ...selectedIssue,
        rating,
        ratingFeedback
      } as any);
    } catch (err) {
      console.error("Failed to submit rating", err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const toggleNearbyFilter = () => {
    if (!filterByNearby) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(position => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setFilterByNearby(true);
        setLocationLoading(false);
      }, () => {
        alert("Could not get your location. Please ensure location services are enabled.");
        setLocationLoading(false);
      });
    } else {
      setFilterByNearby(false);
      setUserLocation(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col text-left">
      
      {/* Top Toggle Switch */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/40 pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Civic Intelligence Map
              {isSyncing && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  SYNCING
                </span>
              )}
              {isOffline && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-mono">
                  <AlertTriangle className="w-3 h-3" />
                  OFFLINE
                </span>
              )}
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">Live semantic clustering of municipal reports and civic issues.</p>
        </div>

        <div className="inline-flex p-1 bg-[#080d1e]/80 border border-gray-800/85 rounded-2xl gap-1 shadow-inner self-start sm:self-center">
          <button
            onClick={() => setViewMode("incidents")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "incidents" 
                ? "bg-[var(--cyan)]/15 text-[var(--cyan)] border border-[var(--cyan)]/20 font-extrabold" 
                : "text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            🗺️ Incident Tracker Map
          </button>
          <button
            onClick={() => setViewMode("telangana")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "telangana" 
                ? "bg-[var(--cyan)]/15 text-[var(--cyan)] border border-[var(--cyan)]/20 font-extrabold" 
                : "text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            📊 Telangana State Analyzer Map
          </button>
        </div>
      </div>

      {viewMode === "telangana" ? (
        <div className="animate-fadeIn">
          <TelanganaDashboard />
        </div>
      ) : (
        <div className="h-[calc(100vh-170px)] flex flex-col lg:grid lg:grid-cols-12 gap-6 text-left animate-fadeIn">
      
      {/* Left side Filter & List explorer - ColSpan 4 */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
        
        {/* Header summary info */}
        <div className="bg-[rgba(255,255,255,0.01)] border border-gray-700/10 p-4 rounded-2xl">
          <span className="block font-display font-bold text-sm text-[var(--text-1)]">
            Explore Active Incidents
          </span>
          <span className="block text-[10px] text-gray-500 mt-0.5">
            Showing {filteredIssues.length} of {issues.length} active civic issues
          </span>
        </div>

        {/* Filters Panel */}
        <div className="glass p-4 rounded-2xl border border-[rgba(255,255,255,0.06)] flex flex-col gap-3">
          
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by street, landmark, text..."
              className="pl-9 pr-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-gray-700/50 focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 rounded-lg bg-[var(--bg-void)] border border-gray-700/50 text-[10px] text-[var(--text-1)] outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Pothole">Potholes</option>
              <option value="Garbage Overflow">Garbage</option>
              <option value="Water Leakage">Water Leaks</option>
              <option value="Street Light">Street Lights</option>
              <option value="Drainage">Drainage</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-2 rounded-lg bg-[var(--bg-void)] border border-gray-700/50 text-[10px] text-[var(--text-1)] outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <button
            onClick={toggleNearbyFilter}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                filterByNearby 
                ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
                : "text-gray-400 hover:text-white border-gray-700/50"
            }`}
            >
            {locationLoading ? (
                <><Flame className="w-4 h-4 animate-spin"/> Fetching Location...</>
            ) : filterByNearby ? (
                <><Navigation className="w-4 h-4"/> Showing Nearby Issues (5km)</>
            ) : (
                <><Navigation className="w-4 h-4"/> Show Nearby Issues</>
            )}
            </button>
        </div>

        {/* Scrollable list items details */}
        <div className="flex-grow overflow-y-auto flex flex-col gap-2.5 max-h-[50vh] lg:max-h-[60vh] pr-1">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-500 italic">No matching issues visible.</div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.complaintId}
                onClick={() => setSelectedIssue(issue)}
                className={`p-3 rounded-2xl w-full text-left cursor-pointer border flex flex-col gap-2 transition-colors ${
                  selectedIssue?.uid === issue.uid
                    ? "border-[var(--cyan)] bg-[var(--cyan)]/[0.02]"
                    : "border-transparent hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-1.5 justify-between">
                  <span className="text-[10px] uppercase font-bold text-[var(--cyan)]">{issue.category}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${
                    issue.priority === "Critical" ? "bg-[var(--red)]" 
                    : issue.priority === "High" ? "bg-[var(--orange)]"
                    : issue.priority === "Medium" ? "bg-amber-400"
                    : "bg-[var(--green)]"
                  }`}>
                    {issue.priority}
                  </span>
                </div>

                <div className="font-extrabold text-xs text-[var(--text-1)] leading-snug line-clamp-1">{issue.title}</div>
                <div className="text-[10px] text-[var(--text-2)] line-clamp-2 leading-relaxed">"{issue.description}"</div>

                <div className="flex items-center justify-between border-t border-gray-700/10 pt-2 text-[9px] text-gray-500 mt-1">
                  <span>📍 {issue.landmark?.split(',').slice(0, 2).join(', ') || issue.area}</span>
                  <span className="font-bold text-[var(--text-1)] bg-gray-700/20 px-1.5 py-0.5 rounded-md">
                     👥 {issue.communitySupportCount} votes
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Right side interactive Map space - ColSpan 8 */}
      <div className="lg:col-span-8 relative flex flex-col gap-4 h-full">
        <InteractiveMap 
          issues={filteredIssues}
          selectedIssueId={selectedIssue?.complaintId}
          onSelectIssue={(issue) => setSelectedIssue(issue)}
          height="100%"
          center={[16.5062, 80.6480]}
        />

        {/* Floating pop-up overlay if details selected */}
        {selectedIssue && (
          <div className="absolute bottom-4 left-4 right-4 glass rounded-3xl p-4 border border-[rgba(255,255,255,0.08)] z-30 shadow-2xl flex flex-col gap-3 text-left">
            <button
              onClick={() => setSelectedIssue(null)}
              className="absolute top-3 right-3 p-1.5 text-xs text-gray-500 hover:text-white rounded-md"
            >
              ✕
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono uppercase bg-[var(--cyan)]/10 text-[var(--cyan)] px-2 py-0.5 rounded-md">
                  {selectedIssue.category}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">Reference: #{selectedIssue.uid?.split("_").pop()}</span>
              </div>
              
              {(selectedIssue.imageUrl || selectedIssue.imageData) && (
                <div className="mt-2 w-full h-32 md:h-48 rounded-xl overflow-hidden border border-gray-700/30">
                  <img src={selectedIssue.imageUrl || selectedIssue.imageData || ""} alt={selectedIssue.title} className="w-full h-full object-cover" />
                </div>
              )}
              <h4 className="font-bold text-sm text-[var(--text-1)] mt-1.5">{selectedIssue.title}</h4>
              <p className="text-[11px] text-[var(--text-2)] mt-0.5 leading-relaxed line-clamp-2">"{selectedIssue.description}"</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono text-gray-500 border-y border-gray-700/10 py-3">
              <div>
                <span className="block mb-0.5">LANDMARK:</span> <strong className="text-[var(--text-1)] block font-sans">{selectedIssue.landmark || "Not provided"}</strong>
              </div>
              <div>
                <span className="block mb-0.5">AREA:</span> <strong className="text-[var(--text-1)] block font-sans">{selectedIssue.area || "Not provided"}</strong>
              </div>
              <div>
                <span className="block mb-0.5">ULB:</span> <strong className="text-[var(--text-1)] block font-sans">{selectedIssue.ulb || "Not provided"}</strong>
              </div>
              <div>
                <span className="block mb-0.5">DISTRICT:</span> <strong className="text-[var(--text-1)] block font-sans">{selectedIssue.district || "Not provided"}</strong>
              </div>
              <div>
                <span className="block mb-0.5">STATE:</span> <strong className="text-[var(--text-1)] block font-sans">{selectedIssue.state || "Not provided"}</strong>
              </div>
              <div>
                <span className="block mb-0.5">STATUS:</span> <strong className="text-[var(--text-1)] block font-sans capitalize">{selectedIssue.status || "Not provided"}</strong>
              </div>
              <div>
                <span className="block mb-0.5">SUPPORT:</span> <strong className="text-[var(--text-1)] block font-sans">{selectedIssue.communitySupportCount ?? "Not provided"} Confirmations</strong>
              </div>
              <div>
                <span className="block mb-0.5">COORDINATES:</span> <strong className="text-gray-600 block text-[9px]">{selectedIssue.latitude?.toFixed(4) ?? "Not provided"}, {selectedIssue.longitude?.toFixed(4) ?? "Not provided"}</strong>
              </div>
            </div>

            {/* Inspection Notes Block (if available) */}
            {(selectedIssue.workCompleted || selectedIssue.materialsUsed || selectedIssue.estimatedCost || selectedIssue.timeSpent || selectedIssue.inspectionRemarks) && (
              <div className="mt-3 bg-gray-500/5 border border-gray-700/10 rounded-xl p-3 text-left">
                <span className="text-[9px] uppercase font-bold text-[var(--cyan)] font-mono flex items-center gap-1.5 mb-2">
                  📋 Public Resolution Summary
                </span>
                
                {(() => {
                  const isOwner = user?.uid === selectedIssue.reportedByUID;
                  const isResolved = [STATUS.INSPECTION_COMPLETED, STATUS.RECOMMENDED_RESOLUTION, STATUS.AWAITING_HQ_REVIEW, STATUS.RESOLVED, STATUS.REJECTED].includes(selectedIssue.status as any);
                  const canSeeFullNotes = isOwner && isResolved;

                  if (canSeeFullNotes) {
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          {selectedIssue.workCompleted && (
                            <div><span className="text-gray-500 block">Work Completed</span><strong className="text-[var(--text-1)]">{selectedIssue.workCompleted}</strong></div>
                          )}
                          {selectedIssue.materialsUsed && (
                            <div><span className="text-gray-500 block">Materials Used</span><strong className="text-[var(--text-1)]">{selectedIssue.materialsUsed}</strong></div>
                          )}
                          {selectedIssue.estimatedCost && (
                            <div><span className="text-gray-500 block">Cost</span><strong className="text-[var(--text-1)]">₹{selectedIssue.estimatedCost}</strong></div>
                          )}
                          {selectedIssue.timeSpent && (
                            <div><span className="text-gray-500 block">Time Spent</span><strong className="text-[var(--text-1)]">{selectedIssue.timeSpent}</strong></div>
                          )}
                        </div>
                        {selectedIssue.inspectionRemarks && (
                          <div className="mt-2 pt-1 border-t border-gray-700/10">
                            <span className="text-gray-500 block text-[9px]">Remarks</span>
                            <p className="text-[10px] text-[var(--text-1)] leading-snug">{selectedIssue.inspectionRemarks}</p>
                          </div>
                        )}
                      </>
                    );
                  } else {
                    return (
                      <div className="text-[10px]">
                        {selectedIssue.workCompleted ? (
                          <div className="mb-1"><strong className="text-[var(--text-1)]">{selectedIssue.workCompleted}</strong></div>
                        ) : (
                          <div className="text-gray-500 italic">Resolution in progress...</div>
                        )}
                      </div>
                    );
                  }
                })()}
              </div>
            )}

            <div className="flex flex-col gap-2.5 mt-3">
              {/* Static Rating Display in Map Explorer */}
              {selectedIssue.rating && (
                <div className="bg-gray-500/10 p-3 rounded-xl border border-gray-700/30">
                  <span className="text-[10px] text-gray-400 block mb-1">
                    {user && selectedIssue.reportedByUID === user.uid 
                      ? "You rated this complaint:" 
                      : "Citizen Resolution Rating:"}
                  </span>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= (selectedIssue.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                    ))}
                  </div>
                </div>
              )}

              {user && user.role === ROLES.CITIZEN && !(selectedIssue as any).confirmations?.some((c: any) => c.userId === user.uid) ? (
                <button
                  type="button"
                  onClick={() => handleConfirmAction(selectedIssue.uid!)}
                  className="px-4 py-2 bg-[var(--cyan)] text-slate-950 font-bold rounded-xl text-[10px] hover:scale-102 transition-transform cursor-pointer"
                >
                  👍 Confirm / Upvote Issue
                </button>
              ) : (selectedIssue as any).confirmations?.some((c: any) => c.userId === (user?.uid || "")) ? (
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/10 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Upvote Casted Successfully
                </span>
              ) : (
                <span className="text-[10px] text-gray-500 italic">Login as Citizen to Upvote alerts</span>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
      )}

    </div>
  );
}
