import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, ShieldCheck, AlertTriangle } from 'lucide-react';
import StudentLogin from './components/StudentLogin';
import QuizView from './components/QuizView';
import ResultView from './components/ResultView';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import FloatingBackground from './components/FloatingBackground';
import ErrorBoundary from './components/ErrorBoundary';
import { INITIAL_QUESTIONS, getShuffledQuestions } from './data/questions';
import type { Question, StudentProfile, QuizSubmission } from './types/quiz';
import {
  broadcastStudentJoined,
  broadcastQuizCompleted,
  recordQuizAttempt,
  syncQuestionsWithCloud,
  getQuizSchedule,
  syncBroadcastChannel,
  getOrCreateArenaChannel,
  releasePasscodeSession,
  getCandidateSubmission,
  clearStudentCompleted,
} from './lib/supabase';

type AppRoute = 'student_login' | 'quiz_session' | 'quiz_result' | 'admin_login' | 'admin_dashboard' | 'not_found';

const checkIsAdminCtrlUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const p = (window.location.pathname || '').toLowerCase();
  const s = (window.location.search || '').toLowerCase();
  const h = (window.location.hash || '').toLowerCase();
  return (
    p === '/adminctrl' ||
    p.startsWith('/adminctrl/') ||
    p.endsWith('/adminctrl') ||
    s.includes('adminctrl') ||
    h.includes('adminctrl')
  );
};

const checkIsLegacyAdminUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (checkIsAdminCtrlUrl()) return false;
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

const checkIsDemoUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const s = (window.location.search || '').toLowerCase();
  const h = (window.location.hash || '').toLowerCase();
  return s.includes('demo') || h.includes('demo');
};

