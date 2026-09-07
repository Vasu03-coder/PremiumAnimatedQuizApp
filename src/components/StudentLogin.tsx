import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, User, AlertCircle, ArrowRight, Loader2, Sparkles, Lock } from 'lucide-react';
import { verifyStudentRegistration } from '../lib/supabase';
import type { StudentProfile } from '../types/quiz';

interface StudentLoginProps {
  onLoginSuccess: (student: StudentProfile) => void;
}

export default function StudentLogin({ onLoginSuccess }: StudentLoginProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMessage('Please provide both your full name and registered email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await verifyStudentRegistration(email, name);

      if (result.success && result.student) {
        onLoginSuccess(result.student);
      } else {
        setErrorMessage(
          result.message ||
            'Registration not verified. Only candidates who registered and selected Technical Quiz on the symposium website can enter.'
        );
      }
    } catch (err) {
      setErrorMessage('A network error occurred. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick test filler for the user/evaluator
  const handleUseSampleAccount = () => {
    setName('sankar');
    setEmail('sunkar@gmail.com');
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-0">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="glass-panel-dark rounded-2xl p-6 sm:p-10 relative overflow-hidden"
      >
        {/* Subtle top cyan light line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-electric-cyan to-transparent opacity-70" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan mb-4 shadow-[0_0_20px_rgba(56,225,255,0.15)]">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-bright-white mb-2">
            Student Assessment Portal
          </h2>
          <p className="text-sm text-muted-text font-normal max-w-sm mx-auto">
            SPARKTRON 2026 Technical Quiz • Controlled Examination Session
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-200 text-sm"
          >
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold text-red-300">Access Denied: </span>
              {errorMessage}
            </div>
          </motion.div>
        )}

        {/* Form - Only Name & Email as required */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono font-medium text-electric-cyan uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-text">
                <User size={18} />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sankar Raja"
                className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-electric-cyan uppercase tracking-wider mb-2">
              Registered Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-text">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. candidate@domain.com"
                className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-subtle-text mt-1.5 font-mono">
              * Must match your symposium registration email
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl font-medium text-sm text-midnight-950 bg-gradient-to-r from-electric-blue to-electric-cyan hover:from-electric-cyan hover:to-electric-blue shadow-[0_0_20px_rgba(56,225,255,0.3)] hover:shadow-[0_0_28px_rgba(56,225,255,0.45)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-sans"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin text-midnight-950" />
                <span>Verifying Database Records...</span>
              </>
            ) : (
              <>
                <span>Enter Examination Room</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Helpful verified test account link */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center text-xs">
          <button
            type="button"
            onClick={handleUseSampleAccount}
            className="text-subtle-text hover:text-electric-cyan transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Load Registered Test Account</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
