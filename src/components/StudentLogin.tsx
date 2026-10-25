import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck, AlertCircle, ArrowRight, Loader2, CheckCircle2, Users } from 'lucide-react';
import {
  verifyStudentByPasscode,
  PREDEFINED_PASSCODES,
  syncBroadcastChannel,
  getOrCreateArenaChannel,
} from '../lib/supabase';
import type { StudentProfile } from '../types/quiz';

interface StudentLoginProps {
  onLoginSuccess: (student: StudentProfile) => void;
}

export default function StudentLogin({ onLoginSuccess }: StudentLoginProps) {
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate / retrieve unique device session ID
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let s = sessionStorage.getItem('spark_session_token');
      if (!s) {
        s = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
        sessionStorage.setItem('spark_session_token', s);
      }
      return s;
    }
    return 'sess_default';
  });

  // Check if current typed passcode matches a known candidate to display preview
  const normalized = passcode.trim().toUpperCase();
  const normalizedLower = passcode.trim().toLowerCase();
  const matchedPreview =
    PREDEFINED_PASSCODES[normalized] ||
    Object.values(PREDEFINED_PASSCODES).find(
      (p) =>
        p.email.toLowerCase() === normalizedLower ||
        p.members?.some((m) => m.email.toLowerCase() === normalizedLower)
    );

  // Listen for admin reset events
  useEffect(() => {
    const handleReset = (studentEmail: string, resetPasscode?: string) => {
      const emailMatch =
        matchedPreview &&
        (matchedPreview.email.toLowerCase() === studentEmail.toLowerCase() ||
          matchedPreview.members?.some((m) => m.email.toLowerCase() === studentEmail.toLowerCase()));
      const codeMatch =
        resetPasscode &&
        (normalized === resetPasscode.toUpperCase() ||
          matchedPreview?.passcode.toUpperCase() === resetPasscode.toUpperCase());

      if (emailMatch || codeMatch) {
        setErrorMessage(null);
      }
    };

    if (syncBroadcastChannel) {
      const channel = syncBroadcastChannel;
      const handleBroadcast = (e: MessageEvent) => {
        if (e.data?.type === 'reset_student_session') {
          handleReset(e.data.payload?.studentEmail || '', e.data.payload?.passcode);
        }
      };
      channel.addEventListener('message', handleBroadcast);
      return () => channel.removeEventListener('message', handleBroadcast);
    }

    const ch = getOrCreateArenaChannel();
    ch.on('broadcast', { event: 'reset_student_session' }, ({ payload }) => {
      handleReset(payload?.studentEmail || '', payload?.passcode);
    });
  }, [matchedPreview, normalized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMessage('Please enter your candidate assessment passcode or registered email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await verifyStudentByPasscode(passcode, sessionId);

      if (result.success && result.student) {
        onLoginSuccess(result.student);
      } else {
        setErrorMessage(
          result.message ||
            'Invalid Passcode or Email. Only candidates registered for the SPARKTRON Technical Quiz can enter.'
        );
      }
    } catch (err) {
      setErrorMessage('A network error occurred. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
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
            SPARKTRON 2026 Technical Quiz • Controlled Team Examination
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
              Passcode or Registered Email
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
                placeholder="e.g. SPARK26002 or your registered email"
                className="w-full minimal-input rounded-xl pl-9 pr-3.5 py-2.5 text-sm tracking-wider font-mono focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              * Enter your official Pass Code (e.g. <span className="text-blue-400 font-mono">SPARK26002</span>) or registered email
            </p>
          </div>

          {/* Connected Email / Team Preview Badge (if matched) */}
          {matchedPreview && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {matchedPreview.teamName ? (
                    <Users size={15} className="text-blue-400 shrink-0" />
                  ) : (
                    <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-white">
                      {matchedPreview.teamName ? `Team: ${matchedPreview.teamName}` : matchedPreview.fullName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Passcode: {matchedPreview.passcode} • {matchedPreview.college}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Verified
                </span>
              </div>

              {matchedPreview.members && matchedPreview.members.length > 0 && (
                <div className="pt-1.5 border-t border-blue-500/20 flex flex-wrap gap-1 text-[11px] text-slate-400">
                  <span className="text-slate-500">Roster:</span>
                  {matchedPreview.members.map((m) => (
                    <span key={m.id || m.email} className="px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-200">
                      {m.isLeader ? `👑 ${m.fullName}` : m.fullName}
                    </span>
                  ))}
                </div>
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
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Enter Assessment Room</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
