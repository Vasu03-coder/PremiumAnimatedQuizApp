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
  UserX,
  KeyRound,
  Copy,
  Play,
  Timer
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
  broadcastQuizSchedule,
  getQuizSchedule,
  PREDEFINED_PASSCODES,
  type QuizSchedulePayload,
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
  // Theme state: default is 'dark' (black command center theme)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spark_admin_theme') as 'light' | 'dark' | null;
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark'; // Default to black/dark theme
    }
    return 'dark';
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
  const [schedule, setSchedule] = useState<QuizSchedulePayload>(() => getQuizSchedule());
  const isQuizLocked = !schedule.isQuizActive;
  const [remainingStartSeconds, setRemainingStartSeconds] = useState<number>(() => {
    const sched = getQuizSchedule();
    if (!sched.scheduledStartTime) return 0;
    return Math.max(0, Math.floor((new Date(sched.scheduledStartTime).getTime() - Date.now()) / 1000));
  });
  const [customStartMinutes, setCustomStartMinutes] = useState<string>('5');
  const [exactTimeInput, setExactTimeInput] = useState<string>('10:00');
  const [currentClockTime, setCurrentClockTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [copiedPasscode, setCopiedPasscode] = useState<string | null>(null);

  // Live clock interval & countdown interval
  useEffect(() => {
    const updateCountdownAndClock = () => {
      setCurrentClockTime(new Date().toLocaleTimeString());
      const cur = getQuizSchedule();
      if (!cur.scheduledStartTime) {
        setRemainingStartSeconds(0);
        return;
      }
      const diff = Math.floor((new Date(cur.scheduledStartTime).getTime() - Date.now()) / 1000);
      setRemainingStartSeconds(Math.max(0, diff));
    };

    updateCountdownAndClock();
    const interval = setInterval(updateCountdownAndClock, 1000);
    return () => clearInterval(interval);
  }, [schedule.scheduledStartTime]);

  const handleSetExactClockTime = (timeString: string) => {
    if (!timeString) return;
    const parts = timeString.split(':');
    if (parts.length < 2) return;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return;

    const targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);

    // If target time has already passed today, set for tomorrow
    if (targetDate.getTime() <= Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const diffSeconds = Math.max(0, Math.floor((targetDate.getTime() - Date.now()) / 1000));
    const formattedTime = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const payload: QuizSchedulePayload = {
      scheduledStartTime: targetDate.toISOString(),
      isQuizActive: true,
      targetClockTime: formattedTime,
      message: `Quiz scheduled to start at ${formattedTime}`,
    };
    setSchedule(payload);
    broadcastQuizSchedule(payload);
    showToast(`⏱️ Quiz scheduled for ${formattedTime}! (${Math.floor(diffSeconds / 60)}m remaining)`);
  };

  const handleSetScheduleMinutes = (mins: number) => {
    const targetDate = new Date(Date.now() + mins * 60 * 1000);
    const formattedTime = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const payload: QuizSchedulePayload = {
      scheduledStartTime: targetDate.toISOString(),
      isQuizActive: true,
      targetClockTime: formattedTime,
      durationMinutes: mins,
      message: `Quiz scheduled to start in ${mins} minute(s) (${formattedTime})`,
    };
    setSchedule(payload);
    broadcastQuizSchedule(payload);
    showToast(`⏱️ Start timer set: Quiz will unlock at ${formattedTime} (+${mins}m)!`);
  };

  const handleStartImmediately = () => {
    const payload: QuizSchedulePayload = {
      scheduledStartTime: null,
      isQuizActive: true,
      targetClockTime: undefined,
      message: 'Quiz started immediately by Administrator!',
    };
    setSchedule(payload);
    broadcastQuizSchedule(payload);
    showToast('🚀 Quiz launched immediately! All candidate waiting rooms unlocked.');
  };

  const handlePauseQuiz = () => {
    const payload: QuizSchedulePayload = {
      ...schedule,
      isQuizActive: false,
      message: 'Quiz has been paused by Administrator.',
    };
    setSchedule(payload);
    broadcastQuizSchedule(payload);
    showToast('⏸ Quiz paused for all candidates.');
  };

  const handleResumeQuiz = () => {
    const payload: QuizSchedulePayload = {
      ...schedule,
      isQuizActive: true,
      message: 'Quiz session resumed by Administrator.',
    };
    setSchedule(payload);
    broadcastQuizSchedule(payload);
    showToast('▶ Quiz resumed! All candidate screens unfrozen.');
  };

  const handleCopyPasscode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPasscode(code);
    showToast(`Passcode "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedPasscode(null), 2000);
  };

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
    if (schedule.isQuizActive) {
      handlePauseQuiz();
    } else {
      handleResumeQuiz();
    }
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

  // Theme Tokens - Cohesive, premium design system for both dark and light modes
  const isLight = theme === 'light';
  const containerClass = isLight
    ? 'bg-slate-100 text-slate-900 min-h-screen font-sans selection:bg-blue-500/20'
    : 'bg-[#090d16] text-slate-100 min-h-screen font-sans selection:bg-blue-500/30';
  const cardClass = isLight
    ? 'bg-white border border-slate-200 shadow-sm'
    : 'bg-[#0f172a] border border-slate-800 shadow-xl';
  const headerClass = isLight
    ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs'
    : 'bg-[#0b1120]/95 backdrop-blur-md border-b border-slate-800';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textSecondary = isLight ? 'text-slate-700' : 'text-slate-300';
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';
  const inputClass = isLight
    ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
    : 'bg-slate-950/80 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
  const buttonSecondary = isLight
    ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs'
    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-xs';

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
              <span className={`font-semibold text-xs tracking-wider uppercase px-2.5 py-0.5 rounded-md font-mono border ${
                isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
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
                  ? isLight
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                  : isLight
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50'
              }`}
              title={isQuizLocked ? 'Click to Unlock Quiz' : 'Click to Pause Quiz'}
            >
              {isQuizLocked ? <Lock size={13} className="text-amber-500" /> : <Unlock size={13} className="text-emerald-500" />}
              <span>{isQuizLocked ? 'Quiz Paused' : 'Quiz Active'}</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${buttonSecondary}`}
            >
              {isLight ? (
                <>
                  <Moon size={13} className="text-slate-700" />
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${buttonSecondary}`}
            >
              <Download size={13} className="text-slate-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/40'
              }`}
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-6">
          <div className={`${cardClass} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-400">
              <span className="uppercase tracking-wider">Eligible Candidates</span>
              <Users size={15} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
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
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
              {activeCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              {activeCount === 0 ? 'No candidates logged in currently' : 'Taking quiz live'}
            </div>
          </div>

          <div className={`${cardClass} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-400">
              <span className="uppercase tracking-wider">Completed Test</span>
              <CheckCircle2 size={15} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
              {completedCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Final answers submitted
            </div>
          </div>

          <div className={`${cardClass} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-400">
              <span className="uppercase tracking-wider">Proctoring Alerts</span>
              <ShieldAlert size={15} className={isLight ? 'text-amber-600' : 'text-amber-400'} />
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
              {violations.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Tab switch / screen capture logs
            </div>
          </div>
        </div>

        {/* SYNCHRONIZED QUIZ START & COUNTDOWN CONTROLLER CARD */}
        <div className={`${cardClass} rounded-2xl p-5 mb-6 border transition-all ${
          !schedule.isQuizActive
            ? isLight ? 'border-amber-300 bg-amber-50/60' : 'border-amber-500/40 bg-amber-950/25'
            : schedule.scheduledStartTime && remainingStartSeconds > 0
            ? isLight ? 'border-blue-300 bg-blue-50/50' : 'border-blue-500/40 bg-blue-950/25'
            : isLight ? 'border-emerald-200 bg-emerald-50/40' : 'border-emerald-500/30 bg-emerald-950/25'
        }`}>
          {/* Header Row: Title, Status Badge, and Live Clock */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                !schedule.isQuizActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : schedule.scheduledStartTime && remainingStartSeconds > 0
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}>
                <Clock size={20} className={schedule.scheduledStartTime && remainingStartSeconds > 0 ? 'animate-pulse' : ''} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-base font-bold ${textPrimary}`}>
                    Synchronized Quiz Start & Waiting Room Controller
                  </h3>
                  {!schedule.isQuizActive ? (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1">
                      <Lock size={10} /> QUIZ PAUSED
                    </span>
                  ) : schedule.scheduledStartTime && remainingStartSeconds > 0 ? (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                      COUNTDOWN ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      LIVE & UNLOCKED
                    </span>
                  )}
                </div>
                <p className={`text-xs ${textMuted} mt-0.5`}>
                  All students see the synchronized start timer. Once the timer reaches 00:00, all questions unlock at the exact same moment.
                </p>
              </div>
            </div>

            {/* Current System Time Live Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Current Time: <strong className="text-white">{currentClockTime}</strong></span>
            </div>
          </div>

          {/* Middle Row: Current Active Status Details & Primary Actions */}
          <div className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/[0.08]">
            <div>
              {!schedule.isQuizActive ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <Lock size={15} className="shrink-0" />
                  <div>
                    <span className="font-bold">Quiz Currently Paused: </span>
                    <span>All student screens and 60s question timers are frozen. No student can proceed until you click Resume.</span>
                  </div>
                </div>
              ) : schedule.scheduledStartTime && remainingStartSeconds > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xs text-slate-400 font-mono">
                    Scheduled Start Time: <strong className="text-white text-sm">{schedule.targetClockTime || new Date(schedule.scheduledStartTime).toLocaleTimeString()}</strong>
                  </div>
                  <div className="text-xs font-mono px-3 py-1 rounded-lg bg-blue-900/50 border border-blue-500/30 text-blue-200 font-bold flex items-center gap-1.5">
                    <Timer size={14} className="text-blue-400 animate-spin" />
                    <span>Countdown: {String(Math.floor(remainingStartSeconds / 60)).padStart(2, '0')}:{String(remainingStartSeconds % 60).padStart(2, '0')} remaining</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>The quiz is currently unlocked and live for all registered candidates.</span>
                </div>
              )}
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Pause / Resume Button */}
              {schedule.isQuizActive ? (
                <button
                  type="button"
                  onClick={handlePauseQuiz}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-200 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Pause quiz session and freeze all candidate screens immediately"
                >
                  <Lock size={14} className="text-amber-400" />
                  <span>Pause Quiz (Freeze All)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResumeQuiz}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Resume quiz and unfreeze student screens"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Resume Quiz (Unfreeze All)</span>
                </button>
              )}

              {/* Start Immediately */}
              <button
                type="button"
                onClick={handleStartImmediately}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  schedule.scheduledStartTime && remainingStartSeconds > 0
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-sm'
                    : buttonSecondary
                }`}
                title="Unlock quiz immediately for all candidates"
              >
                <Sparkles size={14} className="text-cyan-300" />
                <span>Launch Now (Skip Wait)</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Exact Clock Time & Minutes Scheduler */}
          <div className="pt-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            {/* Clock Time Picker (e.g. 10:00 AM) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Clock size={13} className="text-blue-400" />
                <span>Set Clock Time:</span>
              </span>
              <input
                type="time"
                value={exactTimeInput}
                onChange={(e) => setExactTimeInput(e.target.value)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-mono ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => handleSetExactClockTime(exactTimeInput)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer shadow-sm"
              >
                Schedule Start Time
              </button>

              {/* Quick Preset Times */}
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={() => {
                    setExactTimeInput('10:00');
                    handleSetExactClockTime('10:00');
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${buttonSecondary}`}
                  title="Schedule quiz start at 10:00 AM"
                >
                  10:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExactTimeInput('10:30');
                    handleSetExactClockTime('10:30');
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${buttonSecondary}`}
                  title="Schedule quiz start at 10:30 AM"
                >
                  10:30 AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExactTimeInput('11:00');
                    handleSetExactClockTime('11:00');
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${buttonSecondary}`}
                  title="Schedule quiz start at 11:00 AM"
                >
                  11:00 AM
                </button>
              </div>
            </div>

            {/* Quick Relative Minutes Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Quick Minutes:</span>
              <button
                type="button"
                onClick={() => handleSetScheduleMinutes(1)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${buttonSecondary}`}
                title="Schedule start in 1 minute"
              >
                +1m
              </button>
              <button
                type="button"
                onClick={() => handleSetScheduleMinutes(2)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${buttonSecondary}`}
                title="Schedule start in 2 minutes"
              >
                +2m
              </button>
              <button
                type="button"
                onClick={() => handleSetScheduleMinutes(5)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${buttonSecondary}`}
                title="Schedule start in 5 minutes"
              >
                +5m
              </button>
              <button
                type="button"
                onClick={() => handleSetScheduleMinutes(10)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${buttonSecondary}`}
                title="Schedule start in 10 minutes"
              >
                +10m
              </button>

              {/* Custom input */}
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customStartMinutes}
                  onChange={(e) => setCustomStartMinutes(e.target.value)}
                  className={`w-14 rounded-lg px-2 py-1 text-xs text-center font-mono ${inputClass}`}
                  placeholder="Mins"
                />
                <button
                  type="button"
                  onClick={() => {
                    const m = parseInt(customStartMinutes, 10);
                    if (!isNaN(m) && m > 0) handleSetScheduleMinutes(m);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${buttonSecondary}`}
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Broadcast Control Bar */}
        <div className={`${cardClass} rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3`}>
          <div className={`flex items-center gap-2 text-xs font-semibold ${isLight ? 'text-blue-700' : 'text-blue-400'} shrink-0`}>
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
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all cursor-pointer font-sans shrink-0"
            >
              Send
            </button>
          </form>
        </div>

        {/* Tab Navigation */}
        <div className={`flex items-center gap-2 mb-6 border-b pb-3 overflow-x-auto ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'leaderboard'
                ? isLight
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs'
                  : 'bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/30'
                : textMuted + (isLight ? ' hover:bg-slate-200/50 hover:text-slate-800' : ' hover:bg-slate-800/50 hover:text-slate-200')
            }`}
          >
            <Trophy size={14} />
            <span>Live Standings & Candidates ({leaderboardList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('proctoring')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'proctoring'
                ? isLight
                  ? 'bg-amber-50 text-amber-700 font-semibold border border-amber-200 shadow-xs'
                  : 'bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30'
                : textMuted + (isLight ? ' hover:bg-slate-200/50 hover:text-slate-800' : ' hover:bg-slate-800/50 hover:text-slate-200')
            }`}
          >
            <ShieldAlert size={14} />
            <span>Proctoring Alert Log ({violations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'questions'
                ? isLight
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs'
                  : 'bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/30'
                : textMuted + (isLight ? ' hover:bg-slate-200/50 hover:text-slate-800' : ' hover:bg-slate-800/50 hover:text-slate-200')
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
                              ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                            : isOnline
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                              rank === 1
                                ? isLight
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : rank === 2
                                ? isLight
                                  ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                                : rank === 3
                                ? isLight
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : isLight
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-slate-850 text-slate-400'
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
                                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1">
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

                            {/* Candidate Passcode Badge with 1-click Copy */}
                            {(() => {
                              const matchedPasscodeEntry = Object.values(PREDEFINED_PASSCODES).find(
                                (p) => p.email.toLowerCase() === student.email.toLowerCase()
                              );
                              const candidatePasscode =
                                matchedPasscodeEntry?.passcode || (student as any).passcode || 'SPARK-ECE-101';
                              const isDemoCandidate = matchedPasscodeEntry?.isDemo || false;

                              return (
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="text-[11px] font-mono text-slate-400">Passcode:</span>
                                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                    <KeyRound size={11} />
                                    {candidatePasscode}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPasscode(candidatePasscode)}
                                    className="text-[10px] px-2 py-0.5 rounded border border-slate-700/60 hover:bg-slate-800 text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Copy passcode for candidate"
                                  >
                                    {copiedPasscode === candidatePasscode ? (
                                      <>
                                        <Check size={10} className="text-emerald-400" />
                                        <span className="text-emerald-400 font-medium">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={10} className="text-slate-400" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                  {isDemoCandidate && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                                      Demo (Bypasses Start Timer)
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Right: Score, Progress, and Reset Control */}
                        <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] font-mono text-slate-400 uppercase">Progress</div>
                            <div className={`text-xs font-mono font-medium ${isOnline ? 'text-emerald-500' : textMuted}`}>
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
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${buttonSecondary}`}
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
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs transition-colors ${
                      isLight
                        ? 'bg-rose-50/80 border-rose-200 text-slate-800'
                        : 'bg-rose-950/20 border-rose-900/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className={`font-semibold ${textPrimary}`}>{v.studentName} </span>
                        <span className={`font-mono ${textMuted}`}>({v.studentEmail})</span>
                        <div className={`mt-0.5 font-medium ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>
                          Violation: <strong className="uppercase">{v.violationType.replace('_', ' ')}</strong> on Question {v.questionIndex} • 0 Marks awarded
                        </div>
                      </div>
                    </div>
                    <div className={`font-mono ${textMuted} text-[11px] shrink-0`}>{v.timestamp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Question Bank - 2-COLUMN RESPONSIVE GRID */}
        {activeTab === 'questions' && (
          <div className={`${cardClass} rounded-xl p-6 transition-colors duration-200`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>Quiz Question Bank ({questions.length} Questions)</h2>
                <p className={`text-xs ${textMuted}`}>
                  Review, edit, add, or delete questions. Edits are synchronized directly with cloud storage.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddQuestion}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center gap-1.5 cursor-pointer font-sans shadow-sm"
              >
                <Plus size={14} />
                <span>Add Question</span>
              </button>
            </div>

            {/* 2-COLUMN RESPONSIVE GRID FOR QUESTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`p-4 sm:p-5 rounded-xl border flex flex-col justify-between transition-all duration-200 ${
                    isLight
                      ? 'bg-slate-50/70 border-slate-200 hover:border-slate-300 shadow-xs'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 shadow-md'
                  }`}
                >
                  <div>
                    {/* Card Header with Question Number, Category, and Action Buttons */}
                    <div className={`flex items-center justify-between gap-2 mb-3 pb-3 border-b ${
                      isLight ? 'border-slate-200' : 'border-slate-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                          isLight
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          Q{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                          isLight
                            ? 'bg-white text-slate-700 border-slate-200'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {q.category || 'ECE Core'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Edit Button with Icon and Label */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(q)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            isLight
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border-blue-500/30'
                          }`}
                          title="Edit Question in Popup Modal"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
                            className={`px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-all border ${
                              isCorrect
                                ? isLight
                                  ? 'bg-emerald-50 text-emerald-900 font-semibold border-emerald-300 shadow-xs'
                                  : 'bg-emerald-950/40 text-emerald-300 font-semibold border-emerald-500/50'
                                : isLight
                                ? 'bg-white text-slate-700 border-slate-200'
                                : 'bg-slate-950/60 text-slate-300 border-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate mr-2">
                              <span
                                className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                                  isCorrect
                                    ? isLight
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-emerald-500 text-slate-950 font-bold'
                                    : isLight
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="truncate">{opt}</span>
                            </div>

                            {isCorrect && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                isLight
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
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
                  <div className={`flex items-center justify-between text-[11px] font-mono ${textMuted} pt-3 border-t ${
                    isLight ? 'border-slate-200' : 'border-slate-800'
                  }`}>
                    <span>1 Point • Single Choice</span>
                    <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
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

      {/* ADD / EDIT QUESTION POPUP MODAL */}
      <AnimatePresence>
        {(isAddingQuestion || editingQuestion) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddingQuestion(false);
                setEditingQuestion(null);
              }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            />

            {/* Centered Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              className={`relative w-full max-w-2xl rounded-2xl shadow-2xl p-5 sm:p-7 border my-auto z-10 ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              {/* Modal Header */}
              <div className={`flex items-center justify-between pb-4 mb-4 border-b ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    <Edit3 size={18} />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${textPrimary}`}>
                      {editingQuestion ? `Edit Question #${editingQuestion.id}` : 'Create New Technical Question'}
                    </h3>
                    <p className={`text-xs ${textMuted}`}>
                      Changes will be saved and synchronized directly with cloud storage
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddingQuestion(false);
                    setEditingQuestion(null);
                  }}
                  className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>
                      Question Prompt
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      placeholder="e.g. In Boolean algebra, what is the value of A + A'B?"
                      className={`w-full rounded-xl p-3 text-xs ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>
                      Category / Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="e.g. Semiconductors"
                      className={`w-full rounded-xl p-3 text-xs ${inputClass}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-2 ${textSecondary}`}>
                    Answer Options (Select the radio button for the correct answer)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formOptions.map((opt, i) => {
                      const isCorrect = formCorrectAnswer === i;
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-xl border transition-all ${
                            isCorrect
                              ? isLight
                                ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
                                : 'bg-emerald-950/30 border-emerald-500/50 ring-1 ring-emerald-500/30'
                              : isLight
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-bold text-slate-400">
                              Option {String.fromCharCode(65 + i)}
                            </span>
                            <label className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                              isCorrect ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : textMuted
                            }`}>
                              <input
                                type="radio"
                                name="formCorrectRadio"
                                checked={isCorrect}
                                onChange={() => setFormCorrectAnswer(i)}
                                className="accent-emerald-600 cursor-pointer"
                              />
                              <span>{isCorrect ? 'Correct Answer' : 'Mark Correct'}</span>
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
                            placeholder={`Option ${String.fromCharCode(65 + i)} text...`}
                            className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${inputClass}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingQuestion(false);
                      setEditingQuestion(null);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${buttonSecondary}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 shadow-sm cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Check size={14} />
                    <span>{editingQuestion ? 'Save & Sync Changes' : 'Create & Sync Question'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
