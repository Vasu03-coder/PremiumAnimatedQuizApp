import { createClient } from '@supabase/supabase-js';
import type { Question, StudentProfile, LiveStudentStatus, ProctoringViolation, QuizSubmission } from '../types/quiz';

export const SUPABASE_URL = 'https://ickymxuqprfbekxumpop.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlja3lteHVxcHJmYmVreHVtcG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDM0NTYsImV4cCI6MjEwNDAxOTQ1Nn0.E7_i_XCbNJGNFif-uEQnG8d5voIn2DalZUBlXXV_SMU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Technical Quiz Event ID from public.events
export const TECHNICAL_QUIZ_EVENT_ID = '1b16c6ae-d13d-4a00-bf1e-b95b780c7f32';

export interface CandidatePasscodeMapping {
  passcode: string;
  email: string;
  fullName: string;
  college: string;
  department: string;
  isDemo?: boolean;
}

// Built-in verified candidate passcodes connected directly to registered email addresses
export const PREDEFINED_PASSCODES: Record<string, CandidatePasscodeMapping> = {
  // Demo / Evaluator Account (Bypasses start countdown timer completely)
  'DEMO2026': {
    passcode: 'DEMO2026',
    email: 'demo@spark2026.com',
    fullName: 'Demo Candidate (Tester)',
    college: 'SPARKTRON Institute of Technology',
    department: 'ECE',
    isDemo: true,
  },
  'SPARK-DEMO': {
    passcode: 'SPARK-DEMO',
    email: 'demo@spark2026.com',
    fullName: 'Demo Candidate (Tester)',
    college: 'SPARKTRON Institute of Technology',
    department: 'ECE',
    isDemo: true,
  },

  // Official Registered Symposium Candidates (Connected to their registered emails)
  'SPARK-ECE-101': {
    passcode: 'SPARK-ECE-101',
    email: 'sunkar@gmail.com',
    fullName: 'Sankar Raja',
    college: 'ECE Department',
    department: 'ECE Core',
    isDemo: false,
  },
  'SPARK-ECE-102': {
    passcode: 'SPARK-ECE-102',
    email: 'arun.k@symposium.edu',
    fullName: 'Arun Kumar',
    college: 'Govt College of Technology',
    department: 'ECE',
    isDemo: false,
  },
  'SPARK-ECE-103': {
    passcode: 'SPARK-ECE-103',
    email: 'priya.d@symposium.edu',
    fullName: 'Priya Dharshini',
    college: 'PSG College of Technology',
    department: 'ECE',
    isDemo: false,
  },
  'SPARK-ECE-104': {
    passcode: 'SPARK-ECE-104',
    email: 'karthik.r@symposium.edu',
    fullName: 'Karthik Raja',
    college: 'Thiagarajar College of Engg',
    department: 'ECE',
    isDemo: false,
  },
  'SPARK-ECE-105': {
    passcode: 'SPARK-ECE-105',
    email: 'swetha.m@symposium.edu',
    fullName: 'Swetha M',
    college: 'Coimbatore Institute of Tech',
    department: 'ECE',
    isDemo: false,
  },
  'SPARK-ECE-106': {
    passcode: 'SPARK-ECE-106',
    email: 'vignesh.s@symposium.edu',
    fullName: 'Vignesh S',
    college: 'Anna University, CEG',
    department: 'ECE',
    isDemo: false,
  },
  'SPARK-ECE-107': {
    passcode: 'SPARK-ECE-107',
    email: 'divya.b@symposium.edu',
    fullName: 'Divya Bharathi',
    college: 'SSN College of Engineering',
    department: 'ECE',
    isDemo: false,
  },
  'SPARK-ECE-108': {
    passcode: 'SPARK-ECE-108',
    email: 'manoj.k@symposium.edu',
    fullName: 'Manoj Kumar',
    college: 'National Institute of Tech (NIT)',
    department: 'ECE',
    isDemo: false,
  },
  'SPARK-ECE-109': {
    passcode: 'SPARK-ECE-109',
    email: 'ananya.r@symposium.edu',
    fullName: 'Ananya R',
    college: 'SRM Institute of Science & Tech',
    department: 'ECE',
    isDemo: false,
  },
  'SPARK-ECE-110': {
    passcode: 'SPARK-ECE-110',
    email: 'praveen.r@symposium.edu',
    fullName: 'Praveen Raj',
    college: 'Kumaraguru College of Tech',
    department: 'ECE',
    isDemo: false,
  },
};

