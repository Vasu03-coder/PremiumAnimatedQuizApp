import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Home,
  Clock,
  Award,
  Trophy,
  Check,
  X,
  FileText,
  Radio,
  Users,
} from 'lucide-react';
import type { StudentProfile, QuizSubmission, Question } from '../types/quiz';
import {
  isResultsPublished,
  syncBroadcastChannel,
  getOrCreateArenaChannel,
  getCandidateSubmission,
} from '../lib/supabase';
import { INITIAL_QUESTIONS } from '../data/questions';

interface ResultViewProps {
  student: StudentProfile;
  totalQuestions: number;
  violationsCount: number;
  submission?: QuizSubmission | null;
  questions?: Question[];
  onHome: () => void;
}

export default function ResultView({
  student,
  totalQuestions,
  violationsCount,
  submission: propSubmission,
  questions: propQuestions,
  onHome,
}: ResultViewProps) {
  // Real-time published state
  const [isPublished, setIsPublished] = useState<boolean>(() => isResultsPublished());
  const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'incorrect'>('all');

  // Resolved submission (from props or local storage lookup)
  const resolvedSubmission =
    propSubmission ||
    getCandidateSubmission(student.email, student.passcode || student.registration_code);

  // Resolved question bank: snapshot from submission if available, else prop questions or default
  const resolvedQuestions: Question[] =
    resolvedSubmission?.question_snapshot && resolvedSubmission.question_snapshot.length > 0
      ? resolvedSubmission.question_snapshot
      : propQuestions && propQuestions.length > 0
      ? propQuestions
      : INITIAL_QUESTIONS;

  const finalTotalQuestions = resolvedSubmission?.total_questions || totalQuestions || resolvedQuestions.length || 20;
  const finalScore = resolvedSubmission?.score ?? 0;
  const finalViolations = resolvedSubmission?.violations_count ?? violationsCount;
  const answersMap = resolvedSubmission?.answers || {};
  const penalizedMap = resolvedSubmission?.penalized_questions || {};

  // Real-time broadcast listener for results publication toggle
  useEffect(() => {
    const handlePublishChange = (published: boolean) => {
      setIsPublished(published);
    };

    // 1. Cross-tab BroadcastChannel
    const bc = syncBroadcastChannel;
    let handleBroadcast: ((e: MessageEvent) => void) | null = null;
    if (bc) {
      handleBroadcast = (e: MessageEvent) => {
        if (e.data?.type === 'results_published_change') {
          handlePublishChange(Boolean(e.data.payload?.isPublished));
        }
      };
      bc.addEventListener('message', handleBroadcast);
    }

    // 2. CustomEvent on window
    const handleCustomEvent = (e: any) => {
      if (e.detail?.isPublished !== undefined) {
        handlePublishChange(Boolean(e.detail.isPublished));
      }
    };
    window.addEventListener('spark_results_published_change', handleCustomEvent);

    // 3. Supabase Realtime arena channel
    const ch = getOrCreateArenaChannel();
    ch.on('broadcast', { event: 'results_published_change' }, ({ payload }) => {
      if (payload?.isPublished !== undefined) {
        handlePublishChange(Boolean(payload.isPublished));
      }
    });

    return () => {
      if (bc && handleBroadcast) {
        bc.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('spark_results_published_change', handleCustomEvent);
    };
  }, []);

  const submissionTimestamp = resolvedSubmission?.completed_at
    ? new Date(resolvedSubmission.completed_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  // Calculate answer metrics
  let correctCount = 0;
  let incorrectCount = 0;
  let penalizedCount = 0;

  resolvedQuestions.forEach((q, idx) => {
    const candidateChoice = answersMap[idx];
    const isPenalized = Boolean(penalizedMap[idx]);
    if (isPenalized) {
      penalizedCount += 1;
    }
    if (candidateChoice !== undefined && candidateChoice === q.correctAnswer && !isPenalized) {
      correctCount += 1;
    } else if (candidateChoice !== undefined) {
      incorrectCount += 1;
    }
  });

  const accuracyPercent =
    finalTotalQuestions > 0 ? Math.round((Math.max(0, finalScore) / finalTotalQuestions) * 100) : 0;

  // Filtered questions for the review section
  const filteredQuestions = resolvedQuestions.map((q, idx) => ({ q, idx })).filter(({ q, idx }) => {
    const candidateChoice = answersMap[idx];
    const isPenalized = Boolean(penalizedMap[idx]);
    const isCorrect = candidateChoice !== undefined && candidateChoice === q.correctAnswer && !isPenalized;
    if (filterMode === 'correct') return isCorrect;
    if (filterMode === 'incorrect') return !isCorrect;
    return true;
  });

  return (
    <div className="w-full max-w-3xl mx-auto px-1 sm:px-4 py-2 sm:py-8">
      <AnimatePresence mode="wait">
        {!isPublished ? (
          /* ============================================================== */
          /* STATE 1: WAITING FOR ADMINISTRATOR TO PUBLISH RESULTS           */
          /* ============================================================== */
          <motion.div
            key="waiting_results"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="surface-card rounded-xl sm:rounded-3xl p-3.5 sm:p-8 text-center relative border border-white/[0.08] shadow-2xl overflow-hidden"
          >
            {/* Ambient background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

            {/* Waiting Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold mb-5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>ASSESSMENT SUBMITTED • RESULTS PENDING</span>
            </div>

            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 mb-4 shadow-inner">
              <Clock size={32} className="animate-pulse" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
              Waiting for Results
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
              Your responses have been successfully submitted and locked. The question review, correct answers, and final score will unlock automatically once the administrator publishes results.
            </p>

            {/* Candidate & Verification Card */}
            <div className="bg-slate-900/80 border border-white/[0.08] rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-6 text-left space-y-2.5 max-w-xl mx-auto">
              <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
                <span className="text-slate-400">Candidate / Team</span>
                <span className="font-semibold text-white">{student.full_name}</span>
              </div>

              {student.members && student.members.length > 0 && (
                <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
                  <span className="text-slate-400">Team Roster</span>
                  <span className="font-mono text-xs text-slate-300">
                    {student.members.map((m) => m.fullName).join(', ')}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
                <span className="text-slate-400">Registered Email</span>
                <span className="font-mono text-xs text-slate-200">{student.email}</span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
                <span className="text-slate-400">Passcode</span>
                <span className="font-mono text-xs text-blue-400 font-bold">
                  {student.passcode || student.registration_code || 'SPARK26002'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
                <span className="text-slate-400">College / Institute</span>
                <span className="text-slate-200 text-xs sm:text-sm truncate max-w-[240px]">
                  {student.college || 'Engineering College'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
                <span className="text-slate-400">Questions Completed</span>
                <span className="font-semibold text-xs sm:text-sm text-emerald-400">
                  {finalTotalQuestions} of {finalTotalQuestions} Attempted
                </span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-white/[0.06]">
                <span className="text-slate-400">Integrity Status</span>
                <span
                  className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                    finalViolations > 0
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {finalViolations > 0 ? `${finalViolations} Flag(s) Recorded` : 'Verified Clean'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-500">Submitted At</span>
                <span className="font-mono text-slate-400">{submissionTimestamp}</span>
              </div>
            </div>

            {/* Live Indicator Banner */}
            <div className="max-w-xl mx-auto p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-center gap-2.5 text-xs text-blue-300 font-mono mb-6">
              <Radio size={14} className="text-blue-400 animate-pulse" />
              <span>Realtime Connected • This screen will reveal results live when published.</span>
            </div>

            {/* Return Button */}
            <div className="max-w-xl mx-auto">
              <button
                type="button"
                onClick={onHome}
                className="w-full py-2.5 px-5 rounded-xl font-medium text-xs sm:text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home size={16} />
                <span>Return to Portal Home</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* ============================================================== */
          /* STATE 2: PUBLISHED RESULTS WITH FULL QUESTION-BY-QUESTION REVIEW*/
          /* ============================================================== */
          <motion.div
            key="published_results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Top Score Banner */}
            <div className="surface-card rounded-xl sm:rounded-3xl p-3.5 sm:p-8 text-center relative border border-emerald-500/30 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-emerald-500/15 blur-3xl pointer-events-none" />

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold mb-4">
                <Trophy size={14} className="text-emerald-400" />
                <span>OFFICIAL RESULTS PUBLISHED</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1">
                Assessment Results
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-6">
                Candidate: <strong className="text-white">{student.full_name}</strong>
                {student.team_name ? ` • Team: ${student.team_name}` : ''}
              </p>

              {/* Big Score Display */}
              <div className="inline-flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-emerald-500/40 shadow-inner mb-6 min-w-[200px]">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Final Score
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl sm:text-6xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                    {finalScore}
                  </span>
                  <span className="text-lg font-mono text-slate-400">/ {finalTotalQuestions} pts</span>
                </div>
                <div className="text-xs font-mono text-emerald-400 mt-1">
                  Accuracy: {accuracyPercent}%
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Correct</div>
                  <div className="text-lg font-mono font-bold text-emerald-400">{correctCount}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Incorrect</div>
                  <div className="text-lg font-mono font-bold text-rose-400">{incorrectCount}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Flags</div>
                  <div className={`text-lg font-mono font-bold ${finalViolations > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {finalViolations}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Penalized</div>
                  <div className={`text-lg font-mono font-bold ${penalizedCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {penalizedCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Question-by-Question Review Section */}
            <div className="surface-card rounded-xl sm:rounded-3xl p-2.5 sm:p-7 border border-white/[0.08] shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/[0.08]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <FileText size={18} className="text-blue-400" />
                    <span>Detailed Question & Answer Review</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review candidate selections alongside correct options and evaluation status
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/[0.08] text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({resolvedQuestions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('correct')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterMode === 'correct'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Correct ({correctCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('incorrect')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterMode === 'incorrect'
                        ? 'bg-rose-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Incorrect ({incorrectCount})
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredQuestions.map(({ q, idx }) => {
                  const candidateChoice = answersMap[idx];
                  const isPenalized = Boolean(penalizedMap[idx]);
                  const isCorrect =
                    candidateChoice !== undefined && candidateChoice === q.correctAnswer && !isPenalized;
                  const isUnattempted = candidateChoice === undefined;

                  return (
                    <div
                      key={q.id || idx}
                      className={`p-2.5 sm:p-5 rounded-xl border transition-all ${
                        isPenalized
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : isCorrect
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : isUnattempted
                          ? 'bg-slate-900/40 border-slate-800'
                          : 'bg-rose-950/20 border-rose-500/30'
                      }`}
                    >
                      {/* Question Header & Status Badge */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">
                            Question #{idx + 1}
                          </span>
                          {q.category && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              {q.category}
                            </span>
                          )}
                        </div>

                        {/* Result Badge */}
                        {isPenalized ? (
                          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                            <AlertTriangle size={12} /> Flag Penalized (-1 pt)
                          </span>
                        ) : isCorrect ? (
                          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={12} /> Correct (+1 pt)
                          </span>
                        ) : isUnattempted ? (
                          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                            Unattempted
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shrink-0">
                            <XCircle size={12} /> Incorrect (0 pts)
                          </span>
                        )}
                      </div>

                      {/* Question Text */}
                      <p className="text-xs sm:text-sm font-medium text-white mb-3.5 leading-relaxed">
                        {q.question}
                      </p>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, optIdx) => {
                          const isCorrectOption = optIdx === q.correctAnswer;
                          const isCandidatePick = candidateChoice === optIdx;

                          let optionStyle =
                            'bg-slate-900/60 border-white/[0.08] text-slate-300';
                          let tag = null;

                          if (isCorrectOption && isCandidatePick) {
                            optionStyle =
                              'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold ring-1 ring-emerald-500/40';
                            tag = (
                              <span className="text-[10px] font-mono text-emerald-300 flex items-center gap-0.5 ml-auto">
                                <Check size={11} /> Your Answer (Correct)
                              </span>
                            );
                          } else if (isCorrectOption) {
                            optionStyle =
                              'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold';
                            tag = (
                              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5 ml-auto">
                                <Check size={11} /> Correct Answer
                              </span>
                            );
                          } else if (isCandidatePick) {
                            optionStyle =
                              'bg-rose-500/20 border-rose-500/60 text-rose-200 font-semibold ring-1 ring-rose-500/40';
                            tag = (
                              <span className="text-[10px] font-mono text-rose-300 flex items-center gap-0.5 ml-auto">
                                <X size={11} /> Your Answer
                              </span>
                            );
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-lg border flex items-center gap-2 transition-all ${optionStyle}`}
                            >
                              <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">
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
            </div>

            {/* Return Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onHome}
                className="w-full py-3 px-5 rounded-xl font-medium text-xs sm:text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Home size={16} />
                <span>Return to Portal Home</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
