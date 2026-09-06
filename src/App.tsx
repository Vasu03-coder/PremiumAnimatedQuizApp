import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, ShieldCheck } from 'lucide-react';
import StudentLogin from './components/StudentLogin';
import QuizView from './components/QuizView';
import ResultView from './components/ResultView';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { INITIAL_QUESTIONS, getShuffledQuestions } from './data/questions';
import type { Question, StudentProfile, QuizSubmission } from './types/quiz';
import {
  broadcastStudentJoined,
  broadcastQuizCompleted,
  recordQuizAttempt,
  syncQuestionsWithCloud,
} from './lib/supabase';

type AppRoute = 'student_login' | 'quiz_session' | 'quiz_result' | 'admin_login' | 'admin_dashboard';

const checkIsAdminUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const p = (window.location.pathname || '').toLowerCase();
  const s = (window.location.search || '').toLowerCase();
  const h = (window.location.hash || '').toLowerCase();
  return (
    p === '/admin' ||
    p.startsWith('/admin/') ||
    p.endsWith('/admin') ||
    s.includes('admin') ||
    h.includes('admin')
  );
};

export default function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('spark_admin_auth') === 'true';
  });

  const [route, setRoute] = useState<AppRoute>(() => {
    if (checkIsAdminUrl()) {
      const isAuth =
        (typeof window !== 'undefined' && sessionStorage.getItem('spark_admin_auth') === 'true') ||
        (typeof window !== 'undefined' && window.location.search.includes('preview=dashboard'));
      return isAuth ? 'admin_dashboard' : 'admin_login';
    }
    if (typeof window !== 'undefined' && window.location.search.includes('preview=quiz')) {
      return 'quiz_session';
    }
    return 'student_login';
  });

  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [activeStudent, setActiveStudent] = useState<StudentProfile | null>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('preview=quiz')) {
      return {
        id: 'preview-sankar',
        registration_id: 'e22e519e-e092-4f7f-a65c-6b1104e76a16',
        registration_code: 'SPARK-ECE-01',
        full_name: 'Sankar',
        email: 'sunkar@gmail.com',
        college: 'ECE Department',
        is_verified: true,
      };
    }
    return null;
  });
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('preview=quiz')) {
      return INITIAL_QUESTIONS;
    }
    return [];
  });
  const [quizResult, setQuizResult] = useState<{
    score: number;
    totalQuestions: number;
    violationsCount: number;
  } | null>(null);

  // Sync questions from Cloud & local storage on mount
  useEffect(() => {
    async function loadCloudQuestions() {
      try {
        const synced = await syncQuestionsWithCloud(INITIAL_QUESTIONS);
        if (synced && synced.length > 0) {
          setQuestions(synced);
        }
      } catch (e) {
        console.info('Questions cloud sync note:', e);
      }
    }
    loadCloudQuestions();
  }, []);

  // Monitor URL changes (popstate & hashchange)
  useEffect(() => {
    const handleLocationChange = () => {
      if (checkIsAdminUrl()) {
        const isAuth =
          sessionStorage.getItem('spark_admin_auth') === 'true' ||
          window.location.search.includes('preview=dashboard');
        setIsAdminAuthenticated(isAuth);
        setRoute(isAuth ? 'admin_dashboard' : 'admin_login');
      } else {
        setRoute((prev) => (prev.startsWith('admin') ? 'student_login' : prev));
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Student login success handler
  const handleStudentLoginSuccess = (student: StudentProfile) => {
    setActiveStudent(student);
    const shuffled = getShuffledQuestions(questions);
    setSessionQuestions(shuffled);
    setRoute('quiz_session');

    // Broadcast student entry to Admin live
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

    broadcastQuizCompleted(submission);
    await recordQuizAttempt(submission);
  };

  const handleResetSession = () => {
    setActiveStudent(null);
    setQuizResult(null);
    setRoute('student_login');
    window.history.pushState({}, '', '/');
  };

  const handleAdminLoginSuccess = () => {
    sessionStorage.setItem('spark_admin_auth', 'true');
    setIsAdminAuthenticated(true);
    setRoute('admin_dashboard');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('spark_admin_auth');
    setIsAdminAuthenticated(false);
    window.history.pushState({}, '', '/');
    setRoute('student_login');
  };

  if (route === 'admin_dashboard') {
    return (
      <ErrorBoundary>
        <AdminDashboard
          questions={questions}
          onUpdateQuestions={setQuestions}
          onLogout={handleAdminLogout}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen relative flex flex-col font-sans text-bright-white selection:bg-electric-cyan/30 selection:text-electric-cyan">
        {/* Subtle Starfield & Ambient Glow */}
        <div className="stars-bg" />
        <div className="ambient-glow" />

        {/* Global Navigation Header - NO ADMIN BUTTONS SHOWN TO STUDENTS! */}
        <header className="w-full border-b border-white/5 bg-midnight-950/60 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-electric-cyan/10 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_15px_rgba(56,225,255,0.2)]">
                <Cpu size={20} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-bright-white">
                  SPARKTRON <span className="font-mono text-electric-cyan">2026</span>
                </div>
                <div className="text-[10px] font-mono text-muted-text uppercase tracking-widest">
                  National Level Technical Symposium
                </div>
              </div>
            </div>

            {route === 'admin_login' && (
              <button
                type="button"
                onClick={handleAdminLogout}
                className="text-xs font-mono text-muted-text hover:text-bright-white px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Return to Student Portal</span>
              </button>
            )}
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
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <StudentLogin onLoginSuccess={handleStudentLoginSuccess} />
              </motion.div>
            )}

            {route === 'quiz_session' && activeStudent && (
              <motion.div
                key="quiz_session"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
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
                transition={{ duration: 0.25 }}
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
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <AdminLogin
                  onSuccess={handleAdminLoginSuccess}
                  onCancel={handleAdminLogout}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="w-full py-4 text-center text-xs font-mono text-subtle-text border-t border-white/5">
          SPARKTRON 2026 • Controlled ECE Assessment Platform • All Rights Reserved
        </footer>
      </div>
    </ErrorBoundary>
  );
}