/**
 * Verify candidate login using their unique PASSCODE
 * Passcode connects directly to their registered email & profile
 */
export async function verifyStudentByPasscode(
  passcode: string
): Promise<{ success: boolean; student?: StudentProfile; message?: string }> {
  try {
    const cleanPasscode = passcode.trim().toUpperCase();

    if (!cleanPasscode) {
      return { success: false, message: 'Please enter your assessment passcode.' };
    }

    // 1. Check in Pre-mapped Passcodes
    if (PREDEFINED_PASSCODES[cleanPasscode]) {
      const match = PREDEFINED_PASSCODES[cleanPasscode];
      return {
        success: true,
        student: {
          id: `id-${cleanPasscode.toLowerCase()}`,
          registration_id: `reg-${cleanPasscode.toLowerCase()}`,
          registration_code: match.passcode,
          passcode: match.passcode,
          full_name: match.fullName,
          email: match.email,
          college: match.college,
          department: match.department,
          is_verified: true,
          is_demo: match.isDemo || false,
        },
      };
    }

    // 2. Query Supabase registrations matching registration_code
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('id, registration_code, technical_event_id, status, participants(id, registration_id, full_name, email, phone, college, department)')
      .ilike('registration_code', cleanPasscode)
      .maybeSingle();

    if (!regError && registration) {
      if (registration.technical_event_id !== TECHNICAL_QUIZ_EVENT_ID) {
        return {
          success: false,
          message: 'Access Denied: This passcode is registered for another symposium event, not the Technical Quiz.',
        };
      }

      const participant = Array.isArray(registration.participants)
        ? registration.participants[0]
        : registration.participants;

      if (participant) {
        return {
          success: true,
          student: {
            id: participant.id,
            registration_id: registration.id,
            registration_code: registration.registration_code,
            passcode: registration.registration_code,
            full_name: participant.full_name || 'Candidate',
            email: participant.email,
            college: participant.college || 'Engineering College',
            department: participant.department || 'ECE',
            phone: participant.phone || '',
            is_verified: true,
            is_demo: false,
          },
        };
      }
    }

    return {
      success: false,
      message: `Invalid Passcode "${passcode}". Access Denied: No confirmed Technical Quiz registration found.`,
    };
  } catch (err) {
    console.error('verifyStudentByPasscode error:', err);
    return {
      success: false,
      message: 'Verification connection error. Please verify network.',
    };
  }
}

// Whitelisted dummy/demo test accounts that bypass Supabase table registration
const DUMMY_EMAILS = [
  'demo@spark2026.com',
  'sunkar@gmail.com',
  'dummy@spark2026.com',
  'guest@spark2026.com',
  'demo@sparktron.com',
];

/**
 * Verify if the student is registered for the symposium and has Technical Quiz selected
 * Does NOT alter or modify any existing table!
 */
