import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ChevronRight,
  AlertTriangle,
  Lock,
  Clock,
  ShieldCheck,
  Check,
  Bell,
  CornerDownLeft,
  Zap,
} from 'lucide-react';
import type { Question, StudentProfile, ProctoringViolation } from '../types/quiz';
import {
  broadcastScoreUpdate,
  broadcastProctoringAlert,
  getOrCreateArenaChannel,
  getQuizSchedule,
  syncBroadcastChannel,
  heartbeatPasscodeSession,
  type QuizSchedulePayload,
} from '../lib/supabase';

interface QuizViewProps {
  student: StudentProfile;
  questions: Question[];
  onCompleteQuiz: (results: {
    score: number;
    totalQuestions: number;
    answers: Record<number, number>;
    penalizedQuestions: Record<number, boolean>;
    violationsCount: number;
  }) => void;
}

const SECONDS_PER_QUESTION = 60;

export default function QuizView({ student, questions, onCompleteQuiz }: QuizViewProps) {
  // Demo tester check: Demo accounts or ?demo bypass the waiting room countdown completely
  const isDemoUser = Boolean(
    student.is_demo ||
    student.passcode === 'DEMO2026' ||
    student.passcode === 'SPARK-DEMO' ||
    student.email === 'demo@spark2026.com' ||
    (typeof window !== 'undefined' &&
      (window.location.search.includes('demo') || window.location.hash.includes('demo')))
  );

  const [hasTesterBypassed, setHasTesterBypassed] = useState(false);
  const isBypassed = isDemoUser || hasTesterBypassed;

  // Synchronized Quiz Session Schedule & State
  const [schedule, setSchedule] = useState<QuizSchedulePayload>(() => getQuizSchedule());
  const [countdownRemaining, setCountdownRemaining] = useState<number>(() => {
    const s = getQuizSchedule();
    if (s.state === 'countdown' && s.countdownEndTime) {
      return Math.max(0, Math.ceil((new Date(s.countdownEndTime).getTime() - Date.now()) / 1000));
    }
    return 10;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('selected=1')) {
      return { 0: 1 };
    }
    const empty: Record<number, number> = {};
    return empty;
  });
  const [penalizedQuestions, setPenalizedQuestions] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [violationsCount, setViolationsCount] = useState(0);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);
  const [adminBroadcastMsg, setAdminBroadcastMsg] = useState<string | null>(null);

  const questionStartRef = React.useRef<number>(Date.now());
  const isQuizPaused = schedule.state === 'paused' || !schedule.isQuizActive;
  const isLobby = schedule.state === 'lobby' && !isBypassed;
  const isCountdown = schedule.state === 'countdown' && !isBypassed;
  const isQuizActive = (schedule.state === 'in_progress' || isBypassed) && !isQuizPaused;

  // Synchronized schedule listener across BroadcastChannel, CustomEvent, and Supabase
  useEffect(() => {
    const handleUpdate = (updated: QuizSchedulePayload) => {
      if (!updated) return;
      setSchedule(updated);
      if (updated.state === 'countdown' && updated.countdownEndTime) {
        const diff = Math.max(0, Math.ceil((new Date(updated.countdownEndTime).getTime() - Date.now()) / 1000));
        setCountdownRemaining(diff);
      }
      if (updated.state === 'in_progress') {
        questionStartRef.current = Date.now();
      }
    };

    if (syncBroadcastChannel) {
      const handleBroadcast = (e: MessageEvent) => {
        if (e.data?.type === 'quiz_schedule_update') {
          handleUpdate(e.data.payload);
        }
      };
      syncBroadcastChannel.addEventListener('message', handleBroadcast);
    }

    const channel = getOrCreateArenaChannel();
    channel.on('broadcast', { event: 'quiz_schedule_update' }, ({ payload }) => {
      handleUpdate(payload);
    });

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spark_quiz_schedule' && e.newValue) {
        try {
          handleUpdate(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    const handleCustomEvent = (e: any) => {
      handleUpdate(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('spark_quiz_schedule_change', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('spark_quiz_schedule_change', handleCustomEvent);
    };
  }, []);

  // Heartbeat to prevent duplicate logins on other devices
  useEffect(() => {
    const passcode = (student.passcode || student.registration_code || '').toUpperCase();
    const sessionId =
      student.sessionId ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('spark_session_token') || '' : '');
    if (!passcode || !sessionId) return;

    heartbeatPasscodeSession(passcode, sessionId);
    const interval = setInterval(() => {
      heartbeatPasscodeSession(passcode, sessionId);
    }, 10000);

    return () => clearInterval(interval);
  }, [student.passcode, student.registration_code, student.sessionId]);

  // Synchronized 10-Second Countdown timer
  useEffect(() => {
    if (schedule.state !== 'countdown' || isBypassed) return;

    const interval = setInterval(() => {
      if (!schedule.countdownEndTime) {
        setCountdownRemaining((prev) => {
          if (prev <= 1) {
            setSchedule((cur) => ({ ...cur, state: 'in_progress', isQuizActive: true }));
            questionStartRef.current = Date.now();
            return 0;
          }
          return prev - 1;
        });
      } else {
        const diff = Math.ceil((new Date(schedule.countdownEndTime).getTime() - Date.now()) / 1000);
        if (diff <= 0) {
          setCountdownRemaining(0);
          setSchedule((cur) => ({ ...cur, state: 'in_progress', isQuizActive: true }));
          questionStartRef.current = Date.now();
        } else {
          setCountdownRemaining(diff);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [schedule.state, schedule.countdownEndTime, isBypassed]);

  // Reset per-question timestamp when question advances
  useEffect(() => {
    questionStartRef.current = Date.now();
    setTimeLeft(SECONDS_PER_QUESTION);
  }, [currentIndex]);

  const currentQ = questions[currentIndex] || questions[0];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const isAnswerSelected = answers[currentIndex] !== undefined;

  // Real-time broadcast helper
  const notifyScoreProgress = useCallback(
    (currentScore: number, questionNum: number) => {
      broadcastScoreUpdate({
        studentId: student.id || student.email,
        name: student.full_name,
        email: student.email,
        college: student.college || 'Engineering College',
        score: currentScore,
        currentQuestion: questionNum,
        totalQuestions: questions.length,
        violationsCount: violationsCount,
        status: 'active',
        lastSeen: new Date().toISOString(),
      });
    },
    [student, questions.length, violationsCount]
  );

  // Compute raw score considering penalties
  const calculateCurrentScore = useCallback(() => {
    let score = 0;
    Object.entries(answers).forEach(([qIdxStr, selectedOpt]) => {
      const qIdx = parseInt(qIdxStr, 10);
      const isPenalized = penalizedQuestions[qIdx];
      if (!isPenalized && questions[qIdx]?.correctAnswer === selectedOpt) {
        score += 1;
      }
    });
    return score;
  }, [answers, penalizedQuestions, questions]);

  // Trigger anti-cheat penalty
  const handleCheatAttempt = useCallback(
    (type: ProctoringViolation['violationType'], reason: string) => {
      setPenalizedQuestions((prev) => ({ ...prev, [currentIndex]: true }));
      setViolationsCount((prev) => prev + 1);
      setActiveWarning(
        `Proctoring Warning: ${reason}. 0 marks awarded for Question ${currentIndex + 1}.`
      );

      const violation: ProctoringViolation = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        studentName: student.full_name,
        studentEmail: student.email,
        violationType: type,
        questionIndex: currentIndex + 1,
        timestamp: new Date().toLocaleTimeString(),
        penaltyApplied: true,
      };
      broadcastProctoringAlert(violation);

      setTimeout(() => {
        setActiveWarning(null);
      }, 6000);
    },
    [currentIndex, student]
  );

  // Listen for admin live broadcast messages and lock status
  useEffect(() => {
    const channel = getOrCreateArenaChannel();

    channel.on('broadcast', { event: 'admin_announcement' }, ({ payload }) => {
      if (payload?.message) {
        setAdminBroadcastMsg(payload.message);
        setTimeout(() => setAdminBroadcastMsg(null), 8000);
      }
    });

    channel.on('broadcast', { event: 'quiz_status_change' }, ({ payload }) => {
      if (payload && typeof payload.isQuizActive === 'boolean') {
        setSchedule((prev) => ({
          ...prev,
          isQuizActive: payload.isQuizActive,
          state: payload.isQuizActive ? 'in_progress' : 'paused',
        }));
      }
    });

    channel.on('broadcast', { event: 'reset_student_session' }, ({ payload }) => {
      if (payload?.studentEmail && payload.studentEmail.toLowerCase() === student.email.toLowerCase()) {
        window.location.reload();
      }
    });
  }, [student.email]);

  // Anti-Cheat Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleCheatAttempt('tab_switch', 'Tab switch or window defocus detected');
      }
    };

    const handleWindowBlur = () => {
      handleCheatAttempt('window_blur', 'Exam window focus lost');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        handleCheatAttempt('screenshot', 'Screenshot attempt prevented');
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === 'S' || e.key === 's' || e.key === '3' || e.key === '4')
      ) {
        handleCheatAttempt('screenshot', 'Snipping shortcut prevented');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keyup', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keyup', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleCheatAttempt]);

  // Next Question Handler
  const handleNextQuestion = useCallback(() => {
    const nextScore = calculateCurrentScore();
    notifyScoreProgress(nextScore, currentIndex + 1);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setTimeLeft(SECONDS_PER_QUESTION);
    } else {
      const finalScore = calculateCurrentScore();
      onCompleteQuiz({
        score: finalScore,
        totalQuestions: questions.length,
        answers,
        penalizedQuestions,
        violationsCount,
      });
    }
  }, [calculateCurrentScore, currentIndex, notifyScoreProgress, onCompleteQuiz, questions.length, answers, penalizedQuestions, violationsCount]);

  // Drift-free Countdown Timer for questions
  useEffect(() => {
    if (!isQuizActive) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000);
      const remaining = Math.max(0, SECONDS_PER_QUESTION - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        handleNextQuestion();
      }
    }, 250);

    return () => clearInterval(timer);
  }, [currentIndex, handleNextQuestion, isQuizActive]);

  const handleSelectOption = (optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  };

  // Keyboard Navigation: keys 1-4, A-D for options, and Enter for Next Question
  useEffect(() => {
    const handleQuizKeyboard = (e: KeyboardEvent) => {
      // Ignore if typing in an input or if quiz is paused
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (isQuizPaused) return;

      const key = e.key.toLowerCase();
      if (key === '1' || key === 'a') {
        if (currentQ.options[0]) handleSelectOption(0);
      } else if (key === '2' || key === 'b') {
        if (currentQ.options[1]) handleSelectOption(1);
      } else if (key === '3' || key === 'c') {
        if (currentQ.options[2]) handleSelectOption(2);
      } else if (key === '4' || key === 'd') {
        if (currentQ.options[3]) handleSelectOption(3);
      } else if (e.key === 'Enter') {
        if (answers[currentIndex] !== undefined) {
          e.preventDefault();
          handleNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleQuizKeyboard);
    return () => window.removeEventListener('keydown', handleQuizKeyboard);
  }, [answers, currentIndex, currentQ.options, handleNextQuestion, isQuizPaused]);

  const isUrgent = timeLeft <= 15;
  const isMid = timeLeft <= 30 && timeLeft > 15;

  // Format candidate initials
  const initials = (student.full_name || 'Candidate')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // 1. Synchronized 10-Second Countdown Screen
  if (isCountdown) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="surface-card rounded-3xl p-8 sm:p-12 relative shadow-2xl border border-blue-500/30 overflow-hidden"
        >
          {/* Animated background glow rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-mono font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>ASSESSMENT COMMENCING</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            Get Ready, {student.full_name}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto mb-8">
            The administrator has initiated the session. All questions unlock simultaneously.
          </p>

          {/* Giant Countdown Digits */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-b from-blue-600/20 to-slate-900 border-2 border-blue-500/40 flex items-center justify-center shadow-inner shadow-blue-500/30">
              <motion.span
                key={countdownRemaining}
                initial={{ scale: 1.4, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-7xl sm:text-8xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-200 to-blue-400"
              >
                {countdownRemaining}
              </motion.span>
            </div>
          </div>

          <p className="text-xs font-mono text-blue-400 mt-6 animate-pulse">
            Starting in {countdownRemaining} second{countdownRemaining !== 1 ? 's' : ''}...
          </p>
        </motion.div>
      </div>
    );
  }

  // 2. Student Waiting Lobby Screen (Admin has not started quiz yet)
  if (isLobby) {
    return (
      <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Admin Broadcast Banner */}
        <AnimatePresence>
          {adminBroadcastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 rounded-xl bg-blue-950/70 border border-blue-500/30 text-blue-200 text-xs sm:text-sm flex items-center gap-2.5 backdrop-blur-md"
            >
              <Bell size={16} className="text-blue-400 shrink-0" />
              <div className="flex-1 text-xs sm:text-sm">
                <span className="font-semibold text-blue-300 mr-1.5">Announcement:</span>
                {adminBroadcastMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="surface-card rounded-2xl p-5 sm:p-8 relative shadow-2xl border border-white/10 text-center">
          {/* Paused Alert Banner in Lobby */}
          {isQuizPaused && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-center justify-center gap-2">
              <Lock size={16} className="text-amber-400 shrink-0" />
              <span className="font-semibold text-amber-300">Quiz is currently PAUSED by Administrator.</span>
            </div>
          )}

          {/* Top pulse badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>CONNECTED & READY IN LOBBY</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            SPARKTRON 2026 Assessment Arena
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6">
            Waiting for the administrator / host to start the quiz. Please remain on this screen.
          </p>

          {/* Animated Waiting Radar Box */}
          <div className="my-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-emerald-500/20 shadow-inner">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative flex items-center justify-center mb-4">
                <span className="absolute w-20 h-20 rounded-full bg-emerald-500/20 animate-ping" />
                <span className="absolute w-14 h-14 rounded-full bg-emerald-500/30 animate-pulse" />
                <div className="relative w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={24} />
                </div>
              </div>

              <div className="text-base sm:text-lg font-semibold text-white tracking-tight">
                Candidate Registered & In Waiting Room
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                The session will begin simultaneously for all candidates as soon as the host launches the assessment.
              </p>
            </div>
          </div>

          {/* Candidate / Team Card */}
          <div className="text-left p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              Verified Team Credentials
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>{student.full_name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Ready
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2 font-mono">
                  <span>Passcode: <strong className="text-blue-400">{student.passcode || student.registration_code}</strong></span>
                  <span>•</span>
                  <span>{student.email}</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 sm:text-right">
                <div className="font-medium text-slate-300">{student.college || 'Engineering College'}</div>
                <div className="text-[11px] text-slate-400">{student.department || 'ECE Department'}</div>
              </div>
            </div>

            {student.members && student.members.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] text-slate-400 font-mono">Team Roster:</span>
                {student.members.map((m) => (
                  <span
                    key={m.id || m.email}
                    className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30 text-[11px] font-mono flex items-center gap-1"
                  >
                    <span>{m.isLeader ? `👑 ${m.fullName}` : `👤 ${m.fullName}`}</span>
                    {m.year && <span className="text-slate-400 text-[10px]">({m.year})</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rules and Protocol notice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left mb-5">
            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-1">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span>Anti-Cheat Armed</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tab switches, window defocus, and screenshots are monitored in real time.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-1">
                <Clock size={14} className="text-blue-400 shrink-0" />
                <span>60s / Question</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Each question has a strict 60-second limit and auto-submits when expired.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-1">
                <Zap size={14} className="text-amber-400 shrink-0" />
                <span>Shuffled Paper</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Questions and multiple-choice options are uniquely randomized per candidate.
              </p>
            </div>
          </div>

          {/* Tester bypass option */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime cloud sync connected</span>
            </div>
            <button
              type="button"
              onClick={() => setHasTesterBypassed(true)}
              className="text-[11px] text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer transition-colors"
            >
              Examiner Test: Skip Waiting Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 py-2 sm:py-6">
      {/* Quiz Paused Overlay (Freezes entire test view immediately) */}
      <AnimatePresence>
        {isQuizPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none cursor-not-allowed pointer-events-auto"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-4 shadow-xl shadow-amber-500/10">
              <Lock size={34} className="animate-pulse" />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              SESSION PAUSED BY ADMINISTRATOR
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
              Assessment Temporarily Frozen
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mb-5">
              The administrator has paused the quiz session. Your answers, question progress, and remaining time are securely preserved.
            </p>
            <div className="text-[11px] font-mono text-slate-400 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <Clock size={14} className="text-amber-400 shrink-0" />
              <span>Questions will automatically unfreeze when the administrator resumes the quiz.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Broadcast Banner */}
      <AnimatePresence>
        {adminBroadcastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-2.5 sm:mb-4 p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-blue-950/70 border border-blue-500/30 text-blue-200 text-xs sm:text-sm flex items-center gap-2.5 backdrop-blur-md"
          >
            <Bell size={16} className="text-blue-400 shrink-0" />
            <div className="flex-1 text-xs sm:text-sm">
              <span className="font-semibold text-blue-300 mr-1.5">Notice:</span>
              {adminBroadcastMsg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proctoring Warning Notification */}
      <AnimatePresence>
        {activeWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-2.5 sm:mb-4 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-start gap-2 backdrop-blur-md"
          >
            <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{activeWarning}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN PROFESSIONAL ASSESSMENT CARD */}
      <div className="surface-card rounded-xl sm:rounded-2xl p-3.5 sm:p-7 relative shadow-2xl">
        {/* Subtle Top Progress Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800/80 rounded-t-xl sm:rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header Bar: Candidate Info + Minimal Timer */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 sm:pb-5 sm:mb-5 border-b border-white/[0.08]">
          {/* Candidate Profile */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center font-semibold text-xs text-slate-200 tracking-wide shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-[130px] sm:max-w-none">
                  {student.full_name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Proctored
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[130px] sm:max-w-none">
                {student.college || 'Engineering College'}
              </div>
            </div>
          </div>

          {/* Minimalist Professional Pill Timer */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border transition-colors shrink-0 ${
              isUrgent
                ? 'bg-red-500/10 border-red-500/40 text-red-300'
                : isMid
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
            }`}
          >
            <Clock size={13} className={isUrgent ? 'text-red-400' : 'text-slate-400'} />
            <span className="font-mono text-xs sm:text-sm font-semibold tracking-tight">
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-medium text-slate-400 tracking-wider">
              left
            </span>
          </div>
        </div>

        {/* Question Metadata & Question Text */}
        <div className="mb-3.5 sm:mb-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-medium text-slate-400">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/50 text-slate-300">
                {currentQ.category || 'ECE Core'}
              </span>
            </div>

            {penalizedQuestions[currentIndex] && (
              <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-1 font-medium">
                <AlertTriangle size={11} />
                Flagged
              </span>
            )}
          </div>

          <h2 className="text-sm sm:text-base md:text-lg font-semibold text-slate-100 leading-snug tracking-tight">
            {currentQ.question}
          </h2>
        </div>

        {/* Clean, Interactive Options List */}
        <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-6">
          {currentQ.options.map((optionText, optIndex) => {
            const isSelected = answers[currentIndex] === optIndex;
            const letterLabel = String.fromCharCode(65 + optIndex);

            return (
              <div
                key={optIndex}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectOption(optIndex)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectOption(optIndex);
                  }
                }}
                className={`w-full text-left p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer outline-none transition-all ${
                  isSelected ? 'option-item-selected' : 'option-item'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                  {/* Option Badge (A, B, C, D) */}
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center font-mono text-xs font-semibold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                    }`}
                  >
                    {letterLabel}
                  </div>

                  {/* Option Content Text */}
                  <span
                    className={`text-xs sm:text-sm leading-snug sm:leading-relaxed transition-colors ${
                      isSelected ? 'text-white font-medium' : 'text-slate-300'
                    }`}
                  >
                    {optionText}
                  </span>
                </div>

                {/* Minimal Radio Check Indicator */}
                <div
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {isSelected && <Check size={10} strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions Footer */}
        <div className="pt-3 sm:pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
          {/* Subtle Shortcut Hint - hidden on mobile */}
          <div className="hidden sm:flex text-xs text-slate-400 items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>
              Press <kbd className="font-mono text-[11px] px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">1-4</kbd> or <kbd className="font-mono text-[11px] px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">A-D</kbd> to select
            </span>
          </div>

          {/* Next / Submit Button */}
          <button
            type="button"
            disabled={!isAnswerSelected}
            onClick={handleNextQuestion}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isAnswerSelected
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-500 border border-slate-700/40 cursor-not-allowed opacity-60'
            }`}
          >
            <span>{currentIndex === questions.length - 1 ? 'Submit Assessment' : 'Next Question'}</span>
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] opacity-75 font-mono px-1 py-0.5 rounded bg-black/20 border border-white/10">
              <CornerDownLeft size={10} /> Enter
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

