import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, ShieldCheck, Lock, Sparkles, LogOut } from 'lucide-react';
import StudentLogin from './components/StudentLogin';
import QuizView from './components/QuizView';
import ResultView from './components/ResultView';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import { INITIAL_QUESTIONS, getShuffledQuestions } from './data/questions';
import type { Question, StudentProfile, QuizSubmission } from './types/quiz';
import {
  broadcastStudentJoined,
  broadcastQuizCompleted,
  recordQuizAttempt,
} from './lib/supabase';

type AppRoute = 'student_login' | 'quiz_session' | 'quiz_result' | 'admin_login' | 'admin_dashboard';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('student_login');
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [activeStudent, setActiveStudent] = useState<StudentProfile | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    totalQuestions: number;
    violationsCount: number;
  } | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Check URL pathname for /admin on initial load & popstate
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        setRoute(isAdminAuthenticated ? 'admin_dashboard' : 'admin_login');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [isAdminAuthenticated]);

  // Navigate to admin
  const handleOpenAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setRoute(isAdminAuthenticated ? 'admin_dashboard' : 'admin_login');
  };

  // Navigate back to student flow
  const handleBackToStudent = () => {
    window.history.pushState({}, '', '/');
    if (activeStudent) {
      setRoute('quiz_session');
    } else {
      setRoute('student_login');
    }
  };

  // Student login success handler
  const handleStudentLoginSuccess = (student: StudentProfile) => {
    setActiveStudent(student);
    // Shuffle questions and options for this individual student
    const shuffled = getShuffledQuestions(questions);
    setSessionQuestions(shuffled);
    setRoute('quiz_session');

    // Broadcast student joined to Admin in real-time
    broadcastStudentJoined({
      studentId: student.id || student.email,
      name: student.full_name,
      email: student.email,
      college: student.college || 'Engineering College',
      currentQuestion: 1,
      totalQuestions: shuffled.length,
      score: 0,
      violationsCount: 0,
      status: 'active',
      lastSeen: new Date().toISOString(),
    });
  };

  // Quiz completion handler
  const handleQuizComplete = async (results: {
    score: number;
    totalQuestions: number;
    answers: Record<number, number>;
    penalizedQuestions: Record<number, boolean>;
    violationsCount: number;
  }) => {
    if (!activeStudent) return;

    setQuizResult({
      score: results.score,
      totalQuestions: results.totalQuestions,
      violationsCount: results.violationsCount,
    });
    setRoute('quiz_result');

    const submission: QuizSubmission = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      registration_id: activeStudent.registration_id,
      participant_name: activeStudent.full_name,
      participant_email: activeStudent.email,
      score: results.score,
      total_questions: results.totalQuestions,
      violations_count: results.violationsCount,
      answers: results.answers,
      penalized_questions: results.penalizedQuestions,
      completed_at: new Date().toISOString(),
    };

    // Broadcast completion to Admin in real-time
    broadcastQuizCompleted(submission);

    // Save record to Supabase
    await recordQuizAttempt(submission);
  };

  const handleResetSession = () => {
    setActiveStudent(null);
    setQuizResult(null);
    setRoute('student_login');
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="min-h-screen relative flex flex-col font-sans text-bright-white selection:bg-electric-cyan/30 selection:text-electric-cyan">
      {/* Subtle Starfield & Ambient Glow */}
      <div className="stars-bg" />
      <div className="ambient-glow" />

      {/* Global Navigation Header */}
      <header className="w-full border-b border-white/5 bg-midnight-950/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToStudent}
            className="flex items-center gap-3 cursor-pointer group text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-electric-cyan/10 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_15px_rgba(56,225,255,0.2)] group-hover:border-electric-cyan/60 transition-colors">
              <Cpu size={20} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-bright-white group-hover:text-electric-cyan transition-colors">
                SPARKTRON <span className="font-mono text-electric-cyan">2026</span>
              </div>
              <div className="text-[10px] font-mono text-muted-text uppercase tracking-widest">
                National Level ECE Symposium
              </div>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {route.startsWith('admin') ? (
              <button
                type="button"
                onClick={handleBackToStudent}
                className="text-xs font-mono text-muted-text hover:text-bright-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Student View</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAdmin}
                className="text-xs font-mono text-electric-cyan/90 hover:text-electric-cyan bg-electric-cyan/10 border border-electric-cyan/25 hover:border-electric-cyan/50 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Lock size={12} />
                <span>/admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10">
        <AnimatePresence mode="wait">
          {route === 'student_login' && (
            <motion.div
              key="student_login"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <StudentLogin
                onLoginSuccess={handleStudentLoginSuccess}
                onOpenAdmin={handleOpenAdmin}
              />
            </motion.div>
          )}

          {route === 'quiz_session' && activeStudent && (
            <motion.div
              key="quiz_session"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <QuizView
                student={activeStudent}
                questions={sessionQuestions}
                onCompleteQuiz={handleQuizComplete}
              />
            </motion.div>
          )}

          {route === 'quiz_result' && activeStudent && quizResult && (
            <motion.div
              key="quiz_result"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <ResultView
                student={activeStudent}
                totalQuestions={quizResult.totalQuestions}
                violationsCount={quizResult.violationsCount}
                onHome={handleResetSession}
              />
            </motion.div>
          )}

          {route === 'admin_login' && (
            <motion.div
              key="admin_login"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <AdminLogin
                onSuccess={() => {
                  setIsAdminAuthenticated(true);
                  setRoute('admin_dashboard');
                }}
                onCancel={handleBackToStudent}
              />
            </motion.div>
          )}

          {route === 'admin_dashboard' && (
            <motion.div
              key="admin_dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <AdminDashboard
                questions={questions}
                onUpdateQuestions={setQuestions}
                onLogout={() => {
                  setIsAdminAuthenticated(false);
                  handleBackToStudent();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs font-mono text-subtle-text border-t border-white/5">
        SPARKTRON 2026 • Controlled ECE Assessment Platform • Powered by Supabase Realtime
      </footer>
    </div>
  );
}
