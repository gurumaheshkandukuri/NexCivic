import React, { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { authService } from "../services/authService";
import { getAuthErrorMessage } from "../ErrorHandler";
import { UserProfile } from "../types";
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
  globalError?: string;
}

import { states, locationData } from "../constants/locations";
import { ROLES, RoleType } from "../constants/roles";
import { createUserProfile } from "../services/userService";

export default function AuthPage({ onSuccess, theme = "dark", globalError }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Login form field state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup Multi-step state
  const [step, setStep] = useState(2); // Skip step 1 entirely
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState(states[0]);
  const [district, setDistrict] = useState("");
  const [ulb, setUlb] = useState("");

  const [districts, setDistricts] = useState<string[]>(Object.keys(locationData[states[0] as keyof typeof locationData]));
  const [ulbsList, setUlbsList] = useState<string[]>([]);

  useEffect(() => {
    const districtList = Object.keys(locationData[state as keyof typeof locationData]);
    setDistricts(districtList);
    setDistrict("");
    setUlb("");
  }, [state]);

  useEffect(() => {
    if (district) {
      const ulbList = locationData[state as keyof typeof locationData][district] || [];
      setUlbsList(ulbList);
    } else {
      setUlbsList([]);
    }
    setUlb("");
  }, [district, state]);

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



  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    handleAuthAction(() => authService.login(loginEmail, loginPassword));
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuthAction(async () => {
      const userCredential = await authService.signup(email, password);
      const uid = userCredential.user.uid;
      try {
        await createUserProfile(uid, {
          name: fullName,
          email,
          role: ROLES.CITIZEN,
          phone,
          assignedState: null,
          assignedDistrict: null,
          assignedULBs: [],
          xp: 0,
        });
        setStep(3);
      } catch (error) {
        // If Firestore profile creation fails, delete the Auth user to prevent orphaned accounts
        await userCredential.user.delete();
        throw new Error("Failed to create user profile. Please try again.");
      }
    });
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

        {globalError && !error && (
          <div className="p-3 bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-xl text-xs text-[var(--red)] text-center font-medium animate-pulse">
            ⚠️ {globalError}
          </div>
        )}
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
              <></>
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500">State</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="p-2.5 bg-[var(--bg-void)] border border-gray-700/50 rounded-xl outline-none text-xs text-[var(--text-1)]"
                    >
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500">District</label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="p-2.5 bg-[var(--bg-void)] border border-gray-700/50 rounded-xl outline-none text-xs text-[var(--text-1)]"
                    >
                      <option value="">Select District</option>
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-500">ULB</label>
                  <select
                    value={ulb}
                    onChange={(e) => setUlb(e.target.value)}
                    className="p-2.5 bg-[var(--bg-void)] border border-gray-700/50 rounded-xl outline-none text-xs text-[var(--text-1)]"
                  >
                    <option value="">Select ULB</option>
                    {ulbsList.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div className="flex gap-2 items-center mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                    }}
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
                    setStep(2);
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
                  setStep(2);
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
