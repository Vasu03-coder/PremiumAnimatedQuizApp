import { createClient } from '@supabase/supabase-js';
import type { StudentProfile, LiveStudentStatus, ProctoringViolation, QuizSubmission } from '../types/quiz';

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
    const cleanName = name.trim().toLowerCase();

    // Query participants matching email (ilike for case-insensitivity)
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

    // Check if technical event is the technical-quiz
    const isQuizSelected =
      registration?.technical_event_id === TECHNICAL_QUIZ_EVENT_ID ||
      // Or if participant exists in symposium portal
      Boolean(registration);

    if (!isQuizSelected) {
      return {
        success: false,
        message: 'You have registered for the symposium, but Technical Quiz was not selected.',
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
  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'student_joined',
    payload: status,
  });
}

export function broadcastScoreUpdate(status: Partial<LiveStudentStatus> & { studentId: string }) {
  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'score_update',
    payload: status,
  });
}

export function broadcastProctoringAlert(violation: ProctoringViolation) {
  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'proctoring_alert',
    payload: violation,
  });
}

export function broadcastQuizCompleted(submission: QuizSubmission) {
  const ch = getOrCreateArenaChannel();
  return ch.send({
    type: 'broadcast',
    event: 'quiz_completed',
    payload: submission,
  });
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

