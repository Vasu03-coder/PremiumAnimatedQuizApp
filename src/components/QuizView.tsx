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
  CornerDownLeft
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

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 sm:py-6">
      {/* Quiz Paused Overlay */}
      <AnimatePresence>
        {isQuizPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
              <Lock size={26} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Quiz Temporarily Paused</h3>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              The test session has been paused by the administrator. The timer is currently frozen and will resume shortly.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Broadcast Banner */}
      <AnimatePresence>
        {adminBroadcastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3.5 rounded-xl bg-blue-950/70 border border-blue-500/30 text-blue-200 text-sm flex items-center gap-3 backdrop-blur-md"
          >
            <Bell size={18} className="text-blue-400 shrink-0" />
            <div className="flex-1 text-xs sm:text-sm">
              <span className="font-semibold text-blue-300 mr-2">Notice:</span>
              {adminBroadcastMsg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proctoring Warning Notification */}
      <AnimatePresence>
        {activeWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 backdrop-blur-md"
          >
            <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{activeWarning}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN PROFESSIONAL ASSESSMENT CARD */}
      <div className="surface-card rounded-2xl p-6 sm:p-8 relative">
        {/* Subtle Top Progress Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800/80 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header Bar: Candidate Info + Minimal Timer */}
        <div className="flex items-center justify-between gap-4 pb-5 mb-6 border-b border-white/[0.08]">
          {/* Candidate Profile */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center font-semibold text-xs text-slate-200 tracking-wide">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{student.full_name}</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Proctored
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {student.college || 'Engineering College'}
              </div>
            </div>
          </div>

          {/* Minimalist Professional Pill Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-colors ${
              isUrgent
                ? 'bg-red-500/10 border-red-500/40 text-red-300'
                : isMid
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
            }`}
          >
            <Clock size={15} className={isUrgent ? 'text-red-400' : 'text-slate-400'} />
            <span className="font-mono text-sm font-semibold tracking-tight">
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
            <span className="text-[10px] uppercase font-medium text-slate-400 tracking-wider">
              left
            </span>
          </div>
        </div>

        {/* Question Metadata & Question Text */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/50 text-slate-300">
                {currentQ.category || 'ECE Core'}
              </span>
            </div>

            {penalizedQuestions[currentIndex] && (
              <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-1 font-medium">
                <AlertTriangle size={12} />
                Flagged: 0 marks
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-slate-100 leading-snug tracking-tight">
            {currentQ.question}
          </h2>
        </div>

        {/* Clean, Interactive Options List */}
        <div className="space-y-2.5 mb-8">
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
                className={`w-full text-left p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-3.5 cursor-pointer outline-none ${
                  isSelected ? 'option-item-selected' : 'option-item'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Option Badge (A, B, C, D) */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-semibold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                    }`}
                  >
                    {letterLabel}
                  </div>

                  {/* Option Content Text */}
                  <span
                    className={`text-sm sm:text-base leading-relaxed transition-colors ${
                      isSelected ? 'text-white font-medium' : 'text-slate-300'
                    }`}
                  >
                    {optionText}
                  </span>
                </div>

                {/* Minimal Radio Check Indicator */}
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions Footer */}
        <div className="pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3.5">
          {/* Subtle Shortcut Hint */}
          <div className="text-xs text-slate-400 flex items-center gap-1.5 order-2 sm:order-1">
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
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition-all order-1 sm:order-2 ${
              isAnswerSelected
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-500 border border-slate-700/40 cursor-not-allowed opacity-60'
            }`}
          >
            <span>{currentIndex === questions.length - 1 ? 'Submit Assessment' : 'Next Question'}</span>
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] opacity-75 font-mono px-1 py-0.5 rounded bg-black/20 border border-white/10">
              <CornerDownLeft size={10} /> Enter
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

