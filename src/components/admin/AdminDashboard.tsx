import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Trophy,
  ShieldAlert,
  HelpCircle,
  Download,
  Plus,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Radio,
  Trash2,
  Sliders,
  ExternalLink
} from 'lucide-react';
import type { Question, LiveStudentStatus, ProctoringViolation, QuizSubmission } from '../../types/quiz';
import { supabase, subscribeToQuizArena } from '../../lib/supabase';

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
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'proctoring' | 'questions'>('leaderboard');
  const [students, setStudents] = useState<Record<string, LiveStudentStatus>>({});
  const [violations, setViolations] = useState<ProctoringViolation[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // New Question Form State
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectAnswer, setNewCorrectAnswer] = useState(0);
  const [newCategory, setNewCategory] = useState('ECE Core');

  // Load existing participants from Supabase on mount to pre-populate list
  useEffect(() => {
    async function loadSupabaseParticipants() {
      try {
        const { data: participants } = await supabase
          .from('participants')
          .select('id, full_name, email, college, department, created_at')
          .limit(20);

        if (participants && participants.length > 0) {
          const initialMap: Record<string, LiveStudentStatus> = {};
          participants.forEach((p, idx) => {
            const rawEmail = p.email || `participant_${p.id || idx}@symposium.local`;
            const key = rawEmail.toLowerCase();
            initialMap[key] = {
              studentId: p.id || String(idx),
              name: p.full_name || 'Participant',
              email: rawEmail,
              college: p.college || 'Engineering College',
              currentQuestion: 1,
              totalQuestions: questions.length,
              score: 0,
              violationsCount: 0,
              status: 'active',
              lastSeen: p.created_at || new Date().toISOString(),
            };
          });

          // Check if any stored submissions exist in localStorage
          try {
            const savedSubmissions: QuizSubmission[] = JSON.parse(
              localStorage.getItem('spark_quiz_submissions') || '[]'
            );
            if (Array.isArray(savedSubmissions)) {
              savedSubmissions.forEach((sub) => {
                if (!sub || !sub.participant_email) return;
                const key = sub.participant_email.toLowerCase();
                initialMap[key] = {
                  studentId: sub.id || key,
                  name: sub.participant_name || 'Participant',
                  email: sub.participant_email,
                  college: 'Engineering College',
                  currentQuestion: sub.total_questions || questions.length,
                  totalQuestions: sub.total_questions || questions.length,
                  score: sub.score || 0,
                  violationsCount: sub.violations_count || 0,
                  status: 'completed',
                  lastSeen: sub.completed_at || new Date().toISOString(),
                  completedAt: sub.completed_at,
                };
              });
            }
          } catch (e) {
            console.error('Error reading saved submissions:', e);
          }

          setStudents(initialMap);
        }
      } catch (err) {
        console.error('Error fetching participants:', err);
      }
    }

    loadSupabaseParticipants();
  }, [questions.length]);

  // Supabase Realtime Listener (Safe subscription without duplicate joins)
  useEffect(() => {
    const unsubscribe = subscribeToQuizArena({
      onStudentJoined: (payload) => {
        if (!payload || !payload.email) return;
        const key = payload.email.toLowerCase();
        setStudents((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || {}),
            ...payload,
            status: 'active',
          },
        }));
      },
      onScoreUpdate: (payload) => {
        if (!payload || !payload.email) return;
        const key = payload.email.toLowerCase();
        setStudents((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || {
              studentId: payload.studentId || key,
              name: payload.name || 'Candidate',
              email: payload.email,
              college: payload.college || 'Engineering College',
              totalQuestions: payload.totalQuestions || questions.length,
            }),
            score: payload.score ?? 0,
            currentQuestion: payload.currentQuestion ?? 1,
            violationsCount: payload.violationsCount ?? prev[key]?.violationsCount ?? 0,
            status: payload.status || 'active',
            lastSeen: new Date().toISOString(),
          },
        }));
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
        setStudents((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || {
              studentId: payload.id || key,
              name: payload.participant_name || 'Candidate',
              email: payload.participant_email,
              college: 'Engineering College',
              totalQuestions: payload.total_questions || questions.length,
            }),
            score: payload.score ?? 0,
            currentQuestion: payload.total_questions || questions.length,
            violationsCount: payload.violations_count ?? 0,
            status: 'completed',
            completedAt: payload.completed_at || new Date().toISOString(),
          },
        }));
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
    // 1. Highest score first
    if (b.score !== a.score) return b.score - a.score;
    // 2. Fewest violations
    if (a.violationsCount !== b.violationsCount) return a.violationsCount - b.violationsCount;
    // 3. Alphabetical
    return a.name.localeCompare(b.name);
  });

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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sparktron_Leaderboard_${Date.now()}.csv`);
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="glass-panel-dark rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono font-medium text-electric-cyan bg-electric-cyan/10 border border-electric-cyan/30 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Radio size={12} className={isConnected ? 'text-emerald-400 animate-pulse' : 'text-red-400'} />
              {isConnected ? 'Supabase Realtime Synced' : 'Connecting Realtime...'}
            </span>
            <span className="text-xs font-mono text-subtle-text">Port: 8443</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-bright-white">
            Symposium Admin Control Deck
          </h1>
          <p className="text-sm text-muted-text">
            Real-time participant presence, animated rankings, and proctoring telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-semibold text-bright-white glass-card-interactive flex items-center gap-2 cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-semibold text-red-400 glass-card-interactive border-red-500/20 hover:border-red-500/40 flex items-center gap-2 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Exit Deck</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card-dark rounded-xl p-5">
          <div className="flex items-center justify-between text-muted-text text-xs font-mono mb-2">
            <span>REGISTERED</span>
            <Users size={16} className="text-electric-cyan" />
          </div>
          <div className="text-3xl font-bold font-mono text-bright-white">
            {leaderboardList.length}
          </div>
        </div>

        <div className="glass-card-dark rounded-xl p-5">
          <div className="flex items-center justify-between text-muted-text text-xs font-mono mb-2">
            <span>ACTIVE CANDIDATES</span>
            <Radio size={16} className="text-emerald-400 animate-pulse" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">
            {activeCount}
          </div>
        </div>

        <div className="glass-card-dark rounded-xl p-5">
          <div className="flex items-center justify-between text-muted-text text-xs font-mono mb-2">
            <span>COMPLETED</span>
            <CheckCircle2 size={16} className="text-electric-blue" />
          </div>
          <div className="text-3xl font-bold font-mono text-electric-blue">
            {completedCount}
          </div>
        </div>

        <div className="glass-card-dark rounded-xl p-5">
          <div className="flex items-center justify-between text-muted-text text-xs font-mono mb-2">
            <span>PROCTORING FLAGS</span>
            <ShieldAlert size={16} className="text-red-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-red-400">
            {violations.length}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'leaderboard'
              ? 'bg-electric-cyan/15 text-electric-cyan border border-electric-cyan/40'
              : 'text-muted-text hover:text-bright-white'
          }`}
        >
          <Trophy size={16} />
          <span>Live Dynamic Leaderboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('proctoring')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'proctoring'
              ? 'bg-red-500/15 text-red-400 border border-red-500/40'
              : 'text-muted-text hover:text-bright-white'
          }`}
        >
          <ShieldAlert size={16} />
          <span>Proctoring Alert Feed ({violations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'questions'
              ? 'bg-electric-purple/15 text-electric-purple border border-electric-purple/40'
              : 'text-muted-text hover:text-bright-white'
          }`}
        >
          <HelpCircle size={16} />
          <span>Question Management ({questions.length})</span>
        </button>
      </div>

      {/* TAB 1: Live Animated Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="glass-panel-dark rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-bright-white flex items-center gap-2">
                <Flame className="text-amber-400" size={20} />
                Live Animated Standings (Zero Refresh)
              </h2>
              <p className="text-xs text-muted-text">
                Candidates smoothly reorder in real-time as answers and scores update
              </p>
            </div>
          </div>

          {leaderboardList.length === 0 ? (
            <div className="text-center py-16 text-muted-text">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No candidates have entered the arena yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* AnimatePresence + motion.div with layout prop for smooth reordering */}
              <AnimatePresence>
                {leaderboardList.map((student, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3;
                  const rankBadge =
                    rank === 1
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                      : rank === 2
                      ? 'bg-slate-300/20 text-slate-200 border-slate-300/50'
                      : rank === 3
                      ? 'bg-amber-700/20 text-amber-500 border-amber-700/50'
                      : 'bg-white/5 text-muted-text border-white/10';

                  return (
                    <motion.div
                      key={student.email}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      className={`p-4 sm:p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                        isTop3
                          ? 'bg-midnight-800/80 border-electric-cyan/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                          : 'glass-card-dark'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Rank Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono font-bold text-sm shrink-0 ${rankBadge}`}
                        >
                          #{rank}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-bright-white text-base">
                              {student.name}
                            </span>
                            {student.status === 'active' && (
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online & Active" />
                            )}
                            {student.violationsCount > 0 && (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                                <AlertTriangle size={10} />
                                {student.violationsCount} Flag(s)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-text flex items-center gap-3 mt-0.5">
                            <span>{student.college}</span>
                            <span>•</span>
                            <span className="font-mono text-subtle-text">{student.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score and Progress */}
                      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-left sm:text-right">
                          <div className="text-[10px] font-mono text-subtle-text uppercase">Progress</div>
                          <div className="text-xs font-mono font-medium text-electric-cyan">
                            Q {student.currentQuestion} / {student.totalQuestions}
                          </div>
                        </div>

                        <div className="text-right min-w-[70px]">
                          <div className="text-[10px] font-mono text-subtle-text uppercase">Score</div>
                          <div className="text-2xl font-mono font-bold text-bright-white">
                            {student.score}
                            <span className="text-xs text-muted-text font-normal"> pts</span>
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

      {/* TAB 2: Proctoring Alert Feed */}
      {activeTab === 'proctoring' && (
        <div className="glass-panel-dark rounded-2xl p-6">
          <h2 className="text-lg font-bold text-bright-white mb-2 flex items-center gap-2">
            <ShieldAlert className="text-red-400" size={20} />
            Live Anti-Cheat & Proctoring Violation Logs
          </h2>
          <p className="text-xs text-muted-text mb-6">
            Real-time feed of tab switches, screenshot captures, and automated 0-mark penalties
          </p>

          {violations.length === 0 ? (
            <div className="text-center py-16 text-muted-text">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400 opacity-60" />
              <p>No cheating or screen switch violations detected so far.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {violations.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-bright-white">{v.studentName} </span>
                      <span className="text-muted-text font-mono text-xs">({v.studentEmail})</span>
                      <div className="text-xs text-red-300 mt-0.5">
                        Violation: <strong className="uppercase">{v.violationType.replace('_', ' ')}</strong> on Question {v.questionIndex} • Question mark set to 0
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-subtle-text shrink-0">{v.timestamp}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Question Management */}
      {activeTab === 'questions' && (
        <div className="glass-panel-dark rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-bright-white">Quiz Question Bank</h2>
              <p className="text-xs text-muted-text">
                Manage, add, or review technical questions distributed to candidates
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingQuestion(!isAddingQuestion)}
              className="px-4 py-2.5 rounded-xl font-medium text-xs text-midnight-950 bg-electric-cyan hover:opacity-95 shadow-[0_0_15px_rgba(56,225,255,0.3)] transition-all flex items-center gap-2 cursor-pointer font-sans"
            >
              <Plus size={16} />
              <span>{isAddingQuestion ? 'Cancel' : 'Add New Question'}</span>
            </button>
          </div>

          {/* Add Question Modal/Drawer */}
          {isAddingQuestion && (
            <form onSubmit={handleAddQuestion} className="glass-card-dark p-6 rounded-2xl mb-8 space-y-4 border-electric-cyan/30">
              <h3 className="text-sm font-mono font-bold text-electric-cyan uppercase">Add New Technical Question</h3>

              <div>
                <label className="block text-xs font-mono text-muted-text uppercase mb-1">Question Prompt</label>
                <textarea
                  required
                  rows={2}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="e.g. In an ideal transformer, the voltage ratio is proportional to..."
                  className="w-full glass-input rounded-xl p-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {newOptions.map((opt, i) => (
                  <div key={i}>
                    <label className="block text-xs font-mono text-muted-text uppercase mb-1">
                      Option {String.fromCharCode(65 + i)} {newCorrectAnswer === i && '(Correct Answer)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={newCorrectAnswer === i}
                        onChange={() => setNewCorrectAnswer(i)}
                        className="text-electric-cyan"
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
                        placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                        className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-medium text-xs text-midnight-950 bg-electric-cyan cursor-pointer hover:opacity-90 font-sans"
                >
                  Save Question
                </button>
              </div>
            </form>
          )}

          {/* Questions List */}
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={q.id} className="glass-card-dark p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-electric-cyan">Q{idx + 1}.</span>
                    <span className="text-xs font-mono text-subtle-text bg-white/5 px-2 py-0.5 rounded">
                      {q.category || 'ECE'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-bright-white mb-2">{q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`px-2.5 py-1 rounded ${
                          oIdx === q.correctAnswer
                            ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                            : 'text-muted-text'
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
                  className="text-muted-text hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Delete Question"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
