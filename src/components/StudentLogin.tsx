import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ShieldCheck, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
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
  const [email, setEmail] = useState('');
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

  // Check if current typed passcode matches a known candidate to display subtle preview
  const normalized = passcode.trim().toUpperCase();
  const matchedPreview = PREDEFINED_PASSCODES[normalized];

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
    const cleanPasscode = passcode.trim();
    const cleanEmail = email.trim();

    if (!cleanPasscode) {
      setErrorMessage('Please enter your Candidate Assessment Passcode.');
      return;
    }
    if (!cleanEmail) {
      setErrorMessage('Please enter your team\'s Registered Email Address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await verifyStudentByPasscode(cleanPasscode, cleanEmail, sessionId);

      if (result.success && result.student) {
        onLoginSuccess(result.student);
      } else {
        setErrorMessage(
          result.message ||
            'Invalid Credentials. Please ensure both your Passcode and Registered Email are correct.'
        );
      }
    } catch (err) {
      setErrorMessage('A network error occurred. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-2.5 sm:px-4 my-auto">
      <div className="surface-card rounded-xl sm:rounded-2xl p-4 sm:p-8 relative">
        {/* Header with Official Glowing Logo */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-3">
            <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-blue-600/40 via-cyan-500/30 to-purple-600/40 blur-md opacity-80 animate-pulse" />
            <img
              src="/sparktron_logo.png"
              alt="SPARKTRON 2026 Logo"
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-2xl border border-blue-400/40 mx-auto"
            />
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

        {/* Two-Factor Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Candidate Assessment Passcode */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Assessment Passcode
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
                placeholder="Enter your Passcode"
                className="w-full minimal-input rounded-xl pl-9 pr-3.5 py-2.5 text-sm tracking-wider font-mono focus:outline-none uppercase"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              * Enter your official candidate assessment passcode
            </p>
          </div>

          {/* Availability Badge (Privacy Protected: Only displays Name/Team, no emails or secret codes) */}
          {matchedPreview && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>
                  Available: <strong className="text-white font-medium">{matchedPreview.teamName || matchedPreview.fullName}</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 size={11} /> Verified
              </span>
            </motion.div>
          )}

          {/* Field 2: Registered Team Member Email */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Registered Team Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter your registered email"
                className="w-full minimal-input rounded-xl pl-9 pr-3.5 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              * Enter the registered email ID of either team member
            </p>
          </div>

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
