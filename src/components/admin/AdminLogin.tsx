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
    <div className="w-full max-w-md mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel-dark rounded-2xl p-6 sm:p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-electric-purple to-transparent" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-electric-purple/10 border border-electric-purple/30 text-electric-purple mb-4 shadow-[0_0_25px_rgba(112,88,255,0.25)]">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-bright-white mb-1.5">
            Admin Mission Control
          </h2>
          <p className="text-xs text-muted-text font-mono">
            Authorized Personnel Only • Secure Gateway
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center font-medium"
          >
            Invalid Master Key. Access rejected.
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono font-medium text-electric-cyan uppercase tracking-wider mb-2">
              Master Access Password
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
                placeholder="Enter admin password..."
                className="w-full glass-input rounded-xl px-4 py-3 text-sm pr-11 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-text hover:text-bright-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-subtle-text font-mono">
              <span>Default: admin@spark2026</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl font-medium text-sm text-midnight-950 bg-gradient-to-r from-electric-purple via-electric-cyan to-electric-blue hover:opacity-95 shadow-[0_0_20px_rgba(112,88,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
          >
            <span>Unlock Dashboard</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-subtle-text hover:text-bright-white transition-colors flex items-center justify-center gap-1.5 mx-auto font-mono"
          >
            <ArrowLeft size={13} />
            <span>Back to Student Portal</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
