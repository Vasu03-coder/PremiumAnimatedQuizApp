import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ChevronRight,
  AlertTriangle,
  Radio,
  Cpu,
  Sparkles,
  Bell,
  Lock,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';
import type { Question, StudentProfile, ProctoringViolation } from '../types/quiz';
import {
  broadcastScoreUpdate,
  broadcastProctoringAlert,
  getOrCreateArenaChannel,
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
const CIRCLE_RADIUS = 26;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export default function QuizView({ student, questions, onCompleteQuiz }: QuizViewProps) {
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
        `Proctoring Violation Flagged: ${reason}. 0 marks awarded for Question ${currentIndex + 1}.`
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
      }, 7000);
    },
    [currentIndex, student]
  );

  // Listen for admin live broadcast messages and lock status
  useEffect(() => {
    const channel = getOrCreateArenaChannel();

    channel.on('broadcast', { event: 'admin_announcement' }, ({ payload }) => {
      if (payload?.message) {
        setAdminBroadcastMsg(payload.message);
        setTimeout(() => setAdminBroadcastMsg(null), 9000);
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
        handleCheatAttempt('screenshot', 'Screenshot capture attempt detected');
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === 'S' || e.key === 's' || e.key === '3' || e.key === '4')
      ) {
        handleCheatAttempt('screenshot', 'Snipping tool shortcut detected');
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

  // Countdown Timer
  useEffect(() => {
    if (isQuizPaused) return;

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
  }, [currentIndex, handleNextQuestion, isQuizPaused]);

  const handleSelectOption = (optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  };

  // Timer Circle Math
  const strokeDashoffset =
    CIRCLE_CIRCUMFERENCE - (timeLeft / SECONDS_PER_QUESTION) * CIRCLE_CIRCUMFERENCE;
  const isUrgent = timeLeft <= 15;
  const isMid = timeLeft <= 30 && timeLeft > 15;
  const timerStrokeColor = isUrgent ? '#EF4444' : isMid ? '#F59E0B' : '#00D2FF';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 relative">
      {/* Quiz Paused Overlay (if admin paused session) */}
      <AnimatePresence>
        {isQuizPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 rounded-3xl bg-midnight-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
              <Lock size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Quiz Session Paused</h3>
            <p className="text-sm text-slate-300 max-w-md">
              The symposium administrator has temporarily paused the quiz session. Your timer is frozen. The test will resume shortly.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Announcement Banner */}
      <AnimatePresence>
        {adminBroadcastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className="mb-5 p-4 rounded-2xl bg-indigo-950/85 border border-electric-cyan/40 text-electric-cyan text-sm flex items-center gap-3.5 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,210,255,0.25)]"
          >
            <div className="w-9 h-9 rounded-xl bg-electric-cyan/20 flex items-center justify-center shrink-0 text-electric-cyan">
              <Bell size={18} className="animate-bounce" />
            </div>
            <div className="flex-1 font-medium text-slate-100 leading-snug">
              <span className="font-bold text-electric-cyan uppercase tracking-wider text-xs block mb-0.5">
                Admin Announcement
              </span>
              {adminBroadcastMsg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proctoring Warning Notification */}
      <AnimatePresence>
        {activeWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="mb-5 p-4 rounded-2xl bg-red-950/90 border border-red-500/60 text-red-200 text-sm flex items-start gap-3 backdrop-blur-2xl shadow-[0_10px_35px_rgba(239,68,68,0.25)]"
          >
            <ShieldAlert size={22} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 font-medium leading-relaxed">{activeWarning}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CLAYMORPHIC + GLASSMORPHIC ASSESSMENT CONSOLE CARD */}
      <div className="clay-card-obsidian rounded-3xl p-6 sm:p-10 relative overflow-hidden">
        {/* Subtle Ambient Light Orbs behind content */}
        <div className="absolute -top-24 right-10 w-72 h-72 bg-electric-cyan/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 left-10 w-72 h-72 bg-electric-purple/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header Row: Candidate Info Pill + Prominent Animated Circular Timer */}
        <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
          {/* Candidate Profile Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-electric-blue/20 to-electric-purple/20 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan clay-badge">
              <Cpu size={22} />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>{student.full_name}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PROCTORED
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-0.5">
                {student.college || 'Engineering College'} • Question {currentIndex + 1} of {questions.length}
              </div>
            </div>
          </div>

          {/* HIGH-PRECISION ANIMATED CIRCULAR COUNTDOWN TIMER */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
              {/* Emergency pulsing aura when under 15 seconds */}
              {isUrgent && (
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0.1, 0.7] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-red-500/20 blur-md pointer-events-none"
                />
              )}

              <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 68 68">
                {/* Background Ring Track */}
                <circle
                  cx="34"
                  cy="34"
                  r={CIRCLE_RADIUS}
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="5"
                />
                {/* Dynamic Circular Progress Stroke */}
                <motion.circle
                  cx="34"
                  cy="34"
                  r={CIRCLE_RADIUS}
                  fill="transparent"
                  stroke={timerStrokeColor}
                  strokeWidth="5"
                  strokeDasharray={CIRCLE_CIRCUMFERENCE}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.9, ease: 'linear' }}
                  strokeLinecap="round"
                  style={{
                    filter: isUrgent
                      ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.85))'
                      : isMid
                      ? 'drop-shadow(0 0 7px rgba(245, 158, 11, 0.75))'
                      : 'drop-shadow(0 0 7px rgba(0, 210, 255, 0.7))',
                  }}
                />
              </svg>

              {/* Number and 'SEC' label inside the circular timer */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`font-mono font-extrabold text-base tracking-tight leading-none transition-colors ${
                    isUrgent ? 'text-red-400 animate-pulse text-lg' : 'text-white'
                  }`}
                >
                  {timeLeft}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mt-0.5">
                  SEC
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Liquid Progress Bar with Cyan Glow */}
        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-8 border border-white/5 relative">
          <motion.div
            className="h-full bg-gradient-to-r from-electric-blue via-electric-cyan to-electric-purple rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4 }}
            style={{
              boxShadow: '0 0 14px rgba(0, 210, 255, 0.7)',
            }}
          />
        </div>

        {/* Question Text with Animated Entrance */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25 }}
            className="mb-8"
          >
            {/* Category Tag and Penalty status */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-mono uppercase tracking-widest px-3.5 py-1 rounded-full bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan flex items-center gap-1.5 clay-badge">
                <Sparkles size={12} />
                {currentQ.category || 'ECE Core'}
              </span>

              {penalizedQuestions[currentIndex] && (
                <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 flex items-center gap-1 font-semibold animate-pulse">
                  <AlertTriangle size={12} />
                  Flagged: 0 Marks Awarded
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed tracking-tight">
              {currentQ.question}
            </h2>
          </motion.div>
        </AnimatePresence>

        {/* CLAYMORPHIC OPTIONS LIST */}
        <div className="space-y-3.5 mb-8">
          {currentQ.options.map((optionText, optIndex) => {
            const isSelected = answers[currentIndex] === optIndex;

            return (
              <motion.button
                key={optIndex}
                type="button"
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleSelectOption(optIndex)}
                className={`w-full text-left p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer relative overflow-hidden transition-all duration-200 ${
                  isSelected ? 'clay-button-selected' : 'clay-button-default'
                }`}
              >
                <div className="flex items-center gap-4 flex-1 z-10">
                  {/* Claymorphic Option Badge: A, B, C, D */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-all shrink-0 ${
                      isSelected
                        ? 'clay-badge-active'
                        : 'clay-badge bg-white/5 text-slate-300 border border-white/10'
                    }`}
                  >
                    {String.fromCharCode(65 + optIndex)}
                  </div>
                  <span
                    className={`text-sm sm:text-base leading-relaxed ${
                      isSelected ? 'text-white font-medium' : 'text-slate-200'
                    }`}
                  >
                    {optionText}
                  </span>
                </div>

                {/* Tactical Selection Indicator (NO answer reveal!) */}
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all z-10 ${
                    isSelected
                      ? 'border-electric-cyan bg-electric-cyan/20 shadow-[0_0_12px_rgba(0,210,255,0.6)]'
                      : 'border-white/20 bg-black/20'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="selectedIndicatorDot"
                      className="w-2.5 h-2.5 rounded-full bg-electric-cyan shadow-[0_0_8px_#00D2FF]"
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Bottom Navigation Row */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-mono text-center sm:text-left flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>Select an option before continuing. Selection locks upon advancing.</span>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: isAnswerSelected ? 1.02 : 1 }}
            whileTap={{ scale: isAnswerSelected ? 0.98 : 1 }}
            disabled={!isAnswerSelected}
            onClick={handleNextQuestion}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm text-midnight-950 flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isAnswerSelected
                ? 'clay-cta text-midnight-950'
                : 'bg-white/10 text-slate-400 border border-white/5 opacity-50 cursor-not-allowed'
            }`}
          >
            <span>{currentIndex === questions.length - 1 ? 'Submit Final Quiz' : 'Next Question'}</span>
            <ChevronRight size={18} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
