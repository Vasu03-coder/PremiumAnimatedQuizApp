import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck, Home, Calendar, Clock, Award } from 'lucide-react';
import type { StudentProfile } from '../types/quiz';

interface ResultViewProps {
  student: StudentProfile;
  totalQuestions: number;
  violationsCount: number;
  onHome: () => void;
}

export default function ResultView({
  student,
  totalQuestions,
  violationsCount,
  onHome,
}: ResultViewProps) {
  const submissionTimestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6">
      <div className="surface-card rounded-2xl p-6 sm:p-8 text-center relative">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4">
          <CheckCircle2 size={30} />
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-1.5">
          Assessment Completed
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-6 font-normal leading-relaxed">
          Your responses have been recorded and synced to the symposium evaluation server.
        </p>

        {/* Verification Summary Card */}
        <div className="bg-slate-900/60 border border-white/[0.08] rounded-xl p-4 sm:p-5 mb-6 text-left space-y-2.5">
          <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
            <span className="text-slate-400">Candidate Name</span>
            <span className="font-semibold text-white">{student.full_name}</span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
            <span className="text-slate-400">Registered Email</span>
            <span className="font-mono text-xs text-slate-200">{student.email}</span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
            <span className="text-slate-400">College / Institute</span>
            <span className="text-slate-200 text-xs sm:text-sm">{student.college || 'Engineering College'}</span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
            <span className="text-slate-400">Registration Code</span>
            <span className="font-mono text-xs text-blue-400">
              {student.registration_code || 'SPARK-2026'}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
            <span className="text-slate-400">Questions Attempted</span>
            <span className="font-medium text-xs sm:text-sm text-white">
              {totalQuestions} of {totalQuestions}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
            <span className="text-slate-400">Proctoring Integrity</span>
            <span
              className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                violationsCount > 0
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {violationsCount > 0 ? `${violationsCount} Flag(s) Recorded` : 'Verified (Clean)'}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs pt-1">
            <span className="text-slate-500">Submission Timestamp</span>
            <span className="font-mono text-slate-400">{submissionTimestamp}</span>
          </div>
        </div>

        {/* Return Button */}
        <button
          type="button"
          onClick={onHome}
          className="w-full py-2.5 px-5 rounded-xl font-medium text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home size={16} />
          <span>Return to Portal Home</span>
        </button>
      </div>
    </div>
  );
}