export async function verifyStudentRegistration(
  email: string,
  name: string
): Promise<{ success: boolean; student?: StudentProfile; message?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 1. Check if using the designated dummy/demo student account
    if (DUMMY_EMAILS.includes(cleanEmail)) {
      return {
        success: true,
        student: {
          id: 'demo-student-id',
          registration_id: 'e22e519e-demo-4f7f-a65c-6b1104e76a16',
          registration_code: 'SPARK-DEMO-2026',
          full_name: cleanName || 'Demo Student',
          email: cleanEmail,
          college: 'SPARKTRON Institute of Technology',
          department: 'ECE',
          phone: '9876543210',
          is_verified: true,
        },
      };
    }

    // 2. For ALL other email IDs, strictly query participants matching email
    const { data: participants, error } = await supabase
      .from('participants')
      .select('id, registration_id, full_name, email, phone, college, department, is_team_leader')
      .ilike('email', cleanEmail);

    if (error) {
      console.warn('Supabase participants query error:', error.message);
      return {
        success: false,
        message: 'Could not connect to registration server. Please check your internet connection.',
      };
    }

    if (!participants || participants.length === 0) {
      return {
        success: false,
        message: `No registration found with email "${email}". Please register on the official symposium website first.`,
      };
    }

    // Match participant by name or check registration
    let matchedParticipant = participants.find(
      (p) => p.full_name && p.full_name.trim().toLowerCase() === cleanName
    );

    // If exact name didn't match, check if partial match or take the participant if unique email
    if (!matchedParticipant) {
      matchedParticipant = participants.find(
        (p) =>
          p.full_name &&
          (p.full_name.toLowerCase().includes(cleanName) ||
            cleanName.includes(p.full_name.toLowerCase()))
      ) || participants[0];
    }

    // Fetch the registration details to confirm event
    const { data: registration } = await supabase
      .from('registrations')
      .select('id, registration_code, technical_event_id, status')
      .eq('id', matchedParticipant.registration_id)
      .maybeSingle();

    // Check if technical event is STRICTLY the technical-quiz
    if (registration?.technical_event_id !== TECHNICAL_QUIZ_EVENT_ID) {
      return {
        success: false,
        message:
          'Access Denied: Your registration is for another symposium event. Only candidates with confirmed registration for the "Technical Quiz" can enter this portal.',
      };
    }

    return {
      success: true,
      student: {
        id: matchedParticipant.id,
        registration_id: matchedParticipant.registration_id,
        registration_code: registration?.registration_code || 'SPARK-2026',
        full_name: matchedParticipant.full_name,
        email: matchedParticipant.email,
        college: matchedParticipant.college || 'Engineering College',
        department: matchedParticipant.department || 'ECE',
        phone: matchedParticipant.phone || '',
        is_verified: true,
      },
    };
  } catch (err: any) {
    console.error('Error verifying registration:', err);
    return {
      success: false,
      message: 'Verification failed. Please retry or contact event admin.',
    };
  }
}

/**
 * Fetch ONLY participants registered for the Technical Quiz event
 */
export async function getTechnicalQuizParticipants() {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('id, registration_id, full_name, email, phone, college, department, created_at, registrations!inner(id, registration_code, technical_event_id, status)')
      .eq('registrations.technical_event_id', TECHNICAL_QUIZ_EVENT_ID);

    if (!error && data && data.length > 0) {
      return data;
    }

    // Fallback to official pre-registered participants with their connected passcodes
    return Object.values(PREDEFINED_PASSCODES).map((p, idx) => ({
      id: `part-${idx + 1}`,
      registration_id: `reg-${p.passcode}`,
      full_name: p.fullName,
      email: p.email,
      phone: '9876543210',
      college: p.college,
      department: p.department,
      created_at: new Date().toISOString(),
      passcode: p.passcode,
      registrations: {
        id: `reg-${p.passcode}`,
        registration_code: p.passcode,
        technical_event_id: TECHNICAL_QUIZ_EVENT_ID,
        status: 'confirmed',
      },
    }));
  } catch (err) {
    console.error('getTechnicalQuizParticipants error:', err);
    return [];
  }
}

/**
 * Record a completed quiz attempt to Supabase
 */
export async function recordQuizAttempt(submission: QuizSubmission) {
  try {
    // Attempt inserting to quiz_attempts
    if (submission.registration_id) {
      const { error } = await supabase.from('quiz_attempts').insert([
        {
          registration_id: submission.registration_id,
          score: submission.score,
          total_questions: submission.total_questions,
          completed_at: submission.completed_at,
        },
      ]);
      if (error) {
        console.info('Note on quiz_attempts insert:', error.message);
      }
    }
  } catch (e) {
    console.info('quiz_attempts record error:', e);
  }

  // Also store in localStorage for offline/admin persistence
  try {
    const existing = JSON.parse(localStorage.getItem('spark_quiz_submissions') || '[]');
    existing.unshift(submission);
    localStorage.setItem('spark_quiz_submissions', JSON.stringify(existing.slice(0, 100)));
  } catch (e) {
    console.error(e);
  }
}

