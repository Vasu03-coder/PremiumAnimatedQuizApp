import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck, AlertCircle, ArrowRight, Loader2, Sparkles, User, CheckCircle2 } from 'lucide-react';
import { verifyStudentByPasscode, PREDEFINED_PASSCODES } from '../lib/supabase';
import type { StudentProfile } from '../types/quiz';

interface StudentLoginProps {
  onLoginSuccess: (student: StudentProfile) => void;
}

export default function StudentLogin({ onLoginSuccess }: StudentLoginProps) {
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if current typed passcode matches a known candidate to display preview
  const normalized = passcode.trim().toUpperCase();
  const matchedPreview = PREDEFINED_PASSCODES[normalized];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMessage('Please enter your candidate assessment passcode.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await verifyStudentByPasscode(passcode);

      if (result.success && result.student) {
        onLoginSuccess(result.student);
      } else {
        setErrorMessage(
          result.message ||
            'Invalid Passcode. Only candidates registered for the SPARKTRON Technical Quiz can enter.'
        );
      }
    } catch (err) {
      setErrorMessage('A network error occurred. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick test filler for Demo User (Bypasses Start Timer)
  const handleUseDemoPasscode = () => {
    setPasscode('DEMO2026');
    setErrorMessage(null);
  };

  // Quick test filler for Official Candidate (Subject to Start Timer)
  const handleUseOfficialPasscode = () => {
    setPasscode('SPARK-ECE-101');
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md mx-auto px-2.5 sm:px-4">
      <div className="surface-card rounded-xl sm:rounded-2xl p-4 sm:p-8 relative">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mb-1.5">
            Student Assessment Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-normal max-w-xs mx-auto leading-relaxed">
            SPARKTRON 2026 Technical Quiz • Passcode Protected Examination
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-200 text-xs sm:text-sm">
            <AlertCircle size={17} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold text-red-300">Access Denied: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Form - Candidate Passcode */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Candidate Assessment Passcode
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <KeyRound size={16} />
              </div>
              <input
                type="text"
                required
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. SPARK-ECE-101 or DEMO2026"
                className="w-full minimal-input rounded-xl pl-9 pr-3.5 py-2.5 text-sm uppercase tracking-wider font-mono focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              * Enter the unique passcode provided with your registration
            </p>
          </div>

          {/* Connected Email Preview Badge (if matched) */}
          {matchedPreview && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between text-slate-300"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">{matchedPreview.fullName}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{matchedPreview.email}</div>
                </div>
              </div>
              {matchedPreview.isDemo ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Timer Bypassed
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Connected
                </span>
              )}
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Verifying Passcode...</span>
              </>
            ) : (
              <>
                <span>Enter Assessment Room</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Testing Passcode Fillers */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-2 text-xs">
          <div className="text-[11px] text-slate-400 font-medium text-center mb-1">
            Test Passcode Fillers:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Demo Tester button (Bypasses Timer) */}
            <button
              type="button"
              onClick={handleUseDemoPasscode}
              className="text-left p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <Sparkles size={12} className="text-emerald-400" />
                <span>DEMO2026 (Demo Tester)</span>
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">
                ★ Bypasses start timer (Instant quiz)
              </div>
            </button>

            {/* Official Candidate button (Subject to Timer) */}
            <button
              type="button"
              onClick={handleUseOfficialPasscode}
              className="text-left p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-300 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <User size={12} className="text-blue-400" />
                <span>SPARK-ECE-101 (Candidate)</span>
              </div>
              <div className="text-[10px] text-blue-400/80 mt-0.5">
                Connected to: sunkar@gmail.com
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
