import React, { useState, useEffect } from "react";
import { Bell, Shield, Check, Save, Sliders, Volume2, Info } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase-init";

interface NotificationSettingsProps {
  userUID: string;
  onClose?: () => void;
}

export interface NotificationPreferences {
  newComplaint: boolean;
  assignment: boolean;
  inspection: boolean;
  approval: boolean;
  feedback: boolean;
  system: boolean;
}

export default function NotificationSettings({ userUID, onClose }: NotificationSettingsProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    newComplaint: true,
    assignment: true,
    inspection: true,
    approval: true,
    feedback: true,
    system: true
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!userUID) return;
    const fetchPrefs = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userUID));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.notificationPreferences) {
            setPrefs((prev) => ({ ...prev, ...data.notificationPreferences }));
          }
        }
      } catch (err) {
        console.error("[NotificationSettings] Error loading preferences:", err);
      }
    };
    fetchPrefs();
  }, [userUID]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!userUID) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", userUID), {
        notificationPreferences: prefs
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("[NotificationSettings] Error saving preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  const options: { key: keyof NotificationPreferences; label: string; desc: string }[] = [
    { key: "newComplaint", label: "New Grievance Alerts", desc: "Receive real-time alerts when new complaints are submitted" },
    { key: "assignment", label: "Inspector Assignment Notices", desc: "Notifications when grievances are assigned to field officers" },
    { key: "inspection", label: "Field Inspection Updates", desc: "Updates when physical site inspection commences or completes" },
    { key: "approval", label: "Resolution Approval Notices", desc: "Alerts when municipal resolutions are verified and approved" },
    { key: "feedback", label: "Citizen Rating & Feedback", desc: "Notifications when citizens submit resolution ratings" },
    { key: "system", label: "System Telemetry & Status", desc: "Administrative status updates and system maintenance notices" }
  ];

  return (
    <div className="p-6 bg-[#0b0f19] border border-white/10 rounded-3xl max-w-lg w-full text-slate-100 shadow-2xl glass text-left">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-lg text-slate-100">
              Notification Delivery Preferences
            </h3>
            <span className="text-xs text-slate-400 block">
              Manage in-app alert toggles. Audit history remains preserved.
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {options.map((opt) => (
          <div key={opt.key} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="pr-4">
              <span className="text-xs font-extrabold text-slate-200 block">
                {opt.label}
              </span>
              <span className="text-[11px] text-slate-400 block leading-relaxed mt-0.5">
                {opt.desc}
              </span>
            </div>

            <button
              onClick={() => handleToggle(opt.key)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                prefs[opt.key] ? "bg-cyan-500" : "bg-slate-800 border border-slate-700"
              }`}
              aria-label={`Toggle ${opt.label}`}
            >
              <span className={`w-5 h-5 rounded-full bg-slate-950 shadow-md transform transition-transform ${
                prefs[opt.key] ? "translate-x-6" : "translate-x-0"
              }`} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
        {savedSuccess && (
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-4 h-4" /> Preferences saved!
          </span>
        )}

        <div className="flex items-center gap-3 ml-auto">
          {onClose && (
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs touch-target cursor-pointer transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="py-2.5 px-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 touch-target cursor-pointer transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
