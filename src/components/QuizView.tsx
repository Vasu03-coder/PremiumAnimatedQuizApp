import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ShieldAlert, ChevronRight, AlertTriangle, CheckCircle2, Award } from 'lucide-react';
import type { Question, StudentProfile, ProctoringViolation } from '../types/quiz';
import { broadcastScoreUpdate, broadcastProctoringAlert } from '../lib/supabase';

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
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [penalizedQuestions, setPenalizedQuestions] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [violationsCount, setViolationsCount] = useState(0);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);

  const currentQ = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const isAnswerSelected = answers[currentIndex] !== undefined;

  // Real-time broadcast helper
  const notifyScoreProgress = useCallback((currentScore: number, questionNum: number) => {
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
  }, [student, questions.length, violationsCount]);

  // Compute raw score considering penalties
  const calculateCurrentScore = useCallback(() => {
    let score = 0;
    Object.entries(answers).forEach(([qIdxStr, selectedOpt]) => {
      const qIdx = parseInt(qIdxStr, 10);
      const isPenalized = penalizedQuestions[qIdx];
      // If penalized, mark is strictly 0!
      if (!isPenalized && questions[qIdx]?.correctAnswer === selectedOpt) {
        score += 1;
      }
    });
    return score;
  }, [answers, penalizedQuestions, questions]);

  // Trigger anti-cheat penalty
  const handleCheatAttempt = useCallback((type: ProctoringViolation['violationType'], reason: string) => {
    // Penalize current question: 0 marks
    setPenalizedQuestions((prev) => ({ ...prev, [currentIndex]: true }));
    setViolationsCount((prev) => prev + 1);
    setActiveWarning(`Proctoring Alert: ${reason}. Zero marks will be awarded for Question ${currentIndex + 1}.`);

    // Broadcast violation instantly to Admin
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

    // Auto-dismiss warning after 6 seconds
    setTimeout(() => {
      setActiveWarning(null);
    }, 6000);
  }, [currentIndex, student]);

  // --- Anti-Cheat Listeners ---
  useEffect(() => {
    // 1. Tab switch or window minimized
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleCheatAttempt('tab_switch', 'Tab switch or window defocus detected');
      }
    };

    // 2. Window blur (switching application/screen)
    const handleWindowBlur = () => {
      handleCheatAttempt('window_blur', 'Window lost focus');
    };

    // 3. Screenshot & DevTools shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        handleCheatAttempt('screenshot', 'Screenshot capture attempt detected');
      }
      // Windows + Shift + S or Cmd + Shift + 3/4
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's' || e.key === '3' || e.key === '4')) {
        handleCheatAttempt('screenshot', 'Snipping tool shortcut detected');
      }
    };

    // 4. Disable right click context menu during test
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

  // --- Countdown Timer per question ---
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time expired for this question, auto advance
          handleNextQuestion();
          return SECONDS_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, answers]);

  // Handle selecting an option: DO NOT SHOW CORRECT/INCORRECT ANSWER
  const handleSelectOption = (optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  };

  // Next Question or Finish
  const handleNextQuestion = () => {
    const nextScore = calculateCurrentScore();
    notifyScoreProgress(nextScore, currentIndex + 1);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setTimeLeft(SECONDS_PER_QUESTION);
    } else {
      // Quiz Completed
      const finalScore = calculateCurrentScore();
      onCompleteQuiz({
        score: finalScore,
        totalQuestions: questions.length,
        answers,
        penalizedQuestions,
        violationsCount,
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-0 py-6">
      {/* Top Header Bar with Glassmorphism */}
      <div className="glass-panel-dark rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-electric-cyan uppercase mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Session • {student.full_name}
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-bright-white">
            SPARKTRON 2026 ECE Technical Quiz
          </h1>
        </div>

        {/* Timer & Question Tracker */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <div className="text-[11px] font-mono text-muted-text uppercase">Progress</div>
            <div className="font-mono text-sm font-semibold text-bright-white">
              Q {currentIndex + 1} of {questions.length}
            </div>
          </div>

          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-base font-bold tracking-wider border transition-colors ${
              timeLeft <= 15
                ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse'
                : 'bg-white/5 border-white/10 text-electric-cyan'
            }`}
          >
            <Clock size={16} />
            <span>00:{timeLeft.toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-1.5 bg-midnight-900 rounded-full overflow-hidden mb-6 border border-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-electric-blue via-electric-cyan to-electric-purple"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Proctoring Warning Notification */}
      <AnimatePresence>
        {activeWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="mb-6 p-4 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-sm flex items-start gap-3 backdrop-blur-xl shadow-lg"
          >
            <ShieldAlert size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{activeWarning}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Question Card with Glassmorphism */}
      <div className="glass-panel-dark rounded-2xl p-6 sm:p-10 relative overflow-hidden">
        {/* Subtle Category Badge */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <span className="text-xs font-mono font-medium text-electric-cyan/90 bg-electric-cyan/10 border border-electric-cyan/25 px-3 py-1 rounded-full uppercase tracking-wider">
            {currentQ.category || 'ECE Electronics'}
          </span>
          {penalizedQuestions[currentIndex] && (
            <span className="text-xs font-mono font-medium text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Penalized (0 Marks)
            </span>
          )}
        </div>

        {/* Question Text */}
        <h2 className="text-xl sm:text-2xl font-semibold text-bright-white leading-relaxed mb-8">
          {currentQ.question}
        </h2>

        {/* Options List - STRICT NO ANSWER REVELATION */}
        <div className="space-y-3.5 mb-10">
          {currentQ.options.map((optionText, optIndex) => {
            const isSelected = answers[currentIndex] === optIndex;

            return (
              <button
                key={optIndex}
                type="button"
                onClick={() => handleSelectOption(optIndex)}
                className={`w-full text-left p-4 sm:p-5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer ${
                  isSelected
                    ? 'bg-electric-cyan/10 border-electric-cyan shadow-[0_0_20px_rgba(56,225,255,0.2)]'
                    : 'glass-card-dark hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-sm font-semibold transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-electric-cyan text-midnight-950 font-bold'
                        : 'bg-white/5 text-muted-text border border-white/10'
                    }`}
                  >
                    {String.fromCharCode(65 + optIndex)}
                  </div>
                  <span className={`text-base leading-relaxed ${isSelected ? 'text-bright-white font-medium' : 'text-bright-white/90'}`}>
                    {optionText}
                  </span>
                </div>

                {/* Radio selection indicator */}
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'border-electric-cyan bg-electric-cyan/20' : 'border-white/20'
                  }`}
                >
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-electric-cyan" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Bar: Navigation & Instructions */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-subtle-text font-mono text-center sm:text-left">
            * You must select an option before proceeding. Answers cannot be changed once submitted.
          </div>

          <button
            type="button"
            disabled={!isAnswerSelected}
            onClick={handleNextQuestion}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-medium text-sm text-midnight-950 bg-gradient-to-r from-electric-blue to-electric-cyan hover:from-electric-cyan hover:to-electric-blue shadow-[0_0_20px_rgba(56,225,255,0.25)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-sans"
          >
            <span>{currentIndex === questions.length - 1 ? 'Submit Final Quiz' : 'Next Question'}</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
