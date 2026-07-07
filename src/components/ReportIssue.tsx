import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  MapPin, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  ChevronRight,
  Navigation,
  Camera,
  RefreshCw,
  Video
} from "lucide-react";

import { UserProfile, Issue } from "../types";
import { useLiveIssues } from "../hooks/useLiveIssues";
import { createIssue, confirmIssue } from "../services/issueService";
import confetti from "canvas-confetti";
import { locationData } from "../constants/locations";

declare const L: any;

const PLACE_SUGGESTIONS = [
  { landmark: "Charminar Monument", district: "Hyderabad", city: "Hyderabad", lat: 17.3616, lng: 78.4747 },
  { landmark: "Birla Mandir", district: "Hyderabad", city: "Hyderabad", lat: 17.4062, lng: 78.4690 },
  { landmark: "Golkonda Fort", district: "Hyderabad", city: "Hyderabad", lat: 17.3789, lng: 78.4004 },
  { landmark: "Cyber Towers Building", district: "Hyderabad", city: "Hyderabad", lat: 17.4504, lng: 78.3809 },
  { landmark: "Inorbit Mall", district: "Hyderabad", city: "Hyderabad", lat: 17.4348, lng: 78.3865 },
  { landmark: "Gachibowli Stadium", district: "Hyderabad", city: "Hyderabad", lat: 17.4474, lng: 78.3446 },
  { landmark: "Hussain Sagar Lake Park", district: "Hyderabad", city: "Hyderabad", lat: 17.4239, lng: 78.4738 },
  { landmark: "Secunderabad Junction Station", district: "Hyderabad", city: "Hyderabad", lat: 17.4347, lng: 78.5015 },
  { landmark: "Lumbini Park Gates", district: "Hyderabad", city: "Hyderabad", lat: 17.4140, lng: 78.4760 },
  { landmark: "Salar Jung Museum", district: "Hyderabad", city: "Hyderabad", lat: 17.3711, lng: 78.4804 },
  { landmark: "Osmania University", district: "Hyderabad", city: "Hyderabad", lat: 17.4137, lng: 78.5284 },
  { landmark: "Warangal Fort Ruins", district: "Warangal", city: "Warangal", lat: 17.9555, lng: 79.6231 },
  { landmark: "Thousand Pillar Temple", district: "Warangal", city: "Warangal", lat: 18.0031, lng: 79.5758 },
  { landmark: "Kakatiya University Gate", district: "Warangal", city: "Warangal", lat: 18.0197, lng: 79.5678 },
  { landmark: "Nizamabad Clock Tower", district: "Nizamabad", city: "Nizamabad", lat: 18.6725, lng: 78.0999 },
  { landmark: "Mallaram Forest Cottage", district: "Nizamabad", city: "Nizamabad", lat: 18.6672, lng: 78.1883 },
  { landmark: "Karimnagar Bus Station", district: "Karimnagar", city: "Karimnagar", lat: 18.4385, lng: 79.1288 },
  { landmark: "Lower Manair Dam Resort", district: "Karimnagar", city: "Karimnagar", lat: 18.4042, lng: 79.1311 },
  { landmark: "Vijayawada Kanaka Durga Temple", district: "Krishna", city: "Vijayawada", lat: 16.5131, lng: 80.6094 },
  { landmark: "Prakasam Barrage", district: "Krishna", city: "Vijayawada", lat: 16.5074, lng: 80.6044 }
];

interface ReportIssueProps {
  user: UserProfile;
  
  onSuccess: () => void;
  setActiveTab: (tab: string) => void;
}