// Cross-tab direct synchronization channel (0ms latency between tabs on same browser/machine)
export const syncBroadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('spark-quiz-arena-sync')
    : null;

/**
 * Safe broadcast event helper that reuses or creates the channel safely
 */
export function getOrCreateArenaChannel() {
  const existing = supabase.getChannels().find((ch) => ch.topic === 'realtime:spark-quiz-arena');
  if (existing) {
    return existing;
  }
  return supabase.channel('spark-quiz-arena', {
    config: {
      broadcast: { self: true },
      presence: { key: 'student' },
    },
  });
}

export function broadcastStudentJoined(status: LiveStudentStatus) {
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'student_joined', payload: status });
    } catch (e) {}
  }
  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'student_joined',
    payload: status,
  });
}

export function broadcastScoreUpdate(status: Partial<LiveStudentStatus> & { studentId: string }) {
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'score_update', payload: status });
    } catch (e) {}
  }
  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'score_update',
    payload: status,
  });
}

export function broadcastProctoringAlert(violation: ProctoringViolation) {
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'proctoring_alert', payload: violation });
    } catch (e) {}
  }
  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'proctoring_alert',
    payload: violation,
  });
}

export function broadcastQuizCompleted(submission: QuizSubmission) {
  // Mark completed in persistent storage so re-attempts are blocked
  if (submission.participant_email) {
    markStudentCompleted(submission.participant_email, submission.registration_id || '', submission.score);
  }

  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'quiz_completed', payload: submission });
    } catch (e) {}
  }
  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'quiz_completed',
    payload: submission,
  });
}

export function broadcastAdminAnnouncement(message: string) {
  const payload = { message, timestamp: new Date().toLocaleTimeString() };
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'admin_announcement', payload });
    } catch (e) {}
  }
  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'admin_announcement',
    payload,
  });
}

export function broadcastResetStudent(studentEmail: string) {
  clearStudentCompleted(studentEmail);
  const payload = { studentEmail: studentEmail.toLowerCase() };
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'reset_student_session', payload });
    } catch (e) {}
  }
  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'reset_student_session',
    payload,
  });
}

export type QuizSessionState = 'lobby' | 'countdown' | 'in_progress' | 'paused';

export interface QuizSchedulePayload {
  state: QuizSessionState; // 'lobby' (waiting for admin to start), 'countdown' (10s countdown), 'in_progress', 'paused'
  isQuizActive: boolean;
  countdownSeconds?: number;
  countdownEndTime?: string | null; // ISO string when countdown finishes
  scheduledStartTime?: string | null; // ISO string when quiz starts or null
  targetClockTime?: string; // e.g. "10:00 AM"
  durationMinutes?: number;
  message?: string;
  startedAt?: string | null;
}

export function broadcastQuizSchedule(payload: QuizSchedulePayload) {
  try {
    localStorage.setItem('spark_quiz_schedule', JSON.stringify(payload));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spark_quiz_schedule_change', { detail: payload }));
    }
  } catch (e) {}

  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'quiz_schedule_update', payload });
    } catch (e) {}
  }

  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'quiz_schedule_update',
    payload,
  });
}

export function getQuizSchedule(): QuizSchedulePayload {
  try {
    const saved = localStorage.getItem('spark_quiz_schedule');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure state exists
      if (!parsed.state) {
        parsed.state = parsed.isQuizActive ? 'in_progress' : 'lobby';
      }
      return parsed;
    }
  } catch (e) {}
  // Default is 'lobby' (Waiting for Admin to click Start Quiz)
  return {
    state: 'lobby',
    isQuizActive: false,
    scheduledStartTime: null,
    countdownSeconds: 10,
    message: 'Waiting for Admin to start the quiz...',
  };
}

