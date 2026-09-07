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
  Edit3,
  RotateCcw,
  Search,
  Megaphone,
  Check,
  X,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  Clock,
  UserX
} from 'lucide-react';
import type { Question, LiveStudentStatus, ProctoringViolation, QuizSubmission } from '../../types/quiz';
import {
  supabase,
  subscribeToQuizArena,
  getTechnicalQuizParticipants,
  saveQuestionBankToCloud,
  broadcastAdminAnnouncement,
  broadcastResetStudent,
  broadcastQuizStatus,
} from '../../lib/supabase';

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
  // Theme state: default is 'light' (white theme)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('spark_admin_theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'proctoring' | 'questions'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash.includes('questions') || window.location.search.includes('tab=questions')) {
        return 'questions';
      }
      if (window.location.hash.includes('proctoring') || window.location.search.includes('tab=proctoring')) {
        return 'proctoring';
      }
    }
    return 'leaderboard';
  });
  const [students, setStudents] = useState<Record<string, LiveStudentStatus>>({});
  const [violations, setViolations] = useState<ProctoringViolation[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Question Management State
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('edit=1')) {
      return questions[0] || null;
    }
    return null;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formText, setFormText] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('edit=1')) {
      return questions[0]?.question || '';
    }
    return '';
  });
  const [formOptions, setFormOptions] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('edit=1')) {
      return [...(questions[0]?.options || ['', '', '', ''])];
    }
    return ['', '', '', ''];
  });
  const [formCorrectAnswer, setFormCorrectAnswer] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('edit=1')) {
      return questions[0]?.correctAnswer || 0;
    }
    return 0;
  });
  const [formCategory, setFormCategory] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('edit=1')) {
      return questions[0]?.category || 'ECE Core';
    }
    return 'ECE Core';
  });

  // Search & Filter State for candidates
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'offline'>('all');

  // Admin Broadcast Announcement State
  const [announcementText, setAnnouncementText] = useState('');
  const [isQuizLocked, setIsQuizLocked] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('spark_admin_theme', nextTheme);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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
            status: 'offline',
            lastSeen: p.created_at || new Date().toISOString(),
          };
        });

        // Load any stored completions
        try {
          const savedSubmissions: QuizSubmission[] = JSON.parse(
            localStorage.getItem('spark_quiz_submissions') || '[]'
          );
          if (Array.isArray(savedSubmissions)) {
            savedSubmissions.forEach((sub) => {
              if (!sub || !sub.participant_email) return;
              const key = sub.participant_email.toLowerCase();
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

  // Filtered and sorted leaderboard array
  const leaderboardList = Object.values(students)
    .filter((s) => {
      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.college.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const statusOrder: Record<string, number> = { active: 1, completed: 2, flagged: 3, offline: 4 };
      const aOrder = statusOrder[a.status] || 5;
      const bOrder = statusOrder[b.status] || 5;
      if (b.score !== a.score) return b.score - a.score;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

  const totalEligible = Object.keys(students).length;
  const activeCount = Object.values(students).filter((s) => s.status === 'active').length;
  const completedCount = Object.values(students).filter((s) => s.status === 'completed').length;

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

  // Reset Student Attempt (Admin Control)
  const handleResetStudent = (studentEmail: string) => {
    if (!window.confirm(`Reset test session for ${studentEmail}? The student can retake the quiz.`)) {
      return;
    }

    const key = studentEmail.toLowerCase();
    setStudents((prev) => {
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          score: 0,
          currentQuestion: 0,
          violationsCount: 0,
          status: 'offline',
          completedAt: undefined,
        },
      };
    });

    // Remove from local storage submissions
    try {
      const existing: QuizSubmission[] = JSON.parse(
        localStorage.getItem('spark_quiz_submissions') || '[]'
      );
      const filtered = existing.filter((sub) => sub.participant_email.toLowerCase() !== key);
      localStorage.setItem('spark_quiz_submissions', JSON.stringify(filtered));
    } catch (e) {
      console.error(e);
    }

    // Broadcast reset event so if student has page open, it resets
    broadcastResetStudent(studentEmail);
    showToast(`Session reset for ${studentEmail}. Candidate can now re-test.`);
  };

  // Toggle Quiz Lock (Admin Control)
  const handleToggleQuizLock = () => {
    const nextState = !isQuizLocked;
    setIsQuizLocked(nextState);
    broadcastQuizStatus(!nextState);
    showToast(nextState ? 'Quiz session paused for all students.' : 'Quiz session unlocked.');
  };

  // Send Admin Announcement Broadcast
  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    broadcastAdminAnnouncement(announcementText.trim());
    showToast('Announcement broadcasted to all active participants!');
    setAnnouncementText('');
  };

  // Open Edit Modal for a question
  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setFormText(q.question);
    setFormOptions([...q.options]);
    setFormCorrectAnswer(q.correctAnswer);
    setFormCategory(q.category || 'ECE Core');
    setIsAddingQuestion(false);
  };

  // Open Add Modal
  const handleOpenAddQuestion = () => {
    setEditingQuestion(null);
    setFormText('');
    setFormOptions(['', '', '', '']);
    setFormCorrectAnswer(0);
    setFormCategory('ECE Core');
    setIsAddingQuestion(true);
  };

  // Save / Update Question (both Local and Cloud sync)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) return;

    let updatedList: Question[];

    if (editingQuestion) {
      // Update existing
      updatedList = questions.map((q) =>
        q.id === editingQuestion.id
          ? {
              ...q,
              question: formText,
              options: [...formOptions],
              correctAnswer: formCorrectAnswer,
              category: formCategory,
            }
          : q
      );
      showToast(`Question #${editingQuestion.id} updated and synced to cloud!`);
    } else {
      // Add new
      const newQ: Question = {
        id: Date.now(),
        question: formText,
        options: [...formOptions],
        correctAnswer: formCorrectAnswer,
        category: formCategory,
        points: 1,
      };
      updatedList = [...questions, newQ];
      showToast('New question added and synced to cloud!');
    }

    onUpdateQuestions(updatedList);
    await saveQuestionBankToCloud(updatedList);

    // Reset Form
    setIsAddingQuestion(false);
    setEditingQuestion(null);
  };

  // Delete Question
  const handleDeleteQuestion = async (id: number | string) => {
    if (!window.confirm('Delete this question from question bank?')) return;

    const updatedList = questions.filter((q) => q.id !== id);
    onUpdateQuestions(updatedList);
    await saveQuestionBankToCloud(updatedList);
    showToast('Question deleted successfully.');
  };

  // Theme Tokens
  const isLight = theme === 'light';
  const containerClass = isLight
    ? 'bg-slate-50 text-slate-900 min-h-screen'
    : 'bg-[#0A101D] text-slate-100 min-h-screen';
  const cardClass = isLight
    ? 'bg-white border border-slate-200/90 shadow-sm shadow-slate-100'
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
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2"
          >
            <Check size={16} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className={`${headerClass} sticky top-0 z-40 px-4 sm:px-8 py-3.5 transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-semibold text-xs tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 font-mono">
                Technical Quiz Portal
              </span>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
                />
                {isConnected ? 'Realtime Connected' : 'Connecting...'}
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${textPrimary}`}>
              Admin Control Deck
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Quiz Pause / Unlock Toggle */}
            <button
              type="button"
              onClick={handleToggleQuizLock}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                isQuizLocked
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-[#162238] border-white/15 text-slate-200'
              }`}
              title={isQuizLocked ? 'Click to Unlock Quiz' : 'Click to Pause Quiz'}
            >
              {isQuizLocked ? <Lock size={13} className="text-amber-600" /> : <Unlock size={13} />}
              <span>{isQuizLocked ? 'Quiz Paused' : 'Quiz Active'}</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-[#162238] border-white/15 text-slate-200 hover:bg-[#1E2E4A]'
              }`}
            >
              {isLight ? (
                <>
                  <Moon size={13} className="text-indigo-600" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={13} className="text-amber-400" />
                  <span>Light Mode</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-[#162238] border-white/15 text-slate-200 hover:bg-[#1E2E4A]'
              }`}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <LogOut size={13} />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${cardClass} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-400">
              <span className="uppercase tracking-wider">Eligible Candidates</span>
              <Users size={15} className="text-indigo-500" />
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${textPrimary}`}>
              {totalEligible}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Only Technical Quiz confirmed
            </div>
          </div>

          <div className={`${cardClass} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-400">
              <span className="uppercase tracking-wider">Online Right Now</span>
              <Radio size={15} className={activeCount > 0 ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">
              {activeCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              {activeCount === 0 ? 'No candidates logged in currently' : 'Taking quiz live'}
            </div>
          </div>

          <div className={`${cardClass} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-400">
              <span className="uppercase tracking-wider">Completed Test</span>
              <CheckCircle2 size={15} className="text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-600">
              {completedCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Final answers submitted
            </div>
          </div>

          <div className={`${cardClass} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-400">
              <span className="uppercase tracking-wider">Proctoring Alerts</span>
              <ShieldAlert size={15} className="text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-600">
              {violations.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Tab switch / screen capture logs
            </div>
          </div>
        </div>

        {/* Live Broadcast Control Bar */}
        <div className={`${cardClass} rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3`}>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 shrink-0">
            <Megaphone size={16} />
            <span>Broadcast Live Message to Students:</span>
          </div>
          <form onSubmit={handleSendAnnouncement} className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-xl">
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. 5 minutes remaining! Please review your answers."
              className={`w-full rounded-lg px-3 py-1.5 text-xs ${inputClass}`}
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer font-sans shrink-0"
            >
              Send
            </button>
          </form>
        </div>

        {/* Tab Navigation */}
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
            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className={`text-base font-bold ${textPrimary} flex items-center gap-2`}>
                  <Flame className="text-amber-500" size={18} />
                  Technical Quiz Candidate Standings
                </h2>
                <p className={`text-xs ${textMuted} mt-0.5`}>
                  Real-time presence, scores, and candidate management
                </p>
              </div>

              {/* Search & Filter bar */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate..."
                    className={`w-full rounded-lg pl-8 pr-3 py-1.5 text-xs ${inputClass}`}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs ${inputClass}`}
                >
                  <option value="all">All Status</option>
                  <option value="active">Online (Taking Quiz)</option>
                  <option value="completed">Completed</option>
                  <option value="offline">Yet to Login</option>
                </select>
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
                <p className="text-sm">No candidates matching the criteria.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence>
                  {leaderboardList.map((student, index) => {
                    const rank = index + 1;
                    const isOnline = student.status === 'active';
                    const isCompleted = student.status === 'completed';

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

                        {/* Right: Score, Progress, and Reset Control */}
                        <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] font-mono text-slate-400 uppercase">Progress</div>
                            <div className={`text-xs font-mono font-medium ${isOnline ? 'text-emerald-600' : textMuted}`}>
                              {student.currentQuestion > 0 ? `Q ${student.currentQuestion} / ${student.totalQuestions}` : 'Not Started'}
                            </div>
                          </div>

                          <div className="text-right min-w-[65px]">
                            <div className="text-[10px] font-mono text-slate-400 uppercase">Score</div>
                            <div className={`text-xl font-mono font-bold ${textPrimary}`}>
                              {student.score}
                              <span className="text-xs font-normal text-slate-400"> pts</span>
                            </div>
                          </div>

                          {/* Admin Reset Button */}
                          <button
                            type="button"
                            onClick={() => handleResetStudent(student.email)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Reset candidate session to allow re-test"
                          >
                            <RotateCcw size={14} />
                          </button>
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

        {/* TAB 3: Question Bank - 2-COLUMN RESPONSIVE GRID & EDIT MODAL */}
        {activeTab === 'questions' && (
          <div className={`${cardClass} rounded-xl p-6 transition-colors duration-200`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>Quiz Question Bank (2-Column Grid)</h2>
                <p className={`text-xs ${textMuted}`}>
                  Review, edit, add, or delete questions. Edits are synchronized directly with cloud storage.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddQuestion}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer font-sans shadow-sm"
              >
                <Plus size={14} />
                <span>Add Question</span>
              </button>
            </div>

            {/* Add / Edit Question Modal Drawer */}
            {(isAddingQuestion || editingQuestion) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-5 sm:p-6 rounded-2xl border-2 border-indigo-500/40 bg-indigo-50/30 shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-mono font-bold text-indigo-700 uppercase flex items-center gap-2">
                    <Edit3 size={15} />
                    {editingQuestion ? `Edit Question #${editingQuestion.id}` : 'Create New Technical Question'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingQuestion(false);
                      setEditingQuestion(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveQuestion} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-mono text-slate-500 uppercase mb-1">
                        Question Prompt
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={formText}
                        onChange={(e) => setFormText(e.target.value)}
                        placeholder="e.g. In Boolean algebra, what is the value of A + A'B?"
                        className={`w-full rounded-lg p-3 text-xs ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-500 uppercase mb-1">
                        Category / Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        placeholder="e.g. Semiconductors"
                        className={`w-full rounded-lg p-3 text-xs ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formOptions.map((opt, i) => (
                      <div key={i} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-mono text-slate-500 uppercase">
                            Option {String.fromCharCode(65 + i)}
                          </label>
                          <label className="flex items-center gap-1 text-[11px] font-mono text-indigo-600 cursor-pointer">
                            <input
                              type="radio"
                              name="formCorrectRadio"
                              checked={formCorrectAnswer === i}
                              onChange={() => setFormCorrectAnswer(i)}
                              className="text-indigo-600"
                            />
                            <span>{formCorrectAnswer === i ? 'Correct Answer' : 'Set Correct'}</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const updated = [...formOptions];
                            updated[i] = e.target.value;
                            setFormOptions(updated);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                          className={`w-full rounded-md px-2.5 py-1.5 text-xs ${inputClass}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingQuestion(false);
                        setEditingQuestion(null);
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer font-sans"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer font-sans flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>{editingQuestion ? 'Save & Sync Changes' : 'Create & Sync Question'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* 2-COLUMN RESPONSIVE GRID FOR QUESTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    isLight
                      ? 'bg-white border-slate-200/90 hover:border-indigo-300 shadow-xs'
                      : 'bg-[#141E34] border-white/10 hover:border-cyan-500/40 shadow-md'
                  }`}
                >
                  <div>
                    {/* Card Header with Question Number, Category, and Action Buttons */}
                    <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
                          Q{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-white/10">
                          {q.category || 'ECE Core'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Edit Button with Icon and Label */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(q)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/60 transition-colors cursor-pointer"
                          title="Edit Question Details"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Delete Question"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <h4 className={`text-sm font-semibold ${textPrimary} leading-relaxed mb-4`}>
                      {q.question}
                    </h4>

                    {/* Options 4 items */}
                    <div className="space-y-2 text-xs mb-4">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correctAnswer;
                        return (
                          <div
                            key={oIdx}
                            className={`px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-all ${
                              isCorrect
                                ? isLight
                                  ? 'bg-emerald-50/90 text-emerald-900 font-semibold border-2 border-emerald-300 shadow-xs'
                                  : 'bg-emerald-950/40 text-emerald-300 font-semibold border-2 border-emerald-600 shadow-xs'
                                : isLight
                                ? 'text-slate-700 bg-slate-50/80 border border-slate-200/80'
                                : 'text-slate-300 bg-white/5 border border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate mr-2">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="truncate">{opt}</span>
                            </div>

                            {isCorrect && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md shrink-0">
                                <Check size={11} strokeWidth={3} />
                                Correct Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-3 border-t border-slate-100 dark:border-white/10">
                    <span>1 Point • Single Choice</span>
                    <span className="inline-flex items-center gap-1 text-indigo-500 font-medium">
                      <Sparkles size={11} />
                      Cloud Synced
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
