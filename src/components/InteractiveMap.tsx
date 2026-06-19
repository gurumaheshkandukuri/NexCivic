import { useEffect, useRef } from "react";
import { Issue } from "../types";

interface InteractiveMapProps {
  issues: Issue[];
  selectedIssueId?: string | null;
  onSelectIssue?: (issue: Issue) => void;
  onConfirmIssue?: (issueId: string) => void;
  latLngPicker?: boolean;
  onLatLngSelect?: (lat: number, lng: number, address: string) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  showHeatmap?: boolean;
}

declare const L: any; // Leaflet is loaded globally from index.html CDN

export default function InteractiveMap({
  issues,
  selectedIssueId,
  onSelectIssue,
  onConfirmIssue,
  latLngPicker = false,
  onLatLngSelect,
  center = [16.5062, 80.6480], // Andhra Pradesh Center
  zoom = 11,
  height = "520px",
  showHeatmap = false
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const pickerMarkerRef = useRef<any>(null);
  const heatmapLayersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (typeof L === "undefined") {
      console.warn("Leaflet Library is not loaded yet.");
      return;
    }

    // Initialize leaflet map
    const map = L.map(mapContainerRef.current).setView(center, zoom);
    mapRef.current = map;

    // Load OpenStreetMap Tiles
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const tileUrl = isDark 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // If in picker mode, listen to map taps
    if (latLngPicker) {
      const defaultMarker = L.marker(center, { draggable: true }).addTo(map);
      pickerMarkerRef.current = defaultMarker;

      const reverseGeocode = async (lat: number, lng: number) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const address = data.display_name || `Coordinate: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          if (onLatLngSelect) onLatLngSelect(lat, lng, address);
        } catch (err) {
          if (onLatLngSelect) onLatLngSelect(lat, lng, `Nearby Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        }
      };

      // Initial coordinates dispatch
      reverseGeocode(center[0], center[1]);

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        defaultMarker.setLatLng([lat, lng]);
        reverseGeocode(lat, lng);
      });

      defaultMarker.on("dragend", () => {
        const position = defaultMarker.getLatLng();
        reverseGeocode(position.lat, position.lng);
      });
    }

    return () => {
      map.remove();
    };
  }, []);

  // Sync tiles theme when theme changes
  useEffect(() => {
    if (!mapRef.current) return;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const tileUrl = isDark 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    // Remove existing tilelayers & append new theme
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current.removeLayer(layer);
      }
    });

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);
  }, [issues]);

  // Sync Markers
  useEffect(() => {
    if (!mapRef.current || latLngPicker) return;

    // Remove old markers
    Object.keys(markersRef.current).forEach((key) => {
      mapRef.current.removeLayer(markersRef.current[key]);
    });
    markersRef.current = {};

    // Remove old heatmap layers
    heatmapLayersRef.current.forEach((layer) => {
      mapRef.current.removeLayer(layer);
    });
    heatmapLayersRef.current = [];

    // Colors mapping corresponding to rules
    const priorityColors: { [key: string]: string } = {
      Critical: "#ff2d6b",
      High: "#ff6b35",
      Medium: "#ffd60a",
      Low: "#00ffa3"
    };

    // Calculate and draw heatmap if enabled
    if (showHeatmap && issues.length > 0) {
      // Group nearby issues by rounding lat/lng to 2 decimal places (~1.1 km cells)
      const clusters: { 
        [key: string]: { 
          lat: number; 
          lng: number; 
          count: number; 
          votes: number; 
          priorityWeight: number; 
          categoryScores: { [key: string]: number } 
        } 
      } = {};

      issues.forEach((issue) => {
        if (issue.isDuplicate && issue.duplicateOf) return;
        const cellId = `${issue.lat.toFixed(2)}_${issue.lng.toFixed(2)}`;
        const priorityScore = issue.priority === "Critical" ? 15 : issue.priority === "High" ? 10 : issue.priority === "Medium" ? 5 : 2;

        if (!clusters[cellId]) {
          clusters[cellId] = {
            lat: issue.lat,
            lng: issue.lng,
            count: 1,
            votes: issue.confirmCount || 0,
            priorityWeight: priorityScore,
            categoryScores: { [issue.category]: 1 }
          };
        } else {
          clusters[cellId].count += 1;
          clusters[cellId].votes += (issue.confirmCount || 0);
          clusters[cellId].priorityWeight += priorityScore;
          clusters[cellId].categoryScores[issue.category] = (clusters[cellId].categoryScores[issue.category] || 0) + 1;
        }
      });

      // Render nested translucent glowing circles for each cell
      Object.keys(clusters).forEach((id) => {
        const cell = clusters[id];
        // Calculate dynamic severity score
        const severityScore = cell.count * 10 + cell.votes * 3 + cell.priorityWeight;

        // Visual design of heat color based on severity score
        let heatColor = "#00ffa3"; // Low: Greenish cyan
        let heatLabel = "Low Concentration";
        if (severityScore > 40) {
          heatColor = "#ff2d6b"; // Critical: Magenta/Red
          heatLabel = "Critical Hotspot Core";
        } else if (severityScore > 20) {
          heatColor = "#ff6b35"; // High: Neon Orange
          heatLabel = "High Activity Backlog";
        } else if (severityScore > 8) {
          heatColor = "#ffd60a"; // Medium: Amber Yellow
          heatLabel = "Moderate Backlog Zone";
        }

        // Draw nested circles for smooth thermal glow transition
        const outerCircle = L.circle([cell.lat, cell.lng], {
          radius: 1100, // 1.1 km range
          fillColor: heatColor,
          fillOpacity: 0.08,
          color: "transparent",
          weight: 0
        }).addTo(mapRef.current);

        const midCircle = L.circle([cell.lat, cell.lng], {
          radius: 550, // 550m range
          fillColor: heatColor,
          fillOpacity: 0.18,
          color: heatColor,
          weight: 1,
          opacity: 0.3
        }).addTo(mapRef.current);

        const innerCircle = L.circle([cell.lat, cell.lng], {
          radius: 220, // 220m hot core
          fillColor: heatColor,
          fillOpacity: 0.45,
          color: heatColor,
          weight: 2,
          opacity: 0.8
        }).addTo(mapRef.current);

        // Bind interactive detailed hover popup text
        const topCategories = Object.entries(cell.categoryScores)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => `${name} (${count})`)
          .slice(0, 2)
          .join(", ");

        const popupText = `
          <div class="p-2 border-none font-sans" style="min-width: 200px;">
            <div class="flex items-center gap-1.5 font-display font-black text-[10px] uppercase tracking-wider text-[var(--cyan)]">
              <span>🔥 REGIONAL TELEMETRY HEAT CELL</span>
            </div>
            <div class="font-extrabold text-sm mb-1 mt-1 text-[var(--text-1)]">
              ${heatLabel}
            </div>
            <div class="text-[11px] text-[var(--text-2)] mb-2 leading-relaxed">
              Detected <strong>${cell.count}</strong> infrastructure incidents with a total confidence upvote pool of <strong>${cell.votes}</strong>.
            </div>
            <div class="grid grid-cols-2 gap-1 text-[9px] font-mono border-t border-gray-700/20 pt-1.5 mt-1 text-gray-500">
              <div>CELL: ${cell.lat.toFixed(2)}N, ${cell.lng.toFixed(2)}E</div>
              <div class="text-right">WEIGHT: ${Math.round(severityScore)}</div>
            </div>
            <div class="text-[9px] text-[var(--cyan)] font-mono mt-1 opacity-85">
              Primary: ${topCategories || "N/A"}
            </div>
          </div>
        `;

        innerCircle.bindPopup(popupText);
        midCircle.bindPopup(popupText);

        heatmapLayersRef.current.push(outerCircle);
        heatmapLayersRef.current.push(midCircle);
        heatmapLayersRef.current.push(innerCircle);
      });
    }

    // Now draw standard markers
    issues.forEach((issue) => {
      if (issue.isDuplicate && issue.duplicateOf) return; // Hide duplicates from map unless reviewing

      const color = issue.status === "Resolved" ? "#00ffa3" : (priorityColors[issue.priority] || "#2563ff");
      const radius = issue.priority === "Critical" ? 14 : issue.priority === "High" ? 11 : 8;

      // Custom SVG icon marker design (make it slightly translucent if heatmap is active or keep high-contrast)
      const opacityStyle = showHeatmap ? "opacity: 0.95; transform: scale(0.9);" : "opacity: 1;";
      const customMarkerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; ${opacityStyle}">
          <div style="
            width: ${radius * 2}px; 
            height: ${radius * 2}px; 
            background: ${color}; 
            border: 2px solid #ffffff; 
            border-radius: 50%; 
            box-shadow: 0 0 10px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="font-size: 8px; color: #000; font-weight: bold;">
              ${issue.confirmCount > 0 ? issue.confirmCount : ""}
            </span>
          </div>
          ${issue.confirmCount >= 7 ? `
            <div style="
              position: absolute;
              width: ${radius * 4}px;
              height: ${radius * 4}px;
              border: 2px solid #ff2d6b;
              border-radius: 50%;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
          ` : ""}
        </div>
      `;

      const customIcon = L.divIcon({
        html: customMarkerHtml,
        className: "custom-div-icon",
        iconSize: [radius * 2, radius * 2],
        iconAnchor: [radius, radius]
      });

      const marker = L.marker([issue.lat, issue.lng], { icon: customIcon }).addTo(mapRef.current);
      markersRef.current[issue.id] = marker;

      // Popup Content template matching request Layout
      const popupHtml = `
        <div class="p-2 select-none" style="min-width: 180px;">
          <div class="flex items-center gap-1 font-display font-bold text-xs uppercase mb-1 text-[var(--cyan)]">
            <span>${issue.category}</span>
            <span style="font-size: 9px;" class="px-1.5 py-0.5 rounded ml-auto text-white" style="background: ${color};">
              ${issue.priority}
            </span>
          </div>
          <div class="font-bold text-sm mb-1">${issue.title}</div>
          <div class="text-[11px] text-[var(--text-2)] line-clamp-2 mb-2">${issue.description}</div>
          <div class="text-[10px] text-gray-500 mb-2 flex items-center gap-1">
            <span>📍 ${issue.zone}</span>
            <span class="ml-auto">📅 ${new Date(issue.createdAt?.seconds ? issue.createdAt.seconds * 1000 : issue.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="flex items-center justify-between border-t border-gray-700/20 pt-2">
            <span class="text-xs text-[var(--text-1)] font-medium">👥 ${issue.confirmCount} confirmed</span>
            <span class="text-[10px] text-[var(--cyan)] hover:underline cursor-pointer font-bold inline-block" id="view-det-${issue.id}">
              Details →
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`view-det-${issue.id}`);
        if (btn && onSelectIssue) {
          btn.addEventListener("click", () => {
            onSelectIssue(issue);
          });
        }
      });
    });
  }, [issues, showHeatmap]);

  // Center FlyTo selected issue
  useEffect(() => {
    if (!mapRef.current || !selectedIssueId || latLngPicker) return;
    const marker = markersRef.current[selectedIssueId];
    if (marker) {
      const position = marker.getLatLng();
      mapRef.current.flyTo(position, 14, { duration: 1.5 });
      marker.openPopup();
    }
  }, [selectedIssueId]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[rgba(255,255,255,0.06)]" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      <style>{`
        @keyframes ping {
          0% {
            transform: scale(0.6);
            opacity: 1;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        .custom-div-icon {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
