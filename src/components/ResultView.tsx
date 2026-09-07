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
    <div className="w-full max-w-xl mx-auto px-4 sm:px-0 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-panel-dark rounded-2xl p-6 sm:p-10 text-center relative overflow-hidden"
      >
        {/* Top green accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80" />

        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <CheckCircle2 size={36} />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-bright-white mb-2">
          Assessment Completed
        </h2>
        <p className="text-sm text-muted-text max-w-md mx-auto mb-8 font-normal">
          Your test responses have been encrypted and submitted to the evaluation server.
          Official standings will be revealed on the Symposium Leaderboard.
        </p>

        {/* Verification Summary Card */}
        <div className="glass-card-dark rounded-xl p-5 mb-8 text-left space-y-3 font-sans">
          <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
            <span className="text-muted-text">Candidate Name:</span>
            <span className="font-semibold text-bright-white">{student.full_name}</span>
          </div>

          <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
            <span className="text-muted-text">Registered Email:</span>
            <span className="font-mono text-xs text-electric-cyan">{student.email}</span>
          </div>

          <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
            <span className="text-muted-text">Institution / College:</span>
            <span className="text-bright-white text-xs">{student.college || 'Engineering College'}</span>
          </div>

          <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
            <span className="text-muted-text">Registration Reference:</span>
            <span className="font-mono text-xs text-electric-cyan">
              {student.registration_code || 'SPARK-2026'}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
            <span className="text-muted-text">Questions Attempted:</span>
            <span className="font-mono text-sm font-bold text-bright-white">
              {totalQuestions} / {totalQuestions}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
            <span className="text-muted-text">Proctoring Integrity:</span>
            <span
              className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                violationsCount > 0
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {violationsCount > 0 ? `${violationsCount} Flag(s) Recorded` : '100% Verified'}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm pt-1">
            <span className="text-muted-text">Submitted At:</span>
            <span className="text-xs font-mono text-subtle-text">{submissionTimestamp}</span>
          </div>
        </div>

        {/* Return Button */}
        <button
          type="button"
          onClick={onHome}
          className="w-full py-3.5 px-6 rounded-xl font-medium text-sm text-bright-white glass-card-dark hover:border-electric-cyan hover:bg-white/[0.08] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home size={18} />
          <span>Return to Homepage</span>
        </button>
      </motion.div>
    </div>
  );
}