export default function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('spark_admin_auth') === 'true';
  });

  const [route, setRoute] = useState<AppRoute>(() => {
    if (checkIsAdminCtrlUrl()) {
      const isAuth =
        (typeof window !== 'undefined' && sessionStorage.getItem('spark_admin_auth') === 'true') ||
        (typeof window !== 'undefined' && window.location.search.includes('preview=dashboard'));
      return isAuth ? 'admin_dashboard' : 'admin_login';
    }
    if (checkIsLegacyAdminUrl()) {
      return 'not_found';
    }
    if (typeof window !== 'undefined' && (checkIsDemoUrl() || window.location.search.includes('preview=quiz'))) {
      return 'quiz_session';
    }
    if (typeof window !== 'undefined') {
      const savedRoute = sessionStorage.getItem('spark_current_route');
      if (savedRoute === 'quiz_result') {
        return 'quiz_result';
      }
    }
    return 'student_login';
  });

  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [activeStudent, setActiveStudent] = useState<StudentProfile | null>(() => {
    if (typeof window !== 'undefined' && checkIsDemoUrl()) {
      return {
        id: 'demo-tester-id',
        registration_id: 'reg-demo-2026',
        registration_code: 'DEMO2026',
        passcode: 'DEMO2026',
        full_name: 'Demo Candidate (Tester)',
        email: 'demo@spark2026.com',
        college: 'SPARKTRON Institute of Technology',
        department: 'ECE',
        is_verified: true,
        is_demo: true,
      };
    }
    if (typeof window !== 'undefined' && window.location.search.includes('preview=quiz')) {
      return {
        id: 'preview-sankar',
        registration_id: 'e22e519e-e092-4f7f-a65c-6b1104e76a16',
        registration_code: 'SPARK-ECE-101',
        passcode: 'SPARK-ECE-101',
        full_name: 'Sankar',
        email: 'sunkar@gmail.com',
        college: 'ECE Department',
        is_verified: true,
        is_demo: false,
      };
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('spark_active_student');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return null;
  });
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(() => {
    if (typeof window !== 'undefined' && (checkIsDemoUrl() || window.location.search.includes('preview=quiz'))) {
      return INITIAL_QUESTIONS;
    }
    return [];
  });
  const [quizResult, setQuizResult] = useState<{
    score: number;
    totalQuestions: number;
    violationsCount: number;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('spark_active_student');
        if (stored) {
          const s = JSON.parse(stored);
          const sub = getCandidateSubmission(s.email, s.passcode);
          if (sub) {
            return {
              score: sub.score,
              totalQuestions: sub.total_questions,
              violationsCount: sub.violations_count,
            };
          }
        }
      } catch (e) {}
    }
    return null;
  });

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
      if (checkIsAdminCtrlUrl()) {
        const isAuth =
          sessionStorage.getItem('spark_admin_auth') === 'true' ||
          window.location.search.includes('preview=dashboard');
        setIsAdminAuthenticated(isAuth);
        setRoute(isAuth ? 'admin_dashboard' : 'admin_login');
      } else if (checkIsLegacyAdminUrl()) {
        setRoute('not_found');
      } else if (checkIsDemoUrl()) {
        setActiveStudent({
          id: 'demo-tester-id',
          registration_id: 'reg-demo-2026',
          registration_code: 'DEMO2026',
          passcode: 'DEMO2026',
          full_name: 'Demo Candidate (Tester)',
          email: 'demo@spark2026.com',
          college: 'SPARKTRON Institute of Technology',
          department: 'ECE',
          is_verified: true,
          is_demo: true,
        });
        setSessionQuestions(INITIAL_QUESTIONS);
        setRoute('quiz_session');
      } else {
        setRoute((prev) => (prev.startsWith('admin') || prev === 'not_found' ? 'student_login' : prev));
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Schedule re-round passcodes check on mount and on schedule update
  useEffect(() => {
    const handleScheduleCheck = (sched: any) => {
      if (!sched) return;
      const passcodes: string[] = sched.reRoundPasscodes || [];
      const emails: string[] = sched.reRoundEmails || [];
      passcodes.forEach((p) => clearStudentCompleted('', p));
      emails.forEach((e) => clearStudentCompleted(e, ''));
    };

    handleScheduleCheck(getQuizSchedule());

    const handleCustom = (e: any) => handleScheduleCheck(e.detail);
    window.addEventListener('spark_quiz_schedule_change', handleCustom);
    return () => window.removeEventListener('spark_quiz_schedule_change', handleCustom);
  }, []);

  // Listen for admin reset events across the arena (always active across tabs/devices)
  useEffect(() => {
    const handleResetEvent = (payload: any) => {
      if (!payload) return;
      const targetEmail = (payload.studentEmail || '').toLowerCase();
      const targetPasscode = (payload.passcode || '').toUpperCase();
      const allEmails: string[] = Array.isArray(payload.allEmails)
        ? payload.allEmails.map((e: string) => e.toLowerCase())
        : [targetEmail];

      allEmails.forEach((em) => {
        if (em) clearStudentCompleted(em, targetPasscode);
      });
      if (targetPasscode) {
        clearStudentCompleted('', targetPasscode);
        releasePasscodeSession(targetPasscode);
      }

      if (activeStudent) {
        const currentEmail = activeStudent.email.toLowerCase();
        const activePasscode = (activeStudent.passcode || activeStudent.registration_code || '').toUpperCase();
        const emailMatch = allEmails.includes(currentEmail);
        const codeMatch = targetPasscode && targetPasscode === activePasscode;
        const memberMatch = activeStudent.members?.some((m) =>
          allEmails.includes((m.email || '').toLowerCase())
        );

        if (emailMatch || codeMatch || memberMatch) {
          releasePasscodeSession(activePasscode);
          setActiveStudent(null);
          setQuizResult(null);
          try {
            sessionStorage.removeItem('spark_active_student');
            sessionStorage.removeItem('spark_current_route');
          } catch (e) {}
          setRoute('student_login');
        }
      }
    };

    if (syncBroadcastChannel) {
      const channel = syncBroadcastChannel;
      const handleBroadcast = (e: MessageEvent) => {
        if (e.data?.type === 'reset_student_session') {
          handleResetEvent(e.data.payload);
        }
      };
      channel.addEventListener('message', handleBroadcast);
      return () => channel.removeEventListener('message', handleBroadcast);
    }

    const ch = getOrCreateArenaChannel();
    ch.on('broadcast', { event: 'reset_student_session' }, ({ payload }) => {
      handleResetEvent(payload);
    });
  }, [activeStudent]);

  // Student login success handler
  const handleStudentLoginSuccess = (student: StudentProfile) => {
    setActiveStudent(student);
    try {
      sessionStorage.setItem('spark_active_student', JSON.stringify(student));
    } catch (e) {}

    // If candidate has already submitted this examination, route directly to result review
    if (student.is_already_completed) {
      const sub = getCandidateSubmission(student.email, student.passcode || student.registration_code);
      setQuizResult({
        score: sub?.score ?? 0,
        totalQuestions: sub?.total_questions ?? questions.length,
        violationsCount: sub?.violations_count ?? 0,
      });
      if (sub?.question_snapshot && sub.question_snapshot.length > 0) {
        setSessionQuestions(sub.question_snapshot);
      }
      try {
        sessionStorage.setItem('spark_current_route', 'quiz_result');
      } catch (e) {}
      setRoute('quiz_result');
      return;
    }

    try {
      sessionStorage.setItem('spark_current_route', 'quiz_session');
    } catch (e) {}

    const shuffled = getShuffledQuestions(questions);
    setSessionQuestions(shuffled);
    setRoute('quiz_session');

    const schedule = getQuizSchedule();
    const isAlreadyActive = schedule.state === 'in_progress' && schedule.isQuizActive;
    const effectivePasscode = (student.passcode || student.registration_code || '').toUpperCase();

    // Broadcast student entry to Admin live with accurate status, team info, and passcode
    broadcastStudentJoined({
      studentId: student.id || student.email,
      name: student.full_name,
      email: student.email,
      college: student.college || 'Engineering College',
      department: student.department || 'ECE',
      passcode: effectivePasscode,
      teamName: student.team_name,
      members: student.members,
      currentQuestion: isAlreadyActive ? 1 : 0,
      totalQuestions: shuffled.length,
      score: 0,
      violationsCount: 0,
      status: isAlreadyActive ? 'active' : 'lobby',
      lastSeen: new Date().toISOString(),
      activeSessionId: student.sessionId,
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

    const effectivePasscode = (activeStudent.passcode || activeStudent.registration_code || '').toUpperCase();
    releasePasscodeSession(effectivePasscode);

    setQuizResult({
      score: results.score,
      totalQuestions: results.totalQuestions,
      violationsCount: results.violationsCount,
    });
    try {
      sessionStorage.setItem('spark_current_route', 'quiz_result');
    } catch (e) {}
    setRoute('quiz_result');

    const submission: QuizSubmission = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      registration_id: effectivePasscode || activeStudent.registration_id,
      participant_name: activeStudent.full_name,
      participant_email: activeStudent.email,
      score: results.score,
      total_questions: results.totalQuestions,
      violations_count: results.violationsCount,
      answers: results.answers,
      penalized_questions: results.penalizedQuestions,
      completed_at: new Date().toISOString(),
      question_snapshot: sessionQuestions.length > 0 ? sessionQuestions : questions,
    };

    broadcastQuizCompleted(submission);
    await recordQuizAttempt(submission);
  };

  const handleResetSession = () => {
    setActiveStudent(null);
    setQuizResult(null);
    try {
      sessionStorage.removeItem('spark_active_student');
      sessionStorage.removeItem('spark_current_route');
    } catch (e) {}
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
      <div className="min-h-screen relative flex flex-col font-sans text-slate-100 selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden overflow-y-auto">
        {/* Floating 3D Frosted Glass Background Elements */}
        <FloatingBackground />

        {/* Global Minimal Navigation Header */}
        <header className="w-full border-b border-white/[0.08] bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-13 sm:h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <img
                src="/sparktron_logo.png"
                alt="SPARKTRON 2026 Logo"
                className="w-8 h-8 rounded-lg object-cover shadow-md shadow-blue-500/20 border border-blue-500/30 shrink-0"
              />
              <div>
                <div className="text-xs sm:text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                  <span>SPARKTRON 2026</span>
                  <span className="text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                    Technical Quiz
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 hidden sm:block">
                  National Level Technical Symposium
                </div>
              </div>
            </div>

            {route === 'admin_login' && (
              <button
                type="button"
                onClick={handleAdminLogout}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Return to Student Portal</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area - Vertically & Horizontally Centered on Mobile */}
        <main className="flex-1 flex items-center justify-center py-2 sm:py-4 px-1 sm:px-4 relative z-10 w-full min-h-[calc(100vh-3.5rem)]">
          <AnimatePresence mode="wait">
            {route === 'student_login' && (
              <motion.div
                key="student_login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full flex items-center justify-center my-auto"
              >
                <StudentLogin onLoginSuccess={handleStudentLoginSuccess} />
              </motion.div>
            )}

            {route === 'quiz_session' && activeStudent && (
              <motion.div
                key="quiz_session"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full"
              >
                <QuizView
                  student={activeStudent}
                  questions={sessionQuestions}
                  onCompleteQuiz={handleQuizComplete}
                />
              </motion.div>
            )}

            {route === 'quiz_result' && activeStudent && (
              <motion.div
                key="quiz_result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full"
              >
                <ResultView
                  student={activeStudent}
                  totalQuestions={quizResult?.totalQuestions || questions.length}
                  violationsCount={quizResult?.violationsCount || 0}
                  submission={getCandidateSubmission(activeStudent.email, activeStudent.passcode || activeStudent.registration_code)}
                  questions={sessionQuestions.length > 0 ? sessionQuestions : questions}
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

            {route === 'not_found' && (
              <motion.div
                key="not_found"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-md mx-auto px-4 py-8"
              >
                <div className="surface-card rounded-2xl p-8 border border-white/10 text-center shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <div className="text-4xl font-extrabold text-white font-mono tracking-tight mb-2">404</div>
                  <h2 className="text-lg font-semibold text-slate-100 mb-2">Page Not Found</h2>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    The requested URL was not found on this server.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState({}, '', '/');
                      setRoute('student_login');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer shadow-sm"
                  >
                    Return to Assessment Portal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="w-full py-4 text-xs font-mono text-subtle-text border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>SPARKTRON 2026 • Controlled ECE Assessment Platform • All Rights Reserved</span>
            <span className="text-slate-600 text-[11px]">Authorized Access Only</span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