export default function ReportIssue({ user, onSuccess, setActiveTab }: ReportIssueProps) {
  const { issues } = useLiveIssues({ scope: "all" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  
  // Landmark intuitive location fields rather than coordinates raw numbers
  const [landmark, setLandmark] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [ulb, setUlb] = useState("");

  const states = Object.keys(locationData);
  const districtsList = state && locationData[state] ? Object.keys(locationData[state]) : [];
  const ulbsList = state && district && locationData[state][district] ? locationData[state][district] : [];

  // Location suggestions autocomplete
  const [matchingSuggestions, setMatchingSuggestions] = useState<typeof PLACE_SUGGESTIONS>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const handleLandmarkChange = (val: string) => {
    setLandmark(val);
    if (!val.trim()) {
      setMatchingSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    const filtered = PLACE_SUGGESTIONS.filter(item => 
      item.landmark.toLowerCase().includes(val.toLowerCase()) || 
      item.district.toLowerCase().includes(val.toLowerCase()) || 
      item.city.toLowerCase().includes(val.toLowerCase())
    );
    setMatchingSuggestions(filtered);
    setShowLocationSuggestions(true);
  };

  const handleSelectSuggestion = (item: typeof PLACE_SUGGESTIONS[0]) => {
    setLandmark(item.landmark);
    
    // Find state and district based on the item
    let foundState = "";
    let foundDistrict = "";
    let foundUlb = "";
    
    for (const st of Object.keys(locationData)) {
      if (locationData[st][item.district]) {
        foundState = st;
        foundDistrict = item.district;
        const ulbs = locationData[st][item.district];
        const matchUlb = ulbs.find(u => u.toLowerCase().includes(item.city.toLowerCase()));
        foundUlb = matchUlb || ulbs[0] || "";
        break;
      } else {
        // search all districts
        const matchDist = Object.keys(locationData[st]).find(d => d.toLowerCase().includes(item.district.toLowerCase()));
        if (matchDist) {
          foundState = st;
          foundDistrict = matchDist;
          const ulbs = locationData[st][matchDist];
          const matchUlb = ulbs.find(u => u.toLowerCase().includes(item.city.toLowerCase()));
          foundUlb = matchUlb || ulbs[0] || "";
          break;
        }
      }
    }

    setState(foundState);
    setDistrict(foundDistrict);
    setUlb(foundUlb);
    setLat(item.lat);
    setLng(item.lng);
    setAddress(`${item.landmark}, ${item.district}, ${item.city}`);
    
    // Attempt updating coordinates marker safely
    if (mapRef.current) {
      mapRef.current.setView([item.lat, item.lng], 15);
      if (liveMarkerRef.current) {
        liveMarkerRef.current.setLatLng([item.lat, item.lng]);
      }
    }
    
    setMatchingSuggestions([]);
    setShowLocationSuggestions(false);
  };

  // Geocodes coordinates (will resolve landmarks accurately)
  const [lat, setLat] = useState(19.1197);
  const [lng, setLng] = useState(72.8468);
  const [address, setAddress] = useState("");

  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | Blob | null>(null);
  const [uploading, setUploading] = useState(false);

  // Live GPS tracking Leaflet map states & refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const liveMarkerRef = useRef<any>(null);
  const [gpsStatus, setGpsStatus] = useState<"connecting" | "active" | "error">("connecting");

  // Camera integration state
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const [similarIssue, setSimilarIssue] = useState<Issue | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdId, setCreatedId] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check proximity for similar issues during coordinates / details typing
  useEffect(() => {
    if (!lat || !lng) return;

    // Haversine formula on client-side to preempt blockages
    const findNearby = () => {
      const R = 6371e3; // metres
      const match = issues.find((issue) => {
        if (issue.status === "Resolved") return false;
        
        const lat1 = lat * Math.PI / 180;
        const lat2 = issue.latitude * Math.PI / 180;
        const deltaLat = (issue.latitude - lat) * Math.PI / 180;
        const deltaLng = (issue.longitude - lng) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c; // in metres

        return d < 200; // Within 200m
      });
      setSimilarIssue(match || null);
    };

    findNearby();
  }, [lat, lng, issues]);

  // Handle Drag-Over Image logic
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const processImageFile = (file: File) => {
    if (!file) return;
    setImageFile(file);
    setUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // Live Viewfinder Camera setup
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      activeStreamRef.current = stream;
    } catch (err: any) {
      console.error("Camera access failed:", err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes("dismissed") || errMsg.includes("Permission dismissed")) {
        setCameraError("Camera permission prompt was dismissed. Please reload or click 'Use Camera Lens' again, of if blocked, use standard file upload.");
      } else if (errMsg.includes("denied") || errMsg.includes("Permission denied") || err?.name === "NotAllowedError") {
        setCameraError("Camera permission was denied. Try manually uploading the file, or change site settings to allow camera access.");
      } else {
        setCameraError(`Camera access failed: ${errMsg}. Please use standard file upload.`);
      }
    }
  };

  const stopCamera = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      activeStreamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            setImageFile(blob);
            const dataUrl = canvas.toDataURL("image/jpeg");
            setImage(dataUrl);
            stopCamera();
            setShowCameraPreview(false);
          }
        }, "image/jpeg");
      }
    }
  };

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Helper function using browser Geolocation API and reverse geocoding to pre-populate Landmark, District, and City
  const fetchAndPopulateLocationDetails = () => {
    setGpsStatus("connecting");
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by your browser.");
      setGpsStatus("error");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        setGpsStatus("active");
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            
            const rawState = addr.state || "";
            const rawDistrict = addr.state_district || addr.county || addr.suburb || addr.neighbourhood || "";
            const rawCity = addr.city || addr.town || addr.village || addr.municipality || "";
            
            let finalState = "Not found";
            let finalDistrict = "Not found";
            let finalUlb = "Not found";

            if (rawState && locationData[rawState]) {
              finalState = rawState;
              const districts = Object.keys(locationData[rawState]);
              
              const matchedDistrict = districts.find(d => rawDistrict && d.toLowerCase().includes(rawDistrict.toLowerCase().replace(" district", "")) || rawDistrict.toLowerCase().includes(d.toLowerCase()));
              if (matchedDistrict) {
                finalDistrict = matchedDistrict;
                const ulbs = locationData[rawState][matchedDistrict];
                const matchedUlb = ulbs.find(u => rawCity && (u.toLowerCase().includes(rawCity.toLowerCase()) || rawCity.toLowerCase().includes(u.toLowerCase().replace(" municipality", ""))));
                if (matchedUlb) {
                  finalUlb = matchedUlb;
                }
              }
            }
            
            setState(finalState);
            setDistrict(finalDistrict);
            setUlb(finalUlb);

            const fetchedLandmark = addr.amenity || addr.building || addr.road || addr.industrial || addr.commercial || addr.subway || addr.railway || "";
            if (fetchedLandmark) {
              setLandmark(fetchedLandmark);
            } else {
              setLandmark(addr.road || "");
            }
            setAddress(data.display_name || `${fetchedLandmark ? `${fetchedLandmark}, ` : ""}${rawDistrict}, ${rawCity}`);
          }
        } catch (err) {
          console.error("Error reverse-geocoding coordinates:", err);
          setState("Not found");
          setDistrict("Not found");
          setUlb("Not found");
          setAddress(`Coords: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto trigger exact location and address auto-fill on mount
  useEffect(() => {
    fetchAndPopulateLocationDetails();
  }, []);

  // Initialize leafet real-time location tracker map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (typeof L === "undefined") {
      console.warn("Leaflet Library is not loaded yet.");
      return;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lng], 15);
    
    mapRef.current = map;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const tileUrl = isDark 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl).addTo(map);

    const liveIconHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="
          width: 16px; 
          height: 16px; 
          background: #00e5ff; 
          border: 3px solid #ffffff; 
          border-radius: 50%; 
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.8);
          z-index: 10;
        "></div>
        <div style="
          position: absolute;
          width: 36px;
          height: 36px;
          background: rgba(0, 229, 255, 0.25);
          border: 1.5px solid #00e5ff;
          border-radius: 50%;
          animation: map-ping-anim 1.8s infinite ease-out;
        "></div>
      </div>
    `;

    const customLiveIcon = L.divIcon({
      html: liveIconHtml,
      className: "live-telemetry-gps-icon",
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const marker = L.marker([lat, lng], { icon: customLiveIcon }).addTo(map);
    liveMarkerRef.current = marker;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Align map viewport with precise GPS coordinates and show nearby issues
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
      
      // Render nearby issues within 200m
      const R = 6371e3; // metres
      const lat1 = lat * Math.PI / 180;
      
      // Remove previous nearby markers
      mapRef.current.eachLayer((layer: any) => {
        if (layer.options && layer.options.className === "nearby-issue-marker") {
          mapRef.current.removeLayer(layer);
        }
      });
      
      issues.forEach(issue => {
        if (issue.status === "Resolved") return;
        
        const lat2 = issue.latitude * Math.PI / 180;
        const deltaLat = (issue.latitude - lat) * Math.PI / 180;
        const deltaLng = (issue.longitude - lng) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c; // in metres

        if (d < 200) {
          const customMarkerHtml = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="
                width: 12px; 
                height: 12px; 
                background: #ffaa00; 
                border: 2px solid #ffffff; 
                border-radius: 50%; 
                box-shadow: 0 0 5px rgba(255, 170, 0, 0.8);
                z-index: 5;
              "></div>
            </div>
          `;
          
          const customIcon = L.divIcon({
            html: customMarkerHtml,
            className: "nearby-issue-marker custom-div-icon",
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });
          
          L.marker([issue.latitude, issue.longitude], { icon: customIcon, className: "nearby-issue-marker" })
           .bindPopup(`<div style="font-size: 10px; font-weight: bold;">Nearby: ${issue.title}</div>`)
           .addTo(mapRef.current);
        }
      });
    }
    if (liveMarkerRef.current) {
      liveMarkerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng, issues]);

  const proceedWithSubmission = async () => {
    setLoading(true);

    const fullDetailsLocation = `${landmark ? `${landmark}, ` : ""}${district}, ${ulb}`;

    try {
        console.log("TRACE [ReportIssue]: Submitting payload", {
          imageUrl: image || "",
          imageFile: imageFile || null
        });

      const res = await createIssue({
        title,
        description,
        category,
        priority,
        status: "Open",
        latitude: lat,
        longitude: lng,
        district: district,
        state: state,
        ulb: ulb,
        area: ulb,
        landmark: landmark,
        address: address || `${landmark ? landmark + ", " : ""}${district}, ${ulb}`,
        reportedByUID: user.uid,
        reportedByName: user.name,
        assignedInspectorEmail: user.email,
        communitySupportCount: 0,
        inspectionImages: [],
        resolutionImages: [],
        timeline: [],
        comments: [],
        imageUrl: image || "",
        imageFile: imageFile || null
      } as any);

      console.log("TRACE [ReportIssue]: createIssue completed, res:", res);

      if (!res) {
        alert('Queued for sync: The network is currently unavailable. Your complaint will be synchronized once the connection is restored.');
        setCreatedId('offline-queued');
        setSuccess(true);
      } else {
        setCreatedId(res.id);
        setSuccess(true);
      }
      
      // confetti celebration
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        onSuccess();
        setActiveTab("dashboard");
      }, 4000);

    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setLoading(false);
      setShowDuplicateModal(false);
    }
  }

  // Submit Issue
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    if (similarIssue && !showDuplicateModal) {
      setShowDuplicateModal(true);
      return;
    }

    proceedWithSubmission();
  };

  const handleUpvoteDuplicate = async () => {
    if (!similarIssue) return;
    await confirmIssue(similarIssue.id || "", user.uid, user.name);
    confetti({ particleCount: 30 });
    onSuccess();
    setActiveTab("dashboard");
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto py-12 md:py-24 text-center flex flex-col items-center gap-6" data-aos="zoom-in">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center animate-bounce text-emerald-400 font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--text-1)]">
          Civic Issue Logged!
        </h2>
        <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/15 max-w-sm">
          <span className="block font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
            Achievement Unlock
          </span>
          <span className="block text-sm font-bold text-[var(--text-1)] mt-1">
            +20 Community Experience XP
          </span>
          <span className="block text-[11px] text-[var(--text-2)] mt-0.5">
            Your telemetry has been flagged for dispatching authorities.
          </span>
        </div>
        <button
          onClick={() => { onSuccess(); setActiveTab("dashboard"); }}
          className="px-6 py-2.5 bg-[var(--cyan)] hover:scale-103 transition-transform text-slate-950 font-bold rounded-xl text-xs"
        >
          View Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      {/* Header section */}
      <div className="text-left mb-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--cyan)]/10 text-[var(--cyan)] font-bold text-[10px] uppercase font-mono">
          <FileText className="w-3.5 h-3.5" />
          <span>New administrative report</span>
        </div>
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--text-1)] mt-2">
          Report a Civic Grievance
        </h2>
        <p className="text-xs text-[var(--text-2)] mt-1">
          Upload photo, fetch map coordinates intuitively, and use server-side analysis to process entries seamlessly.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column - uploads & locations */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Diagnostic Media Source Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setShowCameraPreview(false);
              }}
              className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl transition-all border cursor-pointer ${
                !showCameraPreview 
                  ? "bg-[var(--cyan)]/[0.08] text-[var(--cyan)] border-[var(--cyan)]/30" 
                  : "bg-transparent text-slate-500 border-slate-200 dark:border-gray-850 dark:text-gray-400 dark:hover:text-white hover:text-slate-900"
              }`}
            >
              📂 Upload File
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCameraPreview(true);
                startCamera();
              }}
              className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                showCameraPreview 
                  ? "bg-[var(--cyan)]/[0.08] text-[var(--cyan)] border-[var(--cyan)]/30" 
                  : "bg-transparent text-slate-500 border-slate-200 dark:border-gray-850 dark:text-gray-400 dark:hover:text-white hover:text-slate-900"
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Use Camera Lens
            </button>
          </div>

          {showCameraPreview ? (
            <div className="glass rounded-3xl p-5 border border-slate-200 dark:border-gray-800 flex flex-col gap-4 text-left relative overflow-hidden">
              <span className="text-[10px] uppercase font-mono tracking-widest font-extrabold text-[var(--cyan)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Live Viewfinder Camera Stream
              </span>

              <div className="relative w-full h-52 bg-black rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-800/80 flex items-center justify-center shadow-inner">
                {cameraError ? (
                  <div className="text-center p-6 text-xs text-rose-400 flex flex-col items-center justify-center gap-2">
                    <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2 animate-bounce" />
                    <span>{cameraError}</span>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-gray-800 dark:hover:bg-gray-750 text-[var(--text-1)] border border-slate-300 dark:border-gray-700 rounded-lg font-bold text-[9px] uppercase flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          setShowCameraPreview(false);
                        }}
                        className="px-3 py-1.5 bg-[var(--cyan)] text-slate-950 rounded-lg font-bold text-[9px] uppercase cursor-pointer transition-all"
                      >
                        File Upload Mode
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover" 
                      playsInline 
                      muted 
                    />
                    {/* viewfinder overlays */}
                    <div className="absolute inset-4 pointer-events-none border border-dashed border-[var(--cyan)]/25 rounded-xl flex items-center justify-center">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-[var(--cyan)] absolute top-0 left-0" />
                      <div className="w-6 h-6 border-t-2 border-r-2 border-[var(--cyan)] absolute top-0 right-0" />
                      <div className="w-6 h-6 border-b-2 border-l-2 border-[var(--cyan)] absolute bottom-0 left-0" />
                      <div className="w-6 h-6 border-b-2 border-r-2 border-[var(--cyan)] absolute bottom-0 right-0" />
                    </div>
                  </>
                )}
              </div>

              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-full py-3 bg-[var(--cyan)] hover:scale-101 text-slate-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,186,220,0.15)] transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 fill-current text-slate-950" />
                  Capture Incident Frame
                </button>
              )}
            </div>
          ) : (
            /* Drag and Drop Zone */
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="glass rounded-2xl p-6 text-center border-2 border-dashed border-slate-300 dark:border-gray-700 hover:border-[var(--cyan)] cursor-pointer transition-all relative group flex flex-col items-center justify-center min-h-[220px]"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileSelect} 
              />

              {image ? (
                <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-inner">
                  <img src={image} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <span className="text-xs font-bold text-white uppercase bg-gray-950/80 px-3 py-1.5 rounded-lg border border-white/10">
                      Change Photo
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-[var(--cyan)]/5 flex items-center justify-center text-[var(--cyan)]">
                    <Upload className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="font-bold text-xs mt-1 text-[var(--text-2)]">
                    Drag & drop issue photo or click to browse
                  </div>
                  <p className="text-[10px] text-gray-500">
                    JPEG, PNG or HEIC format, Max 15MB
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Real-time exact telemetry map */}
          <div className="glass p-4 rounded-3xl border border-slate-200/50 dark:border-white/10 flex flex-col gap-3 text-left">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-xs uppercase text-[var(--text-1)] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[var(--cyan)]" /> Real-time Exact Location Tracker
              </span>
              
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 font-mono ${
                gpsStatus === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : gpsStatus === "connecting" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${gpsStatus === "active" ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
                {gpsStatus === "active" ? "GPS Locked" : gpsStatus === "connecting" ? "Calibrating" : "GPS Error"}
              </span>
            </div>

            <div 
              ref={mapContainerRef} 
              className="w-full h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-850 relative shadow-inner z-10"
              style={{ minHeight: "180px" }}
            />

            <div className="bg-slate-500/5 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-[10px] text-slate-500 dark:text-gray-400 font-mono leading-relaxed flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span>🛰️ Live Telemetry Lat/Lng:</span>
                <span className="font-bold text-[var(--cyan)]">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-white/10 my-1" />
              <div>
                <span className="block text-gray-500 uppercase text-[8px] font-bold tracking-wider mb-0.5">Resolved GPS Address:</span>
                <span className="text-[11px] text-[var(--text-2)] font-sans leading-normal block">{address || "Waiting for GPS calibration..."}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right column - form metrics */}
        <div className="lg:col-span-7 glass rounded-3xl p-6 md:p-8 border border-[rgba(255,255,255,0.06)] flex flex-col gap-5 text-left relative">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
              Issue Headline (Title)
            </label>
            <input 
              type="text"
              required
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors(prev => ({...prev, title: ""})); }}
              placeholder="e.g., Deep Sewer Grid Overflow"
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
                Category
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  "Garbage Overflow", 
                  "Drainage Overflow", 
                  "Road Damage", 
                  "Street Light", 
                  "Water Leakage", 
                  "Public Property Damage", 
                  "Traffic Signal", 
                  "Illegal Dumping", 
                  "Dead Animal", 
                  "Others"
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategory(cat as any); setErrors(prev => ({...prev, category: ""})); }}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                      category === cat
                        ? "bg-[var(--cyan)]/10 border-[var(--cyan)] text-[var(--cyan)] shadow-[0_0_10px_rgba(0,186,220,0.1)]"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-gray-800 text-[var(--text-2)] hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {cat}
                    {category === cat && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                ))}
              </div>
              {errors.category && <span className="text-red-500 text-[10px] font-bold">{errors.category}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
                Initial Severity / Priority
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(["Low", "Medium", "High", "Critical"] as const).map((pri) => (
                  <button
                    key={pri}
                    type="button"
                    onClick={() => { setPriority(pri as any); setErrors(prev => ({...prev, priority: ""})); }}
                    className={`py-2 px-1 rounded-lg text-[9px] uppercase font-bold border transition-all ${
                      priority === pri 
                        ? pri === "Critical" ? "bg-[var(--red)]/15 border-[var(--red)] text-[var(--red)]" 
                        : pri === "High" ? "bg-[var(--orange)]/15 border-[var(--orange)] text-[var(--orange)]"
                        : pri === "Medium" ? "bg-[var(--yellow)]/15 border-[var(--yellow)] text-[var(--yellow)]"
                        : "bg-[var(--green)]/15 border-[var(--green)] text-[var(--green)]"
                        : "bg-transparent border-gray-700/50 text-[var(--text-3)]"
                    }`}
                  >
                    ● {pri}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* landmark district and city */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
              Address Details
            </span>
            <button
              type="button"
              onClick={fetchAndPopulateLocationDetails}
              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[var(--cyan)]/10 text-[var(--cyan)] hover:bg-[var(--cyan)]/25 transition-all flex items-center gap-1 border border-[var(--cyan)]/20 cursor-pointer"
            >
              <Navigation className="w-3 h-3 animate-pulse" /> Auto-fill Address Info
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
                Nearby Landmark
              </label>
              <input 
                type="text"
                required
                value={landmark}
                onChange={(e) => { handleLandmarkChange(e.target.value); setErrors(prev => ({...prev, landmark: ""})); }}
                onFocus={() => {
                  if (landmark.trim()) setShowLocationSuggestions(true);
                }}
                onBlur={() => {
                  // delay so that clicking suggestions registers before blur hides it
                  setTimeout(() => setShowLocationSuggestions(false), 200);
                }}
                placeholder="e.g., Near Gokhale Flyover"
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
              />

              {showLocationSuggestions && matchingSuggestions.length > 0 && (
                <div className="absolute top-[102%] left-0 right-0 max-h-56 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 p-2 divide-y divide-slate-100 dark:divide-gray-850 backdrop-blur-xl">
                  {matchingSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onMouseDown={() => handleSelectSuggestion(item)}
                      className="p-2.5 text-left hover:bg-slate-500/10 dark:hover:bg-white/5 cursor-pointer rounded-lg transition-colors"
                    >
                      <span className="block font-bold text-xs text-[var(--text-1)]">📍 {item.landmark}</span>
                      <span className="block text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">{item.district}, {item.city}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
                State
              </label>
              <select
                required
                value={state}
                onChange={(e) => { setState(e.target.value); setErrors(prev => ({...prev, state: ""})); }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
              >
                <option value="">Select State</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <span className="text-red-500 text-[10px] font-bold">{errors.state}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
                District
              </label>
              <select
                required
                value={district}
                onChange={(e) => { setDistrict(e.target.value); setErrors(prev => ({...prev, district: ""})); }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
              >
                <option value="">Select District</option>
                {districtsList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.district && <span className="text-red-500 text-[10px] font-bold">{errors.district}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
                ULB (Urban Local Body)
              </label>
              <select
                required
                value={ulb}
                onChange={(e) => { setUlb(e.target.value); setErrors(prev => ({...prev, ulb: ""})); }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
              >
                <option value="">Select ULB</option>
                {ulbsList.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              {errors.ulb && <span className="text-red-500 text-[10px] font-bold">{errors.ulb}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
              Issue Description
            </label>
            <textarea 
              rows={4}
              required
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({...prev, description: ""})); }}
              placeholder="Describe the nature of the issue with appropriate landmark details..."
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all resize-none"
            />
          </div>

          {/* DUPLICATE WARNING BAR */}
          {similarIssue && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                <span>Nearby duplicate flagged: "{similarIssue.title}" reported about 150m away.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(true)}
                className="text-[10px] font-bold underline text-amber-200"
              >
                Inspect
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 clay-btn disabled:scale-100 disabled:opacity-50 text-white font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-xs"
          >
            {loading ? "Submitting to local council..." : "Submit Report"}
          </button>

        </div>

      </form>

      {/* DUPLICATE MODAL POPUP */}
      {showDuplicateModal && similarIssue && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="glass max-w-lg w-full rounded-3xl p-6 border border-slate-200 dark:border-gray-700 animate-zoomIn flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2 border-b border-slate-250 dark:border-gray-750 pb-3 mb-1">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="font-display font-bold text-base text-[var(--text-1)]">
                Smart Duplicate Alert
              </h3>
            </div>
            
            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              We identified an existing report representing the identical physical issue nearby. You can choose to add your upvote count to this ticket to escalate urgency, or submit yours separately anyway.
            </p>

            <div className="p-4 bg-slate-500/5 dark:bg-[rgba(255,255,255,0.02)] rounded-2xl border border-slate-200 dark:border-gray-700/20 text-xs">
              {(similarIssue.imageUrl || similarIssue.imageData) && (
                <img src={similarIssue.imageUrl || similarIssue.imageData || ""} alt={similarIssue.title} className="w-full h-auto rounded-lg mb-4" />
              )}
              <div className="font-extrabold text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                {similarIssue.title}
              </div>
              <p className="text-[11px] text-[var(--text-2)] italic mt-1 leading-relaxed">
                "{similarIssue.description}"
              </p>
              <div className="text-[10px] text-gray-500 mt-2">
                📍 {similarIssue.address} ({similarIssue.confirmCount} confirmations)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={handleUpvoteDuplicate}
                className="py-3 bg-transparent border border-slate-250 dark:border-gray-700 hover:border-slate-400 dark:hover:border-gray-500 rounded-xl text-xs font-bold text-center text-[var(--text-2)] hover:text-[var(--text-1)]"
              >
                Upvote Existing Ticket
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setSimilarIssue(null);
                  proceedWithSubmission();
                }}
                className="py-3 bg-[var(--cyan)] text-slate-950 hover:bg-[var(--cyan)]/90 rounded-xl text-xs font-bold text-center"
              >
                Submit Mine Separately
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
