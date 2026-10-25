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
  Timer,
  EyeOff,
  FileText,
  XCircle,
  Square
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
  syncBroadcastChannel,
  clearStudentCompleted,
  PREDEFINED_PASSCODES,
  isResultsPublished,
  broadcastResultsPublishState,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'lobby' | 'active' | 'completed' | 'offline'>('all');

  // Admin Broadcast Announcement State
  const [announcementText, setAnnouncementText] = useState('');
  const [schedule, setSchedule] = useState<QuizSchedulePayload>(() => getQuizSchedule());
  const [remainingStartSeconds, setRemainingStartSeconds] = useState<number>(() => {
    const sched = getQuizSchedule();
    if (!sched.scheduledStartTime) return 0;
    return Math.max(0, Math.floor((new Date(sched.scheduledStartTime).getTime() - Date.now()) / 1000));
  });
  const [customStartMinutes, setCustomStartMinutes] = useState<string>('5');
  const [exactTimeInput, setExactTimeInput] = useState<string>('10:00');
  const [currentClockTime, setCurrentClockTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [copiedPasscode, setCopiedPasscode] = useState<string | null>(null);

  // Results Publication & Candidate Answer Audit Modal States
  const [resultsPublished, setResultsPublished] = useState<boolean>(() => isResultsPublished());
  const [inspectingCandidate, setInspectingCandidate] = useState<{
    candidate: LiveStudentStatus;
    submission: QuizSubmission | null;
  } | null>(null);

  // Helper to retrieve candidate submission data from local storage
  const getCandidateSubmissionData = (candidate: LiveStudentStatus): QuizSubmission | null => {
    try {
      const cleanEmail = (candidate.email || '').toLowerCase().trim();
      const cleanPass = (candidate.passcode || '').toUpperCase().trim();
      const subStr = localStorage.getItem('spark_quiz_submissions');
      if (subStr) {
        const subs: QuizSubmission[] = JSON.parse(subStr);
        const found = subs.find(
          (s) =>
            (cleanEmail && s.participant_email && s.participant_email.toLowerCase().trim() === cleanEmail) ||
            (cleanPass && s.registration_id && s.registration_id.toUpperCase().includes(cleanPass)) ||
            (candidate.members?.some(
              (m) =>
                m.email &&
                m.email.toLowerCase().trim() === (s.participant_email || '').toLowerCase().trim()
            ))
        );
        if (found) return found;
      }
    } catch (e) {}
    return null;
  };

  const handleTogglePublishResults = () => {
    const next = !resultsPublished;
    setResultsPublished(next);
    broadcastResultsPublishState(next);
    showToast(
      next
        ? '📢 Assessment results published to all candidates!'
        : '🔒 Results unpublished. Candidates returned to waiting state.'
    );
  };

  // Listen to results published changes from external events
  useEffect(() => {
    const handleResultsChange = (e: any) => {
      if (e.detail?.isPublished !== undefined) {
        setResultsPublished(Boolean(e.detail.isPublished));
      }
    };
    window.addEventListener('spark_results_published_change', handleResultsChange);
    return () => window.removeEventListener('spark_results_published_change', handleResultsChange);
  }, []);

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
      state: 'countdown',
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
      state: 'countdown',
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

  // 10-Second Synchronized Countdown Start (Host Assessment Start)
  const handleStartCountdown = (seconds: number = 10) => {
    const countdownEndTime = new Date(Date.now() + seconds * 1000).toISOString();
    const payload: QuizSchedulePayload = {
      state: 'countdown',
      isQuizActive: true,
      countdownSeconds: seconds,
      countdownEndTime,
      scheduledStartTime: null,
      message: `Quiz countdown started (${seconds}s remaining)`,
    };
    setSchedule(payload);
    broadcastQuizSchedule(payload);
    showToast(`⏱️ ${seconds}-Second synchronized countdown started! Questions will unlock for all candidates.`);
  };

  const handleStartImmediately = () => {
    const payload: QuizSchedulePayload = {
      state: 'in_progress',
      scheduledStartTime: null,
      isQuizActive: true,
      startedAt: new Date().toISOString(),
      targetClockTime: undefined,
      message: 'Quiz started immediately by Administrator!',
    };
    setSchedule(payload);
    broadcastQuizSchedule(payload);
    showToast('🚀 Quiz launched immediately! All candidate waiting rooms unlocked.');
  };

  const handleResetToLobby = () => {
    if (!window.confirm('Return entire session to Waiting Lobby? Candidates will wait until you start again.')) {
      return;
    }
    const payload: QuizSchedulePayload = {
      state: 'lobby',
      isQuizActive: false,
      scheduledStartTime: null,
      countdownSeconds: 10,
      countdownEndTime: null,
      message: 'Session returned to Waiting Lobby by Administrator.',
    };
    setSchedule(payload);
    broadcastQuizSchedule(payload);
    showToast('🔄 Session returned to Waiting Lobby.');
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

  // Helper to find a candidate/team entry in students map by passcode or email
  const findCandidateKey = (
    map: Record<string, LiveStudentStatus>,
    email?: string,
    passcode?: string
  ): string | null => {
    const cleanPass = (passcode || '').trim().toUpperCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (cleanPass && map[cleanPass]) return cleanPass;
    if (cleanEmail && map[cleanEmail]) return cleanEmail;

    for (const [k, s] of Object.entries(map)) {
      if (cleanPass && s.passcode && s.passcode.toUpperCase() === cleanPass) return k;
      if (cleanEmail && s.email && s.email.toLowerCase() === cleanEmail) return k;
      if (cleanEmail && s.members?.some((m) => m.email.toLowerCase() === cleanEmail)) return k;
    }
    return cleanPass || cleanEmail || null;
  };

  // Admin Reset / Re-round for candidate or entire team
  const handleResetStudent = (email: string, passcode?: string) => {
    const studentPasscode = (passcode || '').toUpperCase();
    const studentEmail = (email || '').toLowerCase();

    // Collect all emails associated with this candidate team
    const targetKey = findCandidateKey(students, studentEmail, studentPasscode);
    const candidateObj = targetKey ? students[targetKey] : null;
    const allCandidateEmails = new Set<string>([studentEmail]);
    if (candidateObj) {
      if (candidateObj.email) allCandidateEmails.add(candidateObj.email.toLowerCase());
      candidateObj.members?.forEach((m) => {
        if (m.email) allCandidateEmails.add(m.email.toLowerCase());
      });
    }

    // Broadcast reset event with all emails across Supabase Realtime & BroadcastChannel
    broadcastResetStudent(studentEmail, studentPasscode, Array.from(allCandidateEmails));

    // Update local state in Admin Dashboard
    setStudents((prev) => {
      const key = findCandidateKey(prev, studentEmail, studentPasscode);
      if (!key || !prev[key]) return prev;

      return {
        ...prev,
        [key]: {
          ...prev[key],
          score: 0,
          currentQuestion: 0,
          violationsCount: 0,
          status: 'offline',
          completedAt: undefined,
          lastSeen: new Date().toISOString(),
        },
      };
    });

    // Wipe recorded proctoring violations for this candidate/team
    setViolations((prev) =>
      prev.filter((v) => {
        const vEmail = (v.studentEmail || '').toLowerCase();
        if (allCandidateEmails.has(vEmail)) return false;
        if (studentPasscode && v.studentName.toUpperCase().includes(studentPasscode)) return false;
        return true;
      })
    );

    showToast(`🔄 Re-round granted for ${studentPasscode || studentEmail}! Candidate can re-attempt with shuffled questions.`);
  };

  // Clear all proctoring violations across all candidates
  const handleClearAllViolations = () => {
    setViolations([]);
    setStudents((prev) => {
      const updated: Record<string, LiveStudentStatus> = {};
      Object.entries(prev).forEach(([k, s]) => {
        updated[k] = { ...s, violationsCount: 0 };
      });
      return updated;
    });
    showToast('🧹 All proctoring alert logs and penalty flags cleared!');
  };

  // Load ONLY Technical Quiz registered participants / teams on mount
  useEffect(() => {
    async function loadQuizParticipants() {
      try {
        const quizParticipants = await getTechnicalQuizParticipants();

        const initialMap: Record<string, LiveStudentStatus> = {};
        quizParticipants.forEach((p, idx) => {
          const pass = (p.passcode || p.registration_code || '').toUpperCase();
          const rawEmail = p.email || `participant_${p.id || idx}@symposium.local`;
          // Use Passcode as primary key so all team members map to the same card
          const key = pass || rawEmail.toLowerCase();
          initialMap[key] = {
            studentId: p.id || String(idx),
            name: p.full_name || 'Participant',
            email: rawEmail,
            college: p.college || 'Engineering College',
            department: p.department || 'ECE',
            passcode: pass,
            teamName: p.team_name,
            members: p.members,
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
              if (!sub) return;
              const subKey = findCandidateKey(initialMap, sub.participant_email, sub.registration_id);
              if (subKey && initialMap[subKey]) {
                initialMap[subKey] = {
                  ...initialMap[subKey],
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

  // Supabase Realtime & Cross-Tab BroadcastChannel Listener
  useEffect(() => {
    // 1. Cross-tab BroadcastChannel for 0ms latency between tabs on same machine
    if (syncBroadcastChannel) {
      const handleBroadcast = (e: MessageEvent) => {
        const data = e.data;
        if (!data) return;

        if (data.type === 'student_joined' && (data.payload?.email || data.payload?.passcode)) {
          const payload = data.payload;
          setStudents((prev) => {
            const targetKey =
              findCandidateKey(prev, payload.email, payload.passcode) ||
              (payload.passcode || payload.email).toUpperCase();
            const existing = prev[targetKey] || {
              studentId: payload.studentId || targetKey,
              name: payload.name || 'Candidate',
              email: payload.email,
              college: payload.college || 'Engineering College',
              department: payload.department || 'ECE',
              passcode: payload.passcode,
              teamName: payload.teamName,
              members: payload.members,
              totalQuestions: payload.totalQuestions || questions.length,
              score: 0,
              violationsCount: 0,
            };
            return {
              ...prev,
              [targetKey]: {
                ...existing,
                ...payload,
                status: payload.status || 'lobby',
                lastSeen: new Date().toISOString(),
              },
            };
          });
        } else if (data.type === 'score_update') {
          const payload = data.payload;
          setStudents((prev) => {
            const targetKey = findCandidateKey(prev, payload.email, (payload as any).passcode);
            if (!targetKey || !prev[targetKey]) return prev;
            return {
              ...prev,
              [targetKey]: {
                ...prev[targetKey],
                score: payload.score ?? prev[targetKey].score,
                currentQuestion: payload.currentQuestion ?? prev[targetKey].currentQuestion,
                violationsCount: payload.violationsCount ?? prev[targetKey].violationsCount,
                status: 'active',
                lastSeen: new Date().toISOString(),
              },
            };
          });
        } else if (data.type === 'proctoring_alert' && data.payload) {
          setViolations((prev) => [data.payload, ...prev]);
        } else if (data.type === 'quiz_completed' && (data.payload?.participant_email || data.payload?.registration_id)) {
          const payload = data.payload;
          setStudents((prev) => {
            const targetKey = findCandidateKey(prev, payload.participant_email, payload.registration_id);
            if (!targetKey || !prev[targetKey]) return prev;
            return {
              ...prev,
              [targetKey]: {
                ...prev[targetKey],
                score: payload.score ?? prev[targetKey].score,
                currentQuestion: payload.total_questions || questions.length,
                violationsCount: payload.violations_count ?? prev[targetKey].violationsCount,
                status: 'completed',
                completedAt: payload.completed_at || new Date().toISOString(),
              },
            };
          });
        } else if (data.type === 'quiz_schedule_update' && data.payload) {
          setSchedule(data.payload);
        } else if (data.type === 'results_published_change') {
          setResultsPublished(Boolean(data.payload?.isPublished));
        }
      };
      syncBroadcastChannel.addEventListener('message', handleBroadcast);
    }

    // 2. Supabase Realtime channel
    const unsubscribe = subscribeToQuizArena({
      onStudentJoined: (payload) => {
        if (!payload || (!payload.email && !payload.passcode)) return;
        setStudents((prev) => {
          const targetKey =
            findCandidateKey(prev, payload.email, payload.passcode) ||
            (payload.passcode || payload.email).toUpperCase();
          const existing = prev[targetKey] || {
            studentId: payload.studentId || targetKey,
            name: payload.name || 'Candidate',
            email: payload.email,
            college: payload.college || 'Engineering College',
            department: payload.department || 'ECE',
            passcode: payload.passcode,
            teamName: payload.teamName,
            members: payload.members,
            totalQuestions: payload.totalQuestions || questions.length,
            score: 0,
            violationsCount: 0,
          };
          return {
            ...prev,
            [targetKey]: {
              ...existing,
              ...payload,
              status: payload.status || 'lobby',
              lastSeen: new Date().toISOString(),
            },
          };
        });
      },
      onScoreUpdate: (payload) => {
        if (!payload || (!payload.email && !(payload as any).passcode)) return;
        setStudents((prev) => {
          const targetKey = findCandidateKey(prev, payload.email, (payload as any).passcode);
          if (!targetKey || !prev[targetKey]) return prev;
          return {
            ...prev,
            [targetKey]: {
              ...prev[targetKey],
              score: payload.score ?? prev[targetKey].score,
              currentQuestion: payload.currentQuestion ?? prev[targetKey].currentQuestion,
              violationsCount: payload.violationsCount ?? prev[targetKey].violationsCount,
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
          setStudents((prev) => {
            const targetKey = findCandidateKey(prev, payload.studentEmail);
            if (!targetKey || !prev[targetKey]) return prev;
            return {
              ...prev,
              [targetKey]: {
                ...prev[targetKey],
                violationsCount: (prev[targetKey].violationsCount || 0) + 1,
                status: 'flagged',
              },
            };
          });
        }
      },
      onQuizCompleted: (payload) => {
        if (!payload || (!payload.participant_email && !payload.registration_id)) return;
        setStudents((prev) => {
          const targetKey = findCandidateKey(prev, payload.participant_email, payload.registration_id);
          if (!targetKey || !prev[targetKey]) return prev;
          return {
            ...prev,
            [targetKey]: {
              ...prev[targetKey],
              score: payload.score ?? prev[targetKey].score,
              currentQuestion: payload.total_questions || questions.length,
              violationsCount: payload.violations_count ?? prev[targetKey].violationsCount,
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
      const statusOrder: Record<string, number> = { lobby: 1, active: 2, completed: 3, flagged: 4, offline: 5 };
      const aOrder = statusOrder[a.status] || 6;
      const bOrder = statusOrder[b.status] || 6;
      if (b.score !== a.score) return b.score - a.score;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

  const totalEligible = Object.keys(students).length;
  const lobbyCount = Object.values(students).filter((s) => s.status === 'lobby').length;
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
          <div className="flex items-center gap-3">
            <img
              src="/sparktron_logo.png"
              alt="SPARKTRON 2026 Logo"
              className="w-11 h-11 rounded-xl object-cover shadow-md shadow-blue-500/20 border border-blue-500/30 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className={`font-semibold text-xs tracking-wider uppercase px-2.5 py-0.5 rounded-md font-mono border ${
                  isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  SPARKTRON 2026
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
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Live Session Status Pill */}
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border flex items-center gap-1.5 transition-all ${
                schedule.state === 'in_progress'
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : schedule.state === 'countdown'
                  ? isLight
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-blue-950/30 border-blue-500/40 text-blue-300'
                  : isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {schedule.state === 'in_progress' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Quiz Active (Live)</span>
                </>
              ) : schedule.state === 'countdown' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span>10s Countdown Active</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Waiting in Lobby</span>
                </>
              )}
            </div>

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
              <span className="uppercase tracking-wider">Registered</span>
              <Users size={15} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${textPrimary}`}>
              {totalEligible}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Total assigned candidates
            </div>
          </div>

          <div className={`${cardClass} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-400">
              <span className="uppercase tracking-wider">Ready in Lobby</span>
              <Radio size={15} className={lobbyCount > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'} />
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
              {lobbyCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              {lobbyCount === 0 ? 'Waiting for candidates to log in' : 'Connected & ready to start'}
            </div>
          </div>

          <div className={`${cardClass} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-400">
              <span className="uppercase tracking-wider">Taking Quiz Live</span>
              <Sparkles size={15} className={activeCount > 0 ? 'text-blue-400 animate-spin' : 'text-slate-400'} />
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
              {activeCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              {activeCount === 0 ? 'Quiz not yet underway' : 'Answering questions live'}
            </div>
          </div>

          <div className={`${cardClass} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-400">
              <span className="uppercase tracking-wider">Completed Test</span>
              <CheckCircle2 size={15} className={isLight ? 'text-purple-600' : 'text-purple-400'} />
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
              {completedCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Final scores locked
            </div>
          </div>
        </div>

        {/* SYNCHRONIZED QUIZ START & COUNTDOWN CONTROLLER CARD */}
        <div className={`${cardClass} rounded-2xl p-5 mb-6 border transition-all ${
          schedule.state === 'countdown'
            ? isLight ? 'border-blue-300 bg-blue-50/50' : 'border-blue-500/40 bg-blue-950/25'
            : schedule.state === 'in_progress'
            ? isLight ? 'border-emerald-200 bg-emerald-50/40' : 'border-emerald-500/30 bg-emerald-950/25'
            : isLight ? 'border-slate-300 bg-slate-50/80' : 'border-slate-800 bg-slate-900/60'
        }`}>
          {/* Header Row: Title, Status Badge, and Live Clock */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                schedule.state === 'countdown'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  : schedule.state === 'in_progress'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                <Clock size={20} className={schedule.state === 'countdown' ? 'animate-pulse' : ''} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-base font-bold ${textPrimary}`}>
                    Synchronized Assessment Command Center
                  </h3>
                  {schedule.state === 'countdown' ? (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                      10s COUNTDOWN ACTIVE
                    </span>
                  ) : schedule.state === 'in_progress' ? (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE IN PROGRESS
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      WAITING IN LOBBY ({lobbyCount} READY)
                    </span>
                  )}

                  {/* Results Published Indicator Badge */}
                  {resultsPublished ? (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-400" />
                      RESULTS: PUBLISHED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold flex items-center gap-1">
                      <Lock size={10} className="text-slate-400" />
                      RESULTS: HIDDEN
                    </span>
                  )}
                </div>
                <p className={`text-xs ${textMuted} mt-0.5`}>
                  Start or stop the synchronized examination. When all candidates finish, publish results to reveal scores and answer review across all screens.
                </p>
              </div>
            </div>

            {/* Current System Time Live Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Current Time: <strong className="text-white">{currentClockTime}</strong></span>
            </div>
          </div>

          {/* Middle Row: Current Active Status Details & Primary Host Actions */}
          <div className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              {schedule.state === 'countdown' ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xs font-mono px-3.5 py-1.5 rounded-xl bg-blue-900/60 border border-blue-500/40 text-blue-200 font-bold flex items-center gap-2">
                    <Timer size={16} className="text-blue-400 animate-spin" />
                    <span>Synchronized 10s Countdown Running across all candidate terminals!</span>
                  </div>
                </div>
              ) : schedule.state === 'in_progress' ? (
                <div className="text-xs text-emerald-400 font-mono flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>The examination is actively running across all connected terminals.</span>
                </div>
              ) : (
                <div className="text-xs text-slate-300 flex items-center gap-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    <strong className="text-emerald-400 font-bold">{lobbyCount}</strong> of <strong className="text-white">{totalEligible}</strong> candidate(s) are logged in & ready in the lobby.
                  </span>
                </div>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* LOBBY STATE ACTIONS */}
              {schedule.state === 'lobby' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStartCountdown(10)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-700/20 flex items-center gap-2 cursor-pointer transition-all"
                    title="Start 10-second synchronized countdown for all waiting candidates"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>Start Quiz (10s Countdown)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartImmediately}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Unlock quiz immediately without countdown"
                  >
                    <Sparkles size={14} className="text-cyan-400" />
                    <span>Instant Launch</span>
                  </button>
                </>
              )}

              {/* COUNTDOWN STATE ACTIONS */}
              {schedule.state === 'countdown' && (
                <>
                  <button
                    type="button"
                    onClick={handleResetToLobby}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Cancel countdown and return to lobby"
                  >
                    <X size={14} />
                    <span>Cancel Countdown</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartImmediately}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Sparkles size={14} />
                    <span>Launch Instantly</span>
                  </button>
                </>
              )}

              {/* IN PROGRESS STATE ACTIONS */}
              {schedule.state === 'in_progress' && (
                <button
                  type="button"
                  onClick={handleResetToLobby}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-200 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-700 flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-950/30"
                  title="Stop quiz and return all candidate screens to waiting lobby"
                >
                  <Square size={13} fill="currentColor" />
                  <span>Stop Quiz (Return to Lobby)</span>
                </button>
              )}

              {/* PUBLISH / HIDE RESULTS TOGGLE BUTTON */}
              <button
                type="button"
                onClick={handleTogglePublishResults}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md ${
                  resultsPublished
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 shadow-amber-950/20'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/30'
                }`}
                title={
                  resultsPublished
                    ? 'Hide results and return students to waiting screen'
                    : 'Publish final scores and detailed 20-question answer review to all students'
                }
              >
                {resultsPublished ? (
                  <>
                    <EyeOff size={14} />
                    <span>Hide Results (Published)</span>
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    <span>Publish Results to All Candidates</span>
                  </>
                )}
              </button>
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
                  <option value="lobby">Ready in Lobby</option>
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
                    const isLobby = student.status === 'lobby';
                    const isOnline = student.status === 'active';
                    const isCompleted = student.status === 'completed';

                    let statusBadge = (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 flex items-center gap-1">
                        <UserX size={11} /> Yet to Login
                      </span>
                    );

                    if (isLobby) {
                      statusBadge = (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          In Lobby (Ready)
                        </span>
                      );
                    } else if (isOnline) {
                      statusBadge = (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          Taking Quiz (Q{student.currentQuestion})
                        </span>
                      );
                    } else if (isCompleted) {
                      statusBadge = (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-semibold">
                          <CheckCircle2 size={11} className="text-purple-400" /> Finished
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold text-sm ${textPrimary}`}>
                                {student.name}
                              </span>
                              {statusBadge}
                              {student.teamName && (
                                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                  <Users size={10} /> Team ({student.members?.length || 2} Members)
                                </span>
                              )}
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

                            {/* Team Roster details if team */}
                            {student.members && student.members.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="text-[10px] font-mono text-slate-400">Roster:</span>
                                {student.members.map((m) => (
                                  <span
                                    key={m.id || m.email}
                                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700/60 text-slate-300 flex items-center gap-1"
                                  >
                                    <span>{m.isLeader ? `👑 ${m.fullName}` : `👤 ${m.fullName}`}</span>
                                    {m.year && <span className="text-slate-400">({m.year})</span>}
                                    <span className="text-slate-400">• {m.email}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Candidate Passcode Badge with 1-click Copy */}
                            {(() => {
                              const matchedPasscodeEntry = Object.values(PREDEFINED_PASSCODES).find(
                                (p) => p.email.toLowerCase() === student.email.toLowerCase()
                              );
                              const candidatePasscode =
                                student.passcode ||
                                (student as any).registration_code ||
                                matchedPasscodeEntry?.passcode ||
                                'SPARK26002';
                              const isDemoCandidate =
                                matchedPasscodeEntry?.isDemo || (student as any).is_demo || false;

                              return (
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="text-[11px] font-mono text-slate-400">Passcode:</span>
                                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                    <KeyRound size={11} />
                                    {candidatePasscode}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyPasscode(candidatePasscode);
                                    }}
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
                        <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] font-mono text-slate-400 uppercase">Progress</div>
                            <div className="text-xs font-mono font-medium">
                              {isLobby ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1 justify-start sm:justify-end">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  Ready in Lobby
                                </span>
                              ) : isOnline ? (
                                <span className="text-blue-400 font-bold">
                                  Q {student.currentQuestion} / {student.totalQuestions || 20}
                                </span>
                              ) : isCompleted ? (
                                <span className="text-purple-400 font-bold">
                                  Completed ({student.totalQuestions || 20}/{student.totalQuestions || 20})
                                </span>
                              ) : (
                                <span className={textMuted}>Not Started</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right min-w-[60px]">
                            <div className="text-[10px] font-mono text-slate-400 uppercase">Score</div>
                            <div className={`text-xl font-mono font-bold ${textPrimary}`}>
                              {student.score}
                              <span className="text-xs font-normal text-slate-400"> pts</span>
                            </div>
                          </div>

                          {/* Candidate Inspection & Re-round Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const sub = getCandidateSubmissionData(student);
                                setInspectingCandidate({ candidate: student, submission: sub });
                              }}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                isLight
                                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                  : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}
                              title="Inspect answers & audit report for this candidate"
                            >
                              <FileText size={12} />
                              <span className="hidden sm:inline">Inspect Answers</span>
                            </button>

                            {(() => {
                              const matchedPasscodeEntry = Object.values(PREDEFINED_PASSCODES).find(
                                (p) => p.email.toLowerCase() === student.email.toLowerCase()
                              );
                              const candidatePasscode =
                                student.passcode ||
                                (student as any).registration_code ||
                                matchedPasscodeEntry?.passcode ||
                                'SPARK26002';

                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResetStudent(student.email, candidatePasscode);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isLight
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  }`}
                                  title="Reset candidate session: unlocks passcode & allows re-attempt"
                                >
                                  <RotateCcw size={12} />
                                  <span className="hidden sm:inline">Re-round</span>
                                </button>
                              );
                            })()}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className={`text-base font-bold ${textPrimary} mb-1 flex items-center gap-2`}>
                  <ShieldAlert className="text-amber-500" size={18} />
                  Proctoring Telemetry & Anti-Cheat Feed
                </h2>
                <p className={`text-xs ${textMuted}`}>
                  Real-time audit log of tab switches, screen blur, and screenshot penalties
                </p>
              </div>

              {violations.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllViolations}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium text-rose-300 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  title="Clear all recorded violation logs and reset flag counters on candidates"
                >
                  <Trash2 size={13} />
                  <span>Clear All Logs ({violations.length})</span>
                </button>
              )}
            </div>

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

        {/* Candidate Assessment Audit & Answer Breakdown Modal Popup */}
        {inspectingCandidate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setInspectingCandidate(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0f172a] border-slate-800 text-white'
              }`}
            >
              {/* Modal Header */}
              <div
                className={`p-4 sm:p-5 border-b flex items-start justify-between gap-4 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-base sm:text-lg font-bold">
                      {inspectingCandidate.candidate.name}
                    </h3>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                      <KeyRound size={11} />
                      {inspectingCandidate.candidate.passcode || 'SPARK26002'}
                    </span>
                    {inspectingCandidate.candidate.status === 'completed' ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-semibold">
                        <CheckCircle2 size={11} /> Finished
                      </span>
                    ) : inspectingCandidate.candidate.status === 'active' ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 font-semibold">
                        Taking Quiz (Q{inspectingCandidate.candidate.currentQuestion})
                      </span>
                    ) : inspectingCandidate.candidate.status === 'lobby' ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                        In Lobby (Ready)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                        <UserX size={10} /> Yet to Login
                      </span>
                    )}
                    {inspectingCandidate.candidate.violationsCount > 0 && (
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {inspectingCandidate.candidate.violationsCount} Flag(s)
                      </span>
                    )}
                  </div>
                  <div className={`text-xs ${textMuted} flex flex-wrap items-center gap-2`}>
                    <span>{inspectingCandidate.candidate.college}</span>
                    <span>•</span>
                    <span className="font-mono">{inspectingCandidate.candidate.email}</span>
                  </div>
                  {/* Team roster details if team */}
                  {inspectingCandidate.candidate.members && inspectingCandidate.candidate.members.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] font-mono text-slate-400">Team:</span>
                      {inspectingCandidate.candidate.members.map((m) => (
                        <span
                          key={m.id || m.email}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                        >
                          {m.fullName} ({m.email})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingCandidate(null)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${buttonSecondary}`}
                  title="Close modal"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {(() => {
                  const sub = inspectingCandidate.submission;
                  if (!sub) {
                    return (
                      <div className="text-center py-12">
                        <FileText size={40} className="mx-auto mb-3 opacity-30 text-blue-400" />
                        <h4 className="text-sm font-semibold mb-1">No Submission Recorded Yet</h4>
                        <p className={`text-xs ${textMuted} max-w-sm mx-auto`}>
                          This candidate is currently in state <strong>"{inspectingCandidate.candidate.status}"</strong>. Their detailed answer choices will appear here once they complete and submit the quiz.
                        </p>
                      </div>
                    );
                  }

                  const candidateQuestions: Question[] =
                    sub.question_snapshot && sub.question_snapshot.length > 0
                      ? sub.question_snapshot
                      : questions;

                  const answersMap = sub.answers || {};
                  const penalizedMap = sub.penalized_questions || {};

                  let correctCount = 0;
                  let incorrectCount = 0;
                  let penalizedCount = 0;

                  candidateQuestions.forEach((q, idx) => {
                    const ans = answersMap[idx];
                    const isPenalized = Boolean(penalizedMap[idx]);
                    if (isPenalized) penalizedCount += 1;
                    if (ans !== undefined && ans === q.correctAnswer && !isPenalized) {
                      correctCount += 1;
                    } else if (ans !== undefined) {
                      incorrectCount += 1;
                    }
                  });

                  return (
                    <>
                      {/* Summary Score Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className={`p-3 rounded-xl border text-center ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                        }`}>
                          <div className="text-[10px] font-mono text-slate-400 uppercase">Score</div>
                          <div className="text-xl font-mono font-bold text-emerald-400">
                            {sub.score} <span className="text-xs text-slate-400 font-normal">/ {candidateQuestions.length} pts</span>
                          </div>
                        </div>

                        <div className={`p-3 rounded-xl border text-center ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                        }`}>
                          <div className="text-[10px] font-mono text-slate-400 uppercase">Correct</div>
                          <div className="text-xl font-mono font-bold text-emerald-400">{correctCount}</div>
                        </div>

                        <div className={`p-3 rounded-xl border text-center ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                        }`}>
                          <div className="text-[10px] font-mono text-slate-400 uppercase">Incorrect</div>
                          <div className="text-xl font-mono font-bold text-rose-400">{incorrectCount}</div>
                        </div>

                        <div className={`p-3 rounded-xl border text-center ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                        }`}>
                          <div className="text-[10px] font-mono text-slate-400 uppercase">Penalties</div>
                          <div className={`text-xl font-mono font-bold ${penalizedCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {penalizedCount}
                          </div>
                        </div>
                      </div>

                      {/* Question by question list */}
                      <div className="space-y-3.5 pt-2">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
                          <span>Answer Audit ({candidateQuestions.length} Questions)</span>
                        </h4>

                        {candidateQuestions.map((q, qIndex) => {
                          const candidateChoice = answersMap[qIndex];
                          const isPenalized = Boolean(penalizedMap[qIndex]);
                          const isCorrect =
                            candidateChoice !== undefined && candidateChoice === q.correctAnswer && !isPenalized;
                          const isUnattempted = candidateChoice === undefined;

                          return (
                            <div
                              key={q.id || qIndex}
                              className={`p-4 rounded-xl border transition-all ${
                                isPenalized
                                  ? isLight ? 'bg-amber-50/60 border-amber-300' : 'bg-amber-950/20 border-amber-500/40'
                                  : isCorrect
                                  ? isLight ? 'bg-emerald-50/60 border-emerald-300' : 'bg-emerald-950/20 border-emerald-500/30'
                                  : isUnattempted
                                  ? isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                                  : isLight ? 'bg-rose-50/60 border-rose-300' : 'bg-rose-950/20 border-rose-500/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">
                                    Q#{qIndex + 1}
                                  </span>
                                  {q.category && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      {q.category}
                                    </span>
                                  )}
                                </div>

                                {isPenalized ? (
                                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                                    <AlertTriangle size={11} /> Flag Penalized (-1 pt)
                                  </span>
                                ) : isCorrect ? (
                                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                                    <CheckCircle2 size={11} /> Correct (+1 pt)
                                  </span>
                                ) : isUnattempted ? (
                                  <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 shrink-0">
                                    Unattempted
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shrink-0">
                                    <XCircle size={11} /> Incorrect (0 pts)
                                  </span>
                                )}
                              </div>

                              <p className={`text-xs sm:text-sm font-medium mb-3 leading-relaxed ${textPrimary}`}>
                                {q.question}
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {q.options.map((opt, optIdx) => {
                                  const isCorrectOpt = optIdx === q.correctAnswer;
                                  const isCandidatePick = candidateChoice === optIdx;

                                  let optClass = isLight
                                    ? 'bg-white border-slate-200 text-slate-700'
                                    : 'bg-slate-900/60 border-slate-800 text-slate-300';
                                  let tag = null;

                                  if (isCorrectOpt && isCandidatePick) {
                                    optClass = isLight
                                      ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-semibold'
                                      : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold';
                                    tag = (
                                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5 ml-auto">
                                        <Check size={11} /> Candidate Pick (Correct)
                                      </span>
                                    );
                                  } else if (isCorrectOpt) {
                                    optClass = isLight
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold';
                                    tag = (
                                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5 ml-auto">
                                        <Check size={11} /> Correct Answer
                                      </span>
                                    );
                                  } else if (isCandidatePick) {
                                    optClass = isLight
                                      ? 'bg-rose-100 border-rose-400 text-rose-900 font-semibold'
                                      : 'bg-rose-500/20 border-rose-500/60 text-rose-200 font-semibold';
                                    tag = (
                                      <span className="text-[10px] font-mono text-rose-400 flex items-center gap-0.5 ml-auto">
                                        <X size={11} /> Candidate Pick (Wrong)
                                      </span>
                                    );
                                  }

                                  return (
                                    <div
                                      key={optIdx}
                                      className={`p-2.5 rounded-lg border flex items-center gap-2 ${optClass}`}
                                    >
                                      <span className="w-5 h-5 rounded-md bg-black/10 dark:bg-white/10 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">
                                        {String.fromCharCode(65 + optIdx)}
                                      </span>
                                      <span className="flex-1 leading-snug">{opt}</span>
                                      {tag}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div
                className={`p-3.5 sm:p-4 border-t flex items-center justify-between gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleResetStudent(
                      inspectingCandidate.candidate.email,
                      inspectingCandidate.candidate.passcode
                    );
                    setInspectingCandidate(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer flex items-center gap-1.5 ${
                    isLight
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                  title="Grant re-round to this candidate"
                >
                  <RotateCcw size={13} />
                  <span>Allow Re-round</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectingCandidate(null)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${buttonSecondary}`}
                >
                  Close Audit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
