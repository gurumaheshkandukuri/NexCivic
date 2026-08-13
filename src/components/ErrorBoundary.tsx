import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { logAuditEvent } from "../services/auditLogService";
import Logo from "./Logo";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorName: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public declare props: Props;
  public state: State = {
    hasError: false,
    errorName: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorName: error.name || "Runtime Exception"
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught runtime exception:", error, errorInfo);
    
    // Log to Audit Trail without exposing raw stack trace to UI
    logAuditEvent({
      userUID: "system_client",
      role: "SYSTEM",
      action: "CLIENT_RUNTIME_ERROR",
      severity: "HIGH",
      metadata: {
        errorName: error.name,
        errorMessage: error.message?.substring(0, 200),
        componentStack: errorInfo.componentStack?.substring(0, 300)
      }
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#06080e] flex items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-md w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-8 shadow-2xl text-center glass relative overflow-hidden">
            
            {/* Glow effect */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertOctagon className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <Logo size="sm" />
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                Security Sandbox Shield
              </span>
            </div>

            <h2 className="font-display font-extrabold text-2xl text-slate-100 tracking-tight">
              Application Recovered Gracefully
            </h2>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              NexCivic's security sandbox detected an unexpected client runtime state. Your telemetry data remains completely safe.
            </p>

            <div className="my-6 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Reference: {this.state.errorName}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 touch-target cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" /> Reload Workspace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
