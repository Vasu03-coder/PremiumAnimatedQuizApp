import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Trophy,
  ShieldAlert,
  HelpCircle,
  Download,
  Plus,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Radio,
  Trash2,
  Sun,
  Moon,
  Clock,
  UserCheck,
  UserX,
  Sparkles
} from 'lucide-react';
import type { Question, LiveStudentStatus, ProctoringViolation, QuizSubmission } from '../../types/quiz';
import { supabase, subscribeToQuizArena, getTechnicalQuizParticipants } from '../../lib/supabase';

interface AdminDashboardProps {
  questions: Question[];
  onUpdateQuestions: (newQuestions: Question[]) => void;
  onLogout: () => void;
}

export default function AdminDashboard({
  questions,
  onUpdateQuestions,
  onLogout,
}: AdminDashboardProps) {
  // Theme state: default is 'light' (white theme) as requested
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('spark_admin_theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'proctoring' | 'questions'>('leaderboard');
  const [students, setStudents] = useState<Record<string, LiveStudentStatus>>({});
  const [violations, setViolations] = useState<ProctoringViolation[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // New Question Form State
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectAnswer, setNewCorrectAnswer] = useState(0);
  const [newCategory, setNewCategory] = useState('ECE Core');

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('spark_admin_theme', nextTheme);
  };

  // Load ONLY Technical Quiz registered participants on mount
  useEffect(() => {
    async function loadQuizParticipants() {
      try {
        const quizParticipants = await getTechnicalQuizParticipants();

        const initialMap: Record<string, LiveStudentStatus> = {};
        quizParticipants.forEach((p, idx) => {
          const rawEmail = p.email || `participant_${p.id || idx}@symposium.local`;
          const key = rawEmail.toLowerCase();
          initialMap[key] = {
            studentId: p.id || String(idx),
            name: p.full_name || 'Participant',
            email: rawEmail,
            college: p.college || 'Engineering College',
            currentQuestion: 0,
            totalQuestions: questions.length,
            score: 0,
            violationsCount: 0,
            status: 'offline', // Default is offline until they actually login!
            lastSeen: p.created_at || new Date().toISOString(),
          };
        });

        // Check if any verified completed submissions exist in localStorage
        try {
          const savedSubmissions: QuizSubmission[] = JSON.parse(
            localStorage.getItem('spark_quiz_submissions') || '[]'
          );
          if (Array.isArray(savedSubmissions)) {
            savedSubmissions.forEach((sub) => {
              if (!sub || !sub.participant_email) return;
              const key = sub.participant_email.toLowerCase();
              // Only apply if the candidate was actually registered for Technical Quiz
              if (initialMap[key]) {
                initialMap[key] = {
                  ...initialMap[key],
                  score: sub.score || 0,
                  currentQuestion: sub.total_questions || questions.length,
                  violationsCount: sub.violations_count || 0,
                  status: 'completed',
                  lastSeen: sub.completed_at || new Date().toISOString(),
                  completedAt: sub.completed_at,
                };
              }
            });
          }
        } catch (e) {
          console.error('Error reading saved submissions:', e);
        }

        setStudents(initialMap);
      } catch (err) {
        console.error('Error fetching quiz participants:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadQuizParticipants();
  }, [questions.length]);

  // Supabase Realtime Listener (Safe subscription without duplicate joins)
  useEffect(() => {
    const unsubscribe = subscribeToQuizArena({
      onStudentJoined: (payload) => {
        if (!payload || !payload.email) return;
        const key = payload.email.toLowerCase();
        setStudents((prev) => {
          // If this student is in the eligible list, mark them active
          const existing = prev[key] || {
            studentId: payload.studentId || key,
            name: payload.name || 'Candidate',
            email: payload.email,
            college: payload.college || 'Engineering College',
            totalQuestions: payload.totalQuestions || questions.length,
            score: 0,
            violationsCount: 0,
          };
          return {
            ...prev,
            [key]: {
              ...existing,
              ...payload,
              status: 'active',
              lastSeen: new Date().toISOString(),
            },
          };
        });
      },
      onScoreUpdate: (payload) => {
        if (!payload || !payload.email) return;
        const key = payload.email.toLowerCase();
        setStudents((prev) => {
          if (!prev[key]) return prev;
          return {
            ...prev,
            [key]: {
              ...prev[key],
              score: payload.score ?? prev[key].score,
              currentQuestion: payload.currentQuestion ?? prev[key].currentQuestion,
              violationsCount: payload.violationsCount ?? prev[key].violationsCount,
              status: 'active',
              lastSeen: new Date().toISOString(),
            },
          };
        });
      },
      onProctoringAlert: (payload) => {
        if (!payload) return;
        setViolations((prev) => [payload as ProctoringViolation, ...prev]);
        if (payload.studentEmail) {
          const key = payload.studentEmail.toLowerCase();
          setStudents((prev) => {
            if (!prev[key]) return prev;
            return {
              ...prev,
              [key]: {
                ...prev[key],
                violationsCount: (prev[key].violationsCount || 0) + 1,
                status: 'flagged',
              },
            };
          });
        }
      },
      onQuizCompleted: (payload) => {
        if (!payload || !payload.participant_email) return;
        const key = payload.participant_email.toLowerCase();
        setStudents((prev) => {
          if (!prev[key]) return prev;
          return {
            ...prev,
            [key]: {
              ...prev[key],
              score: payload.score ?? prev[key].score,
              currentQuestion: payload.total_questions || questions.length,
              violationsCount: payload.violations_count ?? prev[key].violationsCount,
              status: 'completed',
              completedAt: payload.completed_at || new Date().toISOString(),
            },
          };
        });
      },
      onStatusChange: (status) => {
        setIsConnected(status);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [questions.length]);

  // Convert map to sorted leaderboard array (Rank 1, 2, 3...)
  const leaderboardList = Object.values(students).sort((a, b) => {
    // 1. Completed or Active first
    const statusOrder: Record<string, number> = { active: 1, completed: 2, flagged: 3, offline: 4 };
    const aOrder = statusOrder[a.status] || 5;
    const bOrder = statusOrder[b.status] || 5;

    // 2. Highest score first if taken
    if (b.score !== a.score) return b.score - a.score;
    // 3. Status
    if (aOrder !== bOrder) return aOrder - bOrder;
    // 4. Name alphabetical
    return a.name.localeCompare(b.name);
  });

  // Calculate strict counts
  const totalEligible = leaderboardList.length;
  const activeCount = Object.values(students).filter((s) => s.status === 'active').length;
  const completedCount = Object.values(students).filter((s) => s.status === 'completed').length;
  const offlineCount = Object.values(students).filter((s) => s.status === 'offline').length;

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Rank', 'Name', 'Email', 'College', 'Score', 'Total Questions', 'Violations', 'Status'];
    const rows = leaderboardList.map((s, idx) => [
      idx + 1,
      `"${s.name}"`,
      s.email,
      `"${s.college}"`,
      s.score,
      s.totalQuestions,
      s.violationsCount,
      s.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Technical_Quiz_Standings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Question Handler
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const createdQ: Question = {
      id: Date.now(),
      question: newQuestionText,
      options: [...newOptions],
      correctAnswer: newCorrectAnswer,
      category: newCategory,
      points: 1,
    };

    onUpdateQuestions([...questions, createdQ]);
    setIsAddingQuestion(false);
    setNewQuestionText('');
    setNewOptions(['', '', '', '']);
  };

  const handleDeleteQuestion = (id: number | string) => {
    onUpdateQuestions(questions.filter((q) => q.id !== id));
  };

  // Theme Styles Tokens
  const isLight = theme === 'light';
  const containerClass = isLight
    ? 'bg-slate-50 text-slate-900 min-h-screen'
    : 'bg-[#0A101D] text-slate-100 min-h-screen';
  const cardClass = isLight
    ? 'bg-white border border-slate-200/80 shadow-sm shadow-slate-100'
    : 'bg-[#111A2E] border border-white/10 shadow-lg';
  const headerClass = isLight
    ? 'bg-white border-b border-slate-200'
    : 'bg-[#0E1626] border-b border-white/10';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';
  const inputClass = isLight
    ? 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
    : 'bg-[#0A101D] border border-white/15 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400';

  return (
    <div className={containerClass}>
      {/* Top Header Bar */}
      <header className={`${headerClass} sticky top-0 z-40 px-4 sm:px-8 py-4 transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-semibold text-xs tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 font-mono">
                Technical Quiz Portal
              </span>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isConnected ? 'Realtime Connected' : 'Connecting...'}
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${textPrimary}`}>
              Admin Control Deck
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Theme Toggle Button (Light / Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-[#162238] border-white/15 text-slate-200 hover:bg-[#1E2E4A]'
              }`}
              title="Toggle Light / Dark Mode"
            >
              {isLight ? (
                <>
                  <Moon size={14} className="text-indigo-600" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-amber-400" />
                  <span>Light Mode</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-[#162238] border-white/15 text-slate-200 hover:bg-[#1E2E4A]'
              }`}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <LogOut size={14} />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Metric 1: Total Registered */}
          <div className={`${cardClass} rounded-xl p-5 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-2 text-slate-400">
              <span className="uppercase tracking-wider">Eligible Candidates</span>
              <Users size={16} className="text-indigo-500" />
            </div>
            <div className={`text-3xl font-bold font-mono ${textPrimary}`}>
              {totalEligible}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Only Technical Quiz confirmed
            </div>
          </div>

          {/* Metric 2: Active Candidates (Real-time online now) */}
          <div className={`${cardClass} rounded-xl p-5 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-2 text-slate-400">
              <span className="uppercase tracking-wider">Online Right Now</span>
              <Radio size={16} className={activeCount > 0 ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-600">
              {activeCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              {activeCount === 0 ? 'No candidates logged in currently' : 'Taking quiz live'}
            </div>
          </div>

          {/* Metric 3: Completed */}
          <div className={`${cardClass} rounded-xl p-5 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-2 text-slate-400">
              <span className="uppercase tracking-wider">Completed Test</span>
              <CheckCircle2 size={16} className="text-blue-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-blue-600">
              {completedCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Final answers submitted
            </div>
          </div>

          {/* Metric 4: Proctoring Flags */}
          <div className={`${cardClass} rounded-xl p-5 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-2 text-slate-400">
              <span className="uppercase tracking-wider">Proctoring Alerts</span>
              <ShieldAlert size={16} className="text-amber-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-amber-600">
              {violations.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Tab switch / screen capture logs
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'leaderboard'
                ? isLight
                  ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                  : 'bg-indigo-950/60 text-indigo-300 font-semibold border border-indigo-700/50'
                : textMuted
            }`}
          >
            <Trophy size={14} />
            <span>Live Standings & Candidates ({leaderboardList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('proctoring')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'proctoring'
                ? isLight
                  ? 'bg-amber-50 text-amber-700 font-semibold border border-amber-200'
                  : 'bg-amber-950/60 text-amber-300 font-semibold border border-amber-700/50'
                : textMuted
            }`}
          >
            <ShieldAlert size={14} />
            <span>Proctoring Alert Log ({violations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'questions'
                ? isLight
                  ? 'bg-slate-100 text-slate-800 font-semibold border border-slate-300'
                  : 'bg-white/10 text-white font-semibold border border-white/20'
                : textMuted
            }`}
          >
            <HelpCircle size={14} />
            <span>Questions Bank ({questions.length})</span>
          </button>
        </div>

        {/* TAB 1: Live Standings & Candidates */}
        {activeTab === 'leaderboard' && (
          <div className={`${cardClass} rounded-xl p-6 transition-colors duration-200`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className={`text-base font-bold ${textPrimary} flex items-center gap-2`}>
                  <Flame className="text-amber-500" size={18} />
                  Technical Quiz Candidate Standings
                </h2>
                <p className={`text-xs ${textMuted} mt-0.5`}>
                  Real-time scores, presence indicators, and live rank adjustments
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Completed
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  Yet to Login
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-16 text-slate-400">
                <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-mono text-slate-500">Synchronizing database records from Supabase...</p>
              </div>
            ) : leaderboardList.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No Technical Quiz registered candidates found.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence>
                  {leaderboardList.map((student, index) => {
                    const rank = index + 1;
                    const isOnline = student.status === 'active';
                    const isCompleted = student.status === 'completed';
                    const isOffline = student.status === 'offline';

                    let statusBadge = (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                        <UserX size={11} /> Yet to Login
                      </span>
                    );

                    if (isOnline) {
                      statusBadge = (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Taking Quiz (Q{student.currentQuestion})
                        </span>
                      );
                    } else if (isCompleted) {
                      statusBadge = (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 font-semibold">
                          <CheckCircle2 size={11} /> Finished
                        </span>
                      );
                    }

                    return (
                      <motion.div
                        key={student.email}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                          isLight
                            ? isOnline
                              ? 'bg-emerald-50/30 border-emerald-200 shadow-sm'
                              : 'bg-white border-slate-200/80 hover:border-slate-300'
                            : isOnline
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-[#151F36] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1">
                          {/* Rank Pill */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                              rank === 1
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : rank === 2
                                ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                : rank === 3
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            #{rank}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${textPrimary}`}>
                                {student.name}
                              </span>
                              {statusBadge}
                              {student.violationsCount > 0 && (
                                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                  <AlertTriangle size={10} />
                                  {student.violationsCount} Flag(s)
                                </span>
                              )}
                            </div>
                            <div className={`text-xs ${textMuted} flex items-center gap-2 mt-0.5`}>
                              <span>{student.college}</span>
                              <span>•</span>
                              <span className="font-mono">{student.email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Score & Progress */}
                        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] font-mono text-slate-400 uppercase">Progress</div>
                            <div className={`text-xs font-mono font-medium ${isOnline ? 'text-emerald-600' : textMuted}`}>
                              {student.currentQuestion > 0 ? `Q ${student.currentQuestion} / ${student.totalQuestions}` : 'Not Started'}
                            </div>
                          </div>

                          <div className="text-right min-w-[70px]">
                            <div className="text-[10px] font-mono text-slate-400 uppercase">Score</div>
                            <div className={`text-xl font-mono font-bold ${textPrimary}`}>
                              {student.score}
                              <span className="text-xs font-normal text-slate-400"> pts</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Proctoring Alerts */}
        {activeTab === 'proctoring' && (
          <div className={`${cardClass} rounded-xl p-6 transition-colors duration-200`}>
            <h2 className={`text-base font-bold ${textPrimary} mb-1 flex items-center gap-2`}>
              <ShieldAlert className="text-amber-500" size={18} />
              Proctoring Telemetry & Anti-Cheat Feed
            </h2>
            <p className={`text-xs ${textMuted} mb-6`}>
              Real-time audit log of tab switches, screen blur, and screenshot penalties
            </p>

            {violations.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                <p className="text-sm">No proctoring violations recorded.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {violations.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">{v.studentName} </span>
                        <span className="font-mono text-slate-500">({v.studentEmail})</span>
                        <div className="text-red-700 mt-0.5 font-medium">
                          Violation: <strong className="uppercase">{v.violationType.replace('_', ' ')}</strong> on Question {v.questionIndex} • 0 Marks awarded
                        </div>
                      </div>
                    </div>
                    <div className="font-mono text-slate-400 text-[11px] shrink-0">{v.timestamp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Question Bank */}
        {activeTab === 'questions' && (
          <div className={`${cardClass} rounded-xl p-6 transition-colors duration-200`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>Quiz Question Bank</h2>
                <p className={`text-xs ${textMuted}`}>
                  View, add, and manage questions distributed to candidates
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingQuestion(!isAddingQuestion)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer font-sans shadow-sm"
              >
                <Plus size={14} />
                <span>{isAddingQuestion ? 'Cancel' : 'Add Question'}</span>
              </button>
            </div>

            {/* Add Question Form */}
            {isAddingQuestion && (
              <form onSubmit={handleAddQuestion} className="mb-6 p-5 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-4">
                <h3 className="text-xs font-mono font-bold text-indigo-700 uppercase">New Technical Question</h3>

                <div>
                  <label className="block text-xs font-mono text-slate-500 uppercase mb-1">Question Prompt</label>
                  <textarea
                    required
                    rows={2}
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="e.g. Which logic family offers the lowest power consumption?"
                    className={`w-full rounded-lg p-3 text-xs ${inputClass}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {newOptions.map((opt, i) => (
                    <div key={i}>
                      <label className="block text-xs font-mono text-slate-500 uppercase mb-1">
                        Option {String.fromCharCode(65 + i)} {newCorrectAnswer === i && '(Correct)'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={newCorrectAnswer === i}
                          onChange={() => setNewCorrectAnswer(i)}
                          className="text-indigo-600"
                        />
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newOptions];
                            updated[i] = e.target.value;
                            setNewOptions(updated);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          className={`w-full rounded-lg px-3 py-1.5 text-xs ${inputClass}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer font-sans"
                  >
                    Save Question
                  </button>
                </div>
              </form>
            )}

            {/* Question List */}
            <div className="space-y-2.5">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-[#151F36] border-white/10'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-indigo-600">Q{idx + 1}.</span>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                        {q.category || 'ECE'}
                      </span>
                    </div>
                    <p className={`text-xs font-medium ${textPrimary} mb-2`}>{q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`px-2 py-1 rounded ${
                            oIdx === q.correctAnswer
                              ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                              : textMuted
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition-colors"
                    title="Delete Question"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
