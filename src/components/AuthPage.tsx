import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { auth } from "../firebase-init";
import { createUserProfile, getUserProfile } from "../dbService";
import { getAuthErrorMessage } from "../ErrorHandler";
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
  const [googleUserForSignup, setGoogleUserForSignup] = useState<FirebaseUser | null>(null);

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

  const handleAuthAction = async (action: () => Promise<any>) => {
    setLoading(true);
    setError("");
    try {
      await action();
      onSuccess();
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => handleAuthAction(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const profile = await getUserProfile(user.uid);
    if (profile) {
        onSuccess();
    } else {
        setGoogleUserForSignup(user);
        setFullName(user.displayName || "");
        setEmail(user.email || "");
        setPhone(user.phoneNumber || "");
        setIsLogin(false);
        setStep(1);
    }
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    handleAuthAction(() => setPersistence(auth, browserLocalPersistence).then(() => {
        return signInWithEmailAndPassword(auth, loginEmail, loginPassword)
    }));
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (googleUserForSignup) {
        handleAuthAction(async () => {
            await createUserProfile(googleUserForSignup.uid, {
                name: fullName,
                email: googleUserForSignup.email,
                role,
                phone,
                department: role !== "Citizen" ? department : "",
                zone,
                points: role === "Citizen" ? 20 : 0,
                avatar: googleUserForSignup.photoURL
            });
            setStep(3);
        });
    } else {
        handleAuthAction(async () => {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const uid = userCredential.user.uid;
          await createUserProfile(uid, {
            name: fullName,
            email,
            role,
            phone,
            department: role !== "Citizen" ? department : "",
            zone,
            points: role === "Citizen" ? 20 : 0,
          });
          setStep(3);
        });
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 text-left">
      
      <div className="glass rounded-3xl p-6 md:p-8 border border-slate-200/50 dark:border-white/10 relative overflow-hidden shadow-2xl flex flex-col gap-6 bg-white/40 dark:bg-slate-900/65">
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--cyan)]/5 rounded-full filter blur-2xl -z-10" />

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
              {loading ? (
                <span className="flex items-center justify-center">
                  <Flame className="w-4 h-4 animate-spin mr-2" />
                  Authenticating...
                </span>
              ) : (
                "Sign In Account"
              )}
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
              {loading ? (
                <span className="flex items-center justify-center">
                  <Flame className="w-4 h-4 animate-spin mr-2" />
                  Connecting...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.29 1.45 15.52 0 12.24 0c-6.63 0-12 5.37-12 12s5.37 12 12 12c6.93 0 11.53-4.87 11.53-11.74 0-.79-.08-1.4-.19-1.975H12.24z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </>
              )}
            </button>
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
          <div className="flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-gray-700/20 pb-2 mb-2">
              <span className="text-[10px] font-bold text-gray-400">Step {step} of 3</span>
              <div className="flex gap-1">
                <span className={`w-3 h-1.5 rounded-full ${step >= 1 ? "bg-[var(--cyan)]" : "bg-gray-700"}`} />
                <span className={`w-3 h-1.5 rounded-full ${step >= 2 ? "bg-[var(--cyan)]" : "bg-gray-700"}`} />
                <span className={`w-3 h-1.5 rounded-full ${step >= 3 ? "bg-[var(--cyan)]" : "bg-gray-700"}`} />
              </div>
            </div>

            {step === 1 && (
              <div className="flex flex-col gap-4 text-left animate-fadeIn">
                <span className="font-display font-bold text-xs text-[var(--text-2)]">Choose account tier role:</span>
                
                <div 
                  onClick={() => setRole("Citizen")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${role === "Citizen" ? "border-[var(--cyan)] bg-[var(--cyan)]/[0.02]" : "border-gray-700/60 hover:border-gray-500 bg-transparent"}`}>
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
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${role === "Authority" ? "border-[var(--cyan)] bg-[var(--cyan)]/[0.02]" : "border-gray-700/60 hover:border-gray-500 bg-transparent"}`}>
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
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${role === "MunicipalityMgr" ? "border-[var(--cyan)] bg-[var(--cyan)]/[0.02]" : "border-gray-700/60 hover:border-gray-500 bg-transparent"}`}>
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
                {!googleUserForSignup &&
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
                }
                 {googleUserForSignup &&
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-500">Email</label>
                            <input 
                            type="email" 
                            disabled
                            value={email}
                            className="p-2.5 bg-[rgba(255,255,255,0.02)] border border-gray-700/50 rounded-xl outline-none text-xs text-gray-400"
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
                 }

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
                    disabled={loading}
                    className="flex-grow py-3 clay-btn text-white font-bold rounded-xl text-xs text-center cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <Flame className="w-4 h-4 animate-spin mr-2" />
                        Provisioning Profile...
                      </span>
                    ) : (
                      "Register Profile"
                    )}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
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
                  setGoogleUserForSignup(null);
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