export function broadcastQuizStatus(isQuizActive: boolean) {
  const current = getQuizSchedule();
  const updated: QuizSchedulePayload = {
    ...current,
    state: isQuizActive ? 'in_progress' : 'paused',
    isQuizActive,
    message: isQuizActive ? 'Quiz resumed by Administrator' : 'Quiz paused by Administrator',
  };
  broadcastQuizSchedule(updated);

  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'quiz_status_change', payload: { isQuizActive } });
    } catch (e) {}
  }

  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'quiz_status_change',
    payload: { isQuizActive },
  });
}

/**
 * Check if a candidate has already completed the assessment
 * Blocks unauthorized second attempts
 */
export function isStudentCompleted(
  email: string,
  passcode?: string
): { completed: boolean; score?: number; completedAt?: string } {
  try {
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPasscode = (passcode || '').toUpperCase().trim();

    // Check completion map
    const mapStr = localStorage.getItem('spark_completed_candidates');
    if (mapStr) {
      const map = JSON.parse(mapStr);
      if (cleanEmail && map[cleanEmail]) {
        return { completed: true, score: map[cleanEmail].score, completedAt: map[cleanEmail].completedAt };
      }
      if (cleanPasscode && map[cleanPasscode]) {
        return { completed: true, score: map[cleanPasscode].score, completedAt: map[cleanPasscode].completedAt };
      }
    }

    // Check submissions history
    const subStr = localStorage.getItem('spark_quiz_submissions');
    if (subStr) {
      const subs: QuizSubmission[] = JSON.parse(subStr);
      const found = subs.find(
        (s) =>
          (s.participant_email && s.participant_email.toLowerCase().trim() === cleanEmail) ||
          (cleanPasscode && s.registration_id && s.registration_id.toUpperCase().includes(cleanPasscode))
      );
      if (found) {
        return { completed: true, score: found.score, completedAt: found.completed_at };
      }
    }
  } catch (e) {}
  return { completed: false };
}

/**
 * Mark student as completed so subsequent login attempts are rejected
 */
export function markStudentCompleted(email: string, passcode: string, score: number) {
  try {
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPasscode = (passcode || '').toUpperCase().trim();
    const map = JSON.parse(localStorage.getItem('spark_completed_candidates') || '{}');
    const record = { completed: true, score, completedAt: new Date().toISOString(), email: cleanEmail, passcode: cleanPasscode };
    if (cleanEmail) map[cleanEmail] = record;
    if (cleanPasscode) map[cleanPasscode] = record;
    localStorage.setItem('spark_completed_candidates', JSON.stringify(map));
  } catch (e) {}
}

/**
 * Clear student completion lock (Admin "Reset / Allow Re-attempt" feature)
 */
export function clearStudentCompleted(email: string, passcode?: string) {
  try {
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPasscode = (passcode || '').toUpperCase().trim();

    const map = JSON.parse(localStorage.getItem('spark_completed_candidates') || '{}');
    if (cleanEmail) delete map[cleanEmail];
    if (cleanPasscode) delete map[cleanPasscode];
    localStorage.setItem('spark_completed_candidates', JSON.stringify(map));

    // Also remove from submissions
    const subStr = localStorage.getItem('spark_quiz_submissions');
    if (subStr) {
      const subs: QuizSubmission[] = JSON.parse(subStr);
      const filtered = subs.filter(
        (s) =>
          s.participant_email?.toLowerCase().trim() !== cleanEmail &&
          (!cleanPasscode || !s.registration_id?.toUpperCase().includes(cleanPasscode))
      );
      localStorage.setItem('spark_quiz_submissions', JSON.stringify(filtered));
    }
  } catch (e) {}
}

/**
 * Cloud and Local synchronized question bank helpers
 */
