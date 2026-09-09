import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// Master Admin Passwords
const VALID_PASSWORDS = ['admin@spark2026', 'admin2026', 'spark2026'];

export default function AdminLogin({ onSuccess, onCancel }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (VALID_PASSWORDS.includes(password.trim())) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto px-4 py-12">
      <div className="surface-card rounded-2xl p-6 sm:p-8 relative">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300 mb-3">
            <Lock size={22} />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white mb-1">
            Admin Access
          </h2>
          <p className="text-xs text-slate-400">
            Authorized Personnel Only
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-center font-medium">
            Invalid Password. Access denied.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Enter password..."
                className="w-full minimal-input rounded-xl px-3.5 py-2.5 text-sm pr-10 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 font-mono">
              <span>Key: admin@spark2026</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Unlock Dashboard</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-white/[0.08] text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto"
          >
            <ArrowLeft size={13} />
            <span>Back to Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
