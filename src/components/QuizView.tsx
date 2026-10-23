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

  // Synchronized Quiz Start Schedule State
  const [schedule, setSchedule] = useState<QuizSchedulePayload>(() => getQuizSchedule());
  const [secondsUntilStart, setSecondsUntilStart] = useState<number>(() => {
    if (isDemoUser) return 0;
    const current = getQuizSchedule();
    if (!current.scheduledStartTime) return 0;
    const diff = Math.floor((new Date(current.scheduledStartTime).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
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
  const [isQuizPaused, setIsQuizPaused] = useState(false);

  // Periodically compute seconds remaining until scheduled start
  useEffect(() => {
    if (isBypassed) {
      setSecondsUntilStart(0);
      return;
    }

    const checkSchedule = () => {
      const current = getQuizSchedule();
      if (!current.scheduledStartTime) {
        setSecondsUntilStart(0);
        return;
      }
      const diff = Math.floor((new Date(current.scheduledStartTime).getTime() - Date.now()) / 1000);
      setSecondsUntilStart(Math.max(0, diff));
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 500);
    return () => clearInterval(interval);
  }, [schedule.scheduledStartTime, isBypassed]);

  // Realtime schedule update listener & cross-tab storage listener
  useEffect(() => {
    const channel = getOrCreateArenaChannel();

    channel.on('broadcast', { event: 'quiz_schedule_update' }, ({ payload }) => {
      if (payload) {
        setSchedule(payload);
        if (payload.scheduledStartTime) {
          const diff = Math.floor((new Date(payload.scheduledStartTime).getTime() - Date.now()) / 1000);
          setSecondsUntilStart(Math.max(0, diff));
        } else {
          setSecondsUntilStart(0);
        }
      }
    });

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spark_quiz_schedule' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          setSchedule(updated);
          if (updated.scheduledStartTime) {
            const diff = Math.floor((new Date(updated.scheduledStartTime).getTime() - Date.now()) / 1000);
            setSecondsUntilStart(Math.max(0, diff));
          } else {
            setSecondsUntilStart(0);
          }
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
        setIsQuizPaused(!payload.isQuizActive);
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

  // Countdown Timer for questions
  useEffect(() => {
    if (isQuizPaused || (!isBypassed && secondsUntilStart > 0)) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleNextQuestion();
          return SECONDS_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, handleNextQuestion, isQuizPaused, isBypassed, secondsUntilStart]);

  const handleSelectOption = (optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  };

  // Keyboard Navigation: keys 1-4, A-D for options, and Enter for Next Question
  useEffect(() => {
    const handleQuizKeyboard = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

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
  }, [answers, currentIndex, currentQ.options, handleNextQuestion]);

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

  // If the candidate is NOT bypassed and the scheduled start timer has not yet reached zero,
  // render the synchronized Waiting Room with live countdown lock!
  if (!isBypassed && secondsUntilStart > 0) {
    const minutes = Math.floor(secondsUntilStart / 60);
    const seconds = secondsUntilStart % 60;
    const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const targetTimeFormatted = schedule.scheduledStartTime
      ? new Date(schedule.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : null;

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
          {/* Top pulse badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>WAITING ROOM • SYNCHRONIZED START</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            SPARKTRON 2026 Assessment Arena
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6">
            The examination questions will automatically unlock when the administrator start timer reaches zero.
          </p>

          {/* Glowing Digital Countdown Clock */}
          <div className="my-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-blue-500/20 shadow-inner">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1">
              Time Until Quiz Unlocks
            </div>
            <div className="text-5xl sm:text-6xl md:text-7xl font-mono font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-cyan-400 drop-shadow-sm">
              {formattedCountdown}
            </div>
            {targetTimeFormatted && (
              <div className="text-xs text-slate-400 font-mono mt-2 flex items-center justify-center gap-1.5">
                <Clock size={13} className="text-blue-400" />
                <span>Scheduled Launch: {targetTimeFormatted}</span>
              </div>
            )}
          </div>

          {/* Candidate Card */}
          <div className="text-left p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              Verified Candidate Credentials
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
          </div>

          {/* Rules and Protocol notice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left mb-5">
            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-1">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span>Proctoring Armed</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tab switches, window defocus, and screenshots will be logged as violations.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-1">
                <Clock size={14} className="text-blue-400 shrink-0" />
                <span>60s / Question</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Each question has a 60-second limit and auto-submits when expired.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-1">
                <Zap size={14} className="text-amber-400 shrink-0" />
                <span>Auto Launch</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                No need to refresh the page. The questions unlock automatically.
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
      {/* Quiz Paused Overlay */}
      <AnimatePresence>
        {isQuizPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3 sm:mb-4">
              <Lock size={24} />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-1.5">Quiz Temporarily Paused</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
              The test session has been paused by the administrator. The timer is currently frozen and will resume shortly.
            </p>
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