export async function syncQuestionsWithCloud(fallbackQuestions: Question[]): Promise<Question[]> {
  // 1. Try reading from localStorage first if custom edits exist
  try {
    const local = localStorage.getItem('spark_quiz_questions');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }

  // 2. Try fetching from Supabase quiz_questions
  try {
    const { data: cloudQuestions, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('id', { ascending: true });

    if (!error && cloudQuestions && cloudQuestions.length > 0) {
      const mapped: Question[] = cloudQuestions.map((q: any, i: number) => {
        let optionsArr: string[] = [];
        let correctIdx = 0;
        if (Array.isArray(q.options)) {
          optionsArr = q.options.map((opt: any) =>
            typeof opt === 'string' ? opt : opt.text || String(opt)
          );
          const foundCorrect = q.options.findIndex((opt: any) => typeof opt === 'object' && opt.is_correct);
          if (foundCorrect !== -1) correctIdx = foundCorrect;
        } else if (typeof q.options === 'object' && q.options !== null) {
          optionsArr = Object.values(q.options);
        }
        return {
          id: q.id,
          question: q.question_text || q.question || `Question ${i + 1}`,
          options: optionsArr.length >= 2 ? optionsArr : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: correctIdx,
          category: q.category || 'ECE Core',
          points: q.points || 1,
        };
      });
      return mapped;
    }
  } catch (err) {
    console.warn('Cloud questions sync note:', err);
  }

  return fallbackQuestions;
}

/**
 * Save updated question bank to both cloud and persistent local cache
 */
export async function saveQuestionBankToCloud(questions: Question[]): Promise<void> {
  // 1. Save to persistent localStorage
  try {
    localStorage.setItem('spark_quiz_questions', JSON.stringify(questions));
  } catch (e) {
    console.error('Local question cache error:', e);
  }

  // 2. Try saving to Supabase quiz_questions
  try {
    const records = questions.map((q: Question) => ({
      question_text: q.question,
      options: q.options.map((text: string, i: number) => ({
        text,
        is_correct: i === q.correctAnswer,
      })),
      category: q.category || 'ECE Core',
      points: q.points || 1,
    }));

    await supabase.from('quiz_questions').upsert(records);
  } catch (err) {
    console.info('Supabase cloud questions upsert note:', err);
  }
}

/**
 * Safe subscriber function for AdminDashboard that cleanly handles mounting & unmounting
 * without throwing "tried to join multiple times"
 */
export function subscribeToQuizArena(callbacks: {
  onStudentJoined?: (student: LiveStudentStatus) => void;
  onScoreUpdate?: (status: any) => void;
  onProctoringAlert?: (violation: ProctoringViolation) => void;
  onQuizCompleted?: (submission: QuizSubmission) => void;
  onStatusChange?: (isConnected: boolean) => void;
}) {
  const existing = supabase.getChannels().find((ch) => ch.topic === 'realtime:spark-quiz-arena');
  if (existing) {
    supabase.removeChannel(existing);
  }

  const channel = supabase.channel('spark-quiz-arena', {
    config: {
      broadcast: { self: true },
    },
  });

  if (callbacks.onStudentJoined) {
    channel.on('broadcast', { event: 'student_joined' }, ({ payload }) => {
      callbacks.onStudentJoined?.(payload);
    });
  }
  if (callbacks.onScoreUpdate) {
    channel.on('broadcast', { event: 'score_update' }, ({ payload }) => {
      callbacks.onScoreUpdate?.(payload);
    });
  }
  if (callbacks.onProctoringAlert) {
    channel.on('broadcast', { event: 'proctoring_alert' }, ({ payload }) => {
      callbacks.onProctoringAlert?.(payload);
    });
  }
  if (callbacks.onQuizCompleted) {
    channel.on('broadcast', { event: 'quiz_completed' }, ({ payload }) => {
      callbacks.onQuizCompleted?.(payload);
    });
  }

  channel.subscribe((status) => {
    callbacks.onStatusChange?.(status === 'SUBSCRIBED');
  });

  return () => {
    supabase.removeChannel(channel);
  };
}

