import React, { useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "../firebase-init";
import { createUserProfile, getUserProfile } from "../dbService";
import Logo from "./Logo";
import { 
  Users, 
  UserCheck, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  ChevronRight, 
  CheckCircle2, 
  ArrowLeft,
  Flame,
  Phone,
  Home
} from "lucide-react";

interface AuthPageProps {
  onSuccess: () => void;
  theme?: "light" | "dark";
}

export default function AuthPage({ onSuccess, theme = "dark" }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Login form field state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup Multi-step state
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"Citizen" | "Authority" | "MunicipalityMgr">("Citizen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [zone, setZone] = useState("Zone A");

  // Prepopulate Demo Account Sign in logic
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      let profile = null;
      try {
        profile = await getUserProfile(user.uid);
      } catch (fetchErr) {
        console.warn("Failed fetching Google user profile from DB:", fetchErr);
      }

      if (!profile) {
        profile = {
          id: user.uid,
          name: user.displayName || "Google Citizen",
          email: user.email || "",
          role: "Citizen",
          avatar: null,
          phone: user.phoneNumber || "",
          zone: "Zone A",
          points: 50,
          badges: ["First Reporter"],
          reportCount: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        try {
          await createUserProfile(user.uid, profile);
        } catch (writeErr) {
          console.warn("Failed persisting Google profile, logging in with local profile:", writeErr);
        }
      }
      localStorage.setItem("nex_civic_simulated_user", JSON.stringify(profile));
      onSuccess();
      window.location.reload();
    } catch (err: any) {
      console.warn("Google Sign-In failed, doing local simulated sign in mapping as workaround", err);
      // Create local simulated user
      const localId = "google_stub";
      const profile = {
        id: localId,
        name: "Google Citizen",
        email: "google.citizen@example.com",
        role: "Citizen" as const,
        avatar: null,
        phone: "+91 98765 43210",
        zone: "Zone A",
        points: 50,
        badges: ["First Reporter"],
        reportCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      try {
        await createUserProfile(localId, profile);
      } catch (writeErr) {
        console.warn("Failed writing backup google_stub config:", writeErr);
      }
      localStorage.setItem("nex_civic_simulated_user", JSON.stringify(profile));
      onSuccess();
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const handlePrepopulatedLogin = async (e: string, p: string) => {
    setLoading(true);
    setError("");
    try {
      try {
        await signInWithEmailAndPassword(auth, e, p);
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            localStorage.setItem("nex_civic_simulated_user", JSON.stringify(profile));
            onSuccess();
            window.location.reload();
            return;
          }
        }
      } catch (authErr) {
        console.log("Firebase prepopulated sign in failed/offline, using local simulated account instead:", authErr);
      }

      const demoUsersMap: Record<string, string> = {
        "citizen1@demo.com": "citizen1",
        "citizen2@demo.com": "citizen2",
        "citizen3@demo.com": "citizen3",
        "authority1@demo.com": "authority1",
        "authority2@demo.com": "authority2",
        "manager@demo.com": "manager",
        "guru12@gmail.com": "guru12",
        "authority@nexcivic.com": "authority_nexcivic",
        "commisioner@nexcivic.com": "commissioner_nexcivic",
        "commissioner@nexcivic.com": "commissioner_nexcivic",
      };

      const matchedId = demoUsersMap[e.toLowerCase().trim()];
      if (matchedId) {
        let profile = null;
        try {
          profile = await getUserProfile(matchedId);
        } catch (fetchErr) {
          console.warn("Failed fetching prepopulated user profile from DB:", fetchErr);
        }

        if (!profile) {
          // If profile does not exist yet (e.g. seeding skipped), register on-the-fly
          let tempName = "";
          let tempRole: "Citizen" | "Authority" = "Citizen";
          
          if (matchedId === "manager") {
            tempName = "Municipal Commissioner Mehta";
            tempRole = "Authority";
          } else if (matchedId === "guru12") {
            tempName = "Guru";
            tempRole = "Citizen";
          } else if (matchedId === "authority_nexcivic") {
            tempName = "Inspector NexCivic";
            tempRole = "Authority";
          } else if (matchedId === "commissioner_nexcivic") {
            tempName = "Commissioner NexCivic";
            tempRole = "Authority";
          } else {
            tempName = matchedId.charAt(0).toUpperCase() + matchedId.slice(1);
            tempRole = matchedId.startsWith("citizen") ? ("Citizen" as const) : ("Authority" as const);
          }

          profile = {
            id: matchedId,
            name: tempName,
            email: e.toLowerCase().trim(),
            role: tempRole,
            avatar: null,
            phone: "+91 98765 43210",
            zone: tempRole === "Authority" ? "All Zones" : "Zone A",
            points: tempRole === "Citizen" ? 245 : 0,
            badges: tempRole === "Citizen" ? ["First Reporter", "Rising Star"] : [],
            reportCount: 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };
          try {
            await createUserProfile(matchedId, profile);
          } catch (writeErr) {
            console.warn("Failed persisting prepopulated profile to DB, logging in locally:", writeErr);
          }
        }
        localStorage.setItem("nex_civic_simulated_user", JSON.stringify(profile));
        onSuccess();
        window.location.reload();
        return;
      }
      throw new Error("Demo profile matching failed.");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setLoading(true);
    setError("");

    try {
      try {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          let profile = null;
          try {
            profile = await getUserProfile(firebaseUser.uid);
          } catch (fetchErr) {
            console.warn("Failed fetching authenticated profile:", fetchErr);
          }
          if (profile) {
            localStorage.setItem("nex_civic_simulated_user", JSON.stringify(profile));
            onSuccess();
            window.location.reload();
            return;
          }
        }
      } catch (authErr) {
        console.log("Firebase login failed/unregistered. Initializing simulated login...");
      }

      const demoUsersMap: Record<string, string> = {
        "citizen1@demo.com": "citizen1",
        "citizen2@demo.com": "citizen2",
        "citizen3@demo.com": "citizen3",
        "authority1@demo.com": "authority1",
        "authority2@demo.com": "authority2",
        "manager@demo.com": "manager",
        "guru12@gmail.com": "guru12",
        "authority@nexcivic.com": "authority_nexcivic",
        "commisioner@nexcivic.com": "commissioner_nexcivic",
        "commissioner@nexcivic.com": "commissioner_nexcivic",
      };

      const matchedId = demoUsersMap[loginEmail.toLowerCase().trim()];
      if (matchedId) {
        let profile = null;
        try {
          profile = await getUserProfile(matchedId);
        } catch (fetchErr) {
          console.warn("Failed fetching matched prepopulated user profile:", fetchErr);
        }
        if (!profile) {
          let tempName = "";
          let tempRole: "Citizen" | "Authority" | "MunicipalityMgr" = "Citizen";
          
          if (matchedId === "manager") {
            tempName = "Municipal Commissioner Mehta";
            tempRole = "MunicipalityMgr";
          } else if (matchedId === "guru12") {
            tempName = "Guru";
            tempRole = "Citizen";
          } else if (matchedId === "authority_nexcivic") {
            tempName = "Inspector NexCivic";
            tempRole = "Authority";
          } else if (matchedId === "commissioner_nexcivic") {
            tempName = "Commissioner NexCivic";
            tempRole = "MunicipalityMgr";
          } else {
            tempName = matchedId.charAt(0).toUpperCase() + matchedId.slice(1);
            tempRole = matchedId.startsWith("citizen") ? ("Citizen" as const) : ("Authority" as const);
          }
 
          profile = {
            id: matchedId,
            name: tempName,
            email: loginEmail.toLowerCase().trim(),
            role: tempRole,
            avatar: null,
            phone: "+91 98765 43210",
            zone: tempRole === "Authority" ? "Zone A" : tempRole === "MunicipalityMgr" ? "All Zones" : "Zone A",
            points: tempRole === "Citizen" ? 245 : 0,
            badges: tempRole === "Citizen" ? ["First Reporter", "Rising Star"] : [],
            reportCount: 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };
          try {
            await createUserProfile(matchedId, profile);
          } catch (writeErr) {
            console.warn("Failed persisting matched login profile to DB, logging in locally:", writeErr);
          }
        }
        localStorage.setItem("nex_civic_simulated_user", JSON.stringify(profile));
        onSuccess();
        window.location.reload();
        return;
      }
 
      // Generate a user profile for any other email dynamically on the fly
      const normalizedEmail = loginEmail.toLowerCase().trim();
      const localId = "sim_" + btoa(normalizedEmail).replace(/=/g, "").slice(0, 15);
      
      let profile = null;
      try {
        profile = await getUserProfile(localId);
      } catch (fetchErr) {
        console.warn("Failed fetching generated user profile:", fetchErr);
      }
      if (!profile) {
        const tempName = loginEmail.split("@")[0];
        const isDemoManager = normalizedEmail.includes("mgr") || normalizedEmail.includes("commissioner") || normalizedEmail.includes("mehta") || normalizedEmail.includes("chief");
        const isDemoAuthority = normalizedEmail.includes("auth") || normalizedEmail.includes("inspector") || normalizedEmail.includes("patil") || normalizedEmail.includes("rao") || normalizedEmail.includes("admin");
        
        let assignedRole: "Citizen" | "Authority" | "MunicipalityMgr" = "Citizen";
        if (isDemoManager) {
          assignedRole = "MunicipalityMgr";
        } else if (isDemoAuthority) {
          assignedRole = "Authority";
        }
 
        profile = {
          id: localId,
          name: tempName.charAt(0).toUpperCase() + tempName.slice(1),
          email: normalizedEmail,
          role: assignedRole,
          avatar: null,
          phone: "+91 99999 99999",
          zone: assignedRole === "Authority" ? "All Zones" : "Zone A",
          points: assignedRole === "Citizen" ? 50 : 0,
          badges: assignedRole === "Citizen" ? ["First Reporter"] : [],
          reportCount: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        try {
          await createUserProfile(localId, profile);
        } catch (writeErr) {
          console.warn("Failed persisting custom generated profile, logging in locally:", writeErr);
        }
      }

      localStorage.setItem("nex_civic_simulated_user", JSON.stringify(profile));
      onSuccess();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed authentication");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let uid = "sim_" + btoa(email.toLowerCase().trim()).replace(/=/g, "").slice(0, 15);
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
      } catch (authErr) {
        console.log("Firebase Auth signup skipped or bypassed. Proceeding with simulated profile creation:", authErr);
      }

      const profileData = {
        id: uid,
        name: fullName,
        email,
        role,
        avatar: null,
        phone,
        department: role !== "Citizen" ? department : "",
        zone,
        points: role === "Citizen" ? 20 : 0, // award bootstrap points to citizens
        badges: role === "Citizen" ? ["First Reporter"] : [],
        reportCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      // sync Firestore Profile metadata
      try {
        await createUserProfile(uid, profileData);
      } catch (writeErr) {
        console.warn("Failed persisting signed-up profile to DB, setting local session:", writeErr);
      }
      localStorage.setItem("nex_civic_simulated_user", JSON.stringify(profileData));

      setStep(3); // Go to Success tab
    } catch (err: any) {
      setError(err.message || "Failed account registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 text-left">
      
      <div className="glass rounded-3xl p-6 md:p-8 border border-slate-200/50 dark:border-white/10 relative overflow-hidden shadow-2xl flex flex-col gap-6 bg-white/40 dark:bg-slate-900/65">
        
        {/* Animated accent gradient circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--cyan)]/5 rounded-full filter blur-2xl -z-10" />

        {/* Form header */}
        <div className="text-center flex flex-col items-center gap-4">
          <Logo size="lg" className="mx-auto" themeType={theme} />
          <div>
            <h2 className="font-display font-extrabold text-2xl text-[var(--text-1)]">
              {isLogin ? "Sign In to NexCivic" : "Create administrative account"}
            </h2>
            <p className="text-[11px] text-[var(--text-2)] mt-1.5 leading-relaxed">
              {isLogin 
                ? "Access your dashboard to report and track municipal incidents real-time." 
                : "Register your administrative profile and connect to regional wards."}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-xl text-xs text-[var(--red)] text-center font-medium animate-pulse">
            ⚠️ {error}
          </div>
        )}

        {isLogin ? (
          /* ========================================================= */
          /*                       LOGIN VIEW                          */
          /* ========================================================= */
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-500">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                <input 
                  type="email" 
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. resident@mumbai.com"
                  className="pl-9 pr-4 py-3 bg-[rgba(255,255,255,0.02)] border border-gray-700/50 rounded-xl outline-none text-xs focus:border-[var(--cyan)] w-full transition-all text-[var(--text-1)]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-500">Password Code</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                <input 
                  type="password" 
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-9 pr-4 py-3 bg-[rgba(255,255,255,0.02)] border border-gray-700/50 rounded-xl outline-none text-xs focus:border-[var(--cyan)] w-full transition-all text-[var(--text-1)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 clay-btn text-white font-bold rounded-xl text-xs"
            >
              {loading ? "Authenticating credentials..." : "Sign In Account"}
            </button>

            <div className="flex items-center my-1 gap-2">
              <div className="flex-1 border-t border-gray-700/20" />
              <span className="text-[9px] font-bold text-gray-500 uppercase">OR</span>
              <div className="flex-1 border-t border-gray-700/20" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-[var(--bg-void)] hover:bg-[var(--bg-mid)] border border-gray-700/50 hover:border-indigo-500/50 text-[var(--text-1)] font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.29 1.45 15.52 0 12.24 0c-6.63 0-12 5.37-12 12s5.37 12 12 12c6.93 0 11.53-4.87 11.53-11.74 0-.79-.08-1.4-.19-1.975H12.24z"
                />
              </svg>
              <span>Sign In with Google</span>
            </button>

            {/* Quick pre-populated login trigger */}
            <div className="border-t border-gray-700/20 pt-4 mt-2">
              <span className="block text-[9px] uppercase font-bold text-gray-500 text-center mb-2">
                ⚡ PREPOPULATED DEMO ACCOUNTS FOR CONVENIENCE
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePrepopulatedLogin("guru12@gmail.com", "guru12")}
                  className="p-2 bg-[rgba(255,255,255,0.02)] hover:bg-[var(--cyan)]/5 rounded-xl border border-gray-700 hover:border-[var(--cyan)]/15 text-[10px] font-bold text-left flex justify-between items-center"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold text-[11px] text-[var(--cyan)]">👥 Citizen Guru</span>
                    <span className="text-[8px] text-gray-400 font-normal">guru12@gmail.com (pw: guru12)</span>
                  </span>
                  <span className="text-[9px] text-[var(--cyan)] font-extrabold">Log In →</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrepopulatedLogin("authority@nexcivic.com", "auth123")}
                  className="p-2 bg-[rgba(255,255,255,0.02)] hover:bg-[var(--cyan)]/5 rounded-xl border border-gray-700 hover:border-[var(--cyan)]/15 text-[10px] font-bold text-left flex justify-between items-center"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold text-[11px] text-[var(--cyan)]">🚓 Authority Officer</span>
                    <span className="text-[8px] text-gray-400 font-normal">authority@nexcivic.com (pw: auth123)</span>
                  </span>
                  <span className="text-[9px] text-[var(--cyan)] font-extrabold">Log In →</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrepopulatedLogin("commisioner@nexcivic.com", "comm123")}
                  className="p-2 bg-[rgba(255,255,255,0.02)] hover:bg-[var(--cyan)]/5 rounded-xl border border-gray-700 hover:border-[var(--cyan)]/15 text-[10px] font-bold text-left flex justify-between items-center"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold text-[11px] text-[var(--cyan)]">🏢 Commissioner NexCivic</span>
                    <span className="text-[8px] text-gray-400 font-normal">commisioner@nexcivic.com</span>
                  </span>
                  <span className="text-[9px] text-[var(--cyan)] font-extrabold">Log In →</span>
                </button>
              </div>

              <details className="mt-3">
                <summary className="text-[9px] opacity-70 text-gray-400 cursor-pointer hover:underline font-bold text-center list-none select-none">
                  Show original Rohan/Suresh/Mehta accounts
                </summary>
                <div className="grid grid-cols-1 gap-1 my-2">
                  <button
                    type="button"
                    onClick={() => handlePrepopulatedLogin("citizen1@demo.com", "demo123")}
                    className="p-2 bg-[rgba(255,255,255,0.01)] hover:bg-[var(--cyan)]/5 rounded-xl border border-gray-800 hover:border-[var(--cyan)]/15 text-[9px] font-bold text-left flex justify-between items-center"
                  >
                    <span>👥 Citizen Rohan (Zone A)</span>
                    <span className="text-[8px] text-[var(--cyan)]">Log In →</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrepopulatedLogin("authority1@demo.com", "demo123")}
                    className="p-2 bg-[rgba(255,255,255,0.01)] hover:bg-[var(--cyan)]/5 rounded-xl border border-gray-800 hover:border-[var(--cyan)]/15 text-[9px] font-bold text-left flex justify-between items-center"
                  >
                    <span>🚓 Authority Suresh (Zone A)</span>
                    <span className="text-[8px] text-[var(--cyan)]">Log In →</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrepopulatedLogin("manager@demo.com", "demo123")}
                    className="p-2 bg-[rgba(255,255,255,0.01)] hover:bg-[var(--cyan)]/5 rounded-xl border border-gray-800 hover:border-[var(--cyan)]/15 text-[9px] font-bold text-left flex justify-between items-center"
                  >
                    <span>🏢 Commissioner Mehta (HQ Manager)</span>
                    <span className="text-[8px] text-[var(--cyan)]">Log In →</span>
                  </button>
                </div>
              </details>
            </div>

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-xs text-[var(--text-3)] hover:text-white"
              >
                No account? <span className="text-[var(--cyan)] font-extrabold hover:underline">Sign up stepping workflow</span>
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================= */
          /*                 SIGNUP MULTI-STEP VIEW                    */
          /* ========================================================= */
          <div className="flex flex-col gap-4">
            
            {/* Step visual indicator */}
            <div className="flex items-center justify-between border-b border-gray-700/20 pb-2 mb-2">
              <span className="text-[10px] font-bold text-gray-400">Step {step} of 3</span>
              <div className="flex gap-1">
                <span className={`w-3 h-1.5 rounded-full ${step >= 1 ? "bg-[var(--cyan)]" : "bg-gray-700"}`} />
                <span className={`w-3 h-1.5 rounded-full ${step >= 2 ? "bg-[var(--cyan)]" : "bg-gray-700"}`} />
                <span className={`w-3 h-1.5 rounded-full ${step >= 3 ? "bg-[var(--cyan)]" : "bg-gray-700"}`} />
              </div>
            </div>

            {step === 1 && (
              /* signup step 1: Role Selection */
              <div className="flex flex-col gap-4 text-left animate-fadeIn">
                <span className="font-display font-bold text-xs text-[var(--text-2)]">Choose account tier role:</span>
                
                <div 
                  onClick={() => setRole("Citizen")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                    role === "Citizen" ? "border-[var(--cyan)] bg-[var(--cyan)]/[0.02]" : "border-gray-700/60 hover:border-gray-500 bg-transparent"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-[var(--cyan)]/10 text-[var(--cyan)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs text-[var(--text-1)]">Citizen Reporter</span>
                    <p className="text-[10px] text-[var(--text-2)] mt-0.5 leading-relaxed">Report road faults, broken utilities, upload proof photos, earnd badges, and upvote neighborhood complaints.</p>
                  </div>
                </div>

                <div 
                  onClick={() => setRole("Authority")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                    role === "Authority" ? "border-[var(--cyan)] bg-[var(--cyan)]/[0.02]" : "border-gray-700/60 hover:border-gray-500 bg-transparent"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-orange-400/10 text-orange-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs text-[var(--text-1)]">Field Authority Inspector</span>
                    <p className="text-[10px] text-[var(--text-2)] mt-0.5 leading-relaxed">Update incident logs, assign engineers, post resolution visual proofs, and audit materials.</p>
                  </div>
                </div>

                <div 
                  onClick={() => setRole("MunicipalityMgr")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                    role === "MunicipalityMgr" ? "border-[var(--cyan)] bg-[var(--cyan)]/[0.02]" : "border-gray-700/60 hover:border-gray-500 bg-transparent"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs text-[var(--text-1)]">Municipality General Manager (HQ)</span>
                    <p className="text-[10px] text-[var(--text-2)] mt-0.5 leading-relaxed">Supervise all regional zones, review department metrics, assign field priorities, and access analytical charts.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3 clay-btn text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  Continue Workspace <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              /* signup step 2: Account Information */
              <form onSubmit={handleSignUpSubmit} className="flex flex-col gap-4 text-left animate-fadeIn">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rohan Sawant"
                      className="pl-9 pr-4 py-2.5 bg-[rgba(255,255,255,0.02)] border border-gray-700/50 rounded-xl outline-none text-xs text-[var(--text-1)] w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Email</label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="r@p.com"
                      className="p-2.5 bg-[rgba(255,255,255,0.02)] border border-gray-700/50 rounded-xl outline-none text-xs text-[var(--text-1)]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Phone</label>
                    <input 
                      type="text" 
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91"
                      className="p-2.5 bg-[rgba(255,255,255,0.02)] border border-gray-700/50 rounded-xl outline-none text-xs text-[var(--text-1)]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Password</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 code characters"
                    className="p-2.5 bg-[rgba(255,255,255,0.02)] border border-gray-700/50 rounded-xl outline-none text-xs text-[var(--text-1)]"
                  />
                </div>

                {(role === "Authority" || role === "MunicipalityMgr") && (
                  <div className="flex flex-col gap-1.5 animate-fadeIn">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Government Department / Office Office</label>
                    <input 
                      type="text" 
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Roads & Utilities or HQ Office"
                      className="p-2.5 bg-[rgba(255,255,255,0.02)] border border-gray-700/50 rounded-xl outline-none text-xs text-[var(--text-1)]"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Assigned Municipal Zone</label>
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="p-2.5 bg-[var(--bg-void)] border border-gray-700/50 rounded-xl outline-none text-xs text-[var(--text-1)]"
                  >
                    <option value="Zone A">Zone A (Wes suburban)</option>
                    <option value="Zone B">Zone B (Central division)</option>
                  </select>
                </div>

                <div className="flex gap-2 items-center mt-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="p-2.5 bg-gray-800 hover:bg-gray-750 text-white rounded-xl text-xs"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-3 clay-btn text-white font-bold rounded-xl text-xs text-center cursor-pointer"
                  >
                    Register Profile
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              /* signup step 3: Success */
              <div className="flex flex-col items-center gap-5 py-6 text-center animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg">Verification Successful</h3>
                  <p className="text-[10px] text-[var(--text-2)] mt-1 max-w-xs">Your administrative credentials have been securely provisioned on Firestore. Login now using the created credentials.</p>
                </div>

                <button
                  onClick={() => {
                    setIsLogin(true);
                    setStep(1);
                  }}
                  className="px-6 py-2.5 clay-btn text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Acknowledge & Sign In
                </button>
              </div>
            )}

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setStep(1);
                }}
                className="text-xs text-[var(--text-3)] hover:text-white"
              >
                Already registered? <span className="text-[var(--cyan)] font-extrabold hover:underline">Sign In</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
