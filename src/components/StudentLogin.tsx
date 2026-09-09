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
    <div className="w-full max-w-md mx-auto px-4">
      <div className="surface-card rounded-2xl p-6 sm:p-8 relative">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mb-1.5">
            Student Assessment Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-normal max-w-xs mx-auto leading-relaxed">
            SPARKTRON 2026 Technical Quiz • Controlled Examination
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

        {/* Form - Only Name & Email */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sankar Raja"
                className="w-full minimal-input rounded-xl pl-9 pr-3.5 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. candidate@domain.com"
                className="w-full minimal-input rounded-xl pl-9 pr-3.5 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              * Must match your symposium registered email
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
                <span>Verifying Registration...</span>
              </>
            ) : (
              <>
                <span>Enter Assessment Room</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Helpful sample account filler */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-center text-xs">
          <button
            type="button"
            onClick={handleUseSampleAccount}
            className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={13} className="text-blue-400" />
            <span>Load sample candidate (sankar)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
