import { createClient } from '@supabase/supabase-js';
import type {
  Question,
  StudentProfile,
  LiveStudentStatus,
  ProctoringViolation,
  QuizSubmission,
  TeamMember,
} from '../types/quiz';

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
  teamName?: string;
  members?: TeamMember[];
}

// Built-in verified candidate passcodes connected directly to registered email addresses
export const PREDEFINED_PASSCODES: Record<string, CandidatePasscodeMapping> = {
  // Official Registered Symposium Team (From Supabase registrations)
  'SPARK26002': {
    passcode: 'SPARK26002',
    email: 'josephsamuvel1310@gmail.com',
    fullName: 'codehex (Joseph S & Sam)',
    college: 'TEC',
    department: 'ECE',
    teamName: 'codehex',
    isDemo: false,
    members: [
      {
        id: 'ef5ee997-9550-48d1-bb86-7c8120d84cf5',
        fullName: 'Joseph S',
        email: 'josephsamuvel1310@gmail.com',
        phone: '1234567890',
        college: 'TEC',
        department: 'ECE',
        year: '1st Year',
        isLeader: true,
      },
      {
        id: '0bd6080d-d95e-4031-bdd0-c839a102ce9e',
        fullName: 'Sam',
        email: 'josephsamuvel1310l@gmail.com',
        phone: '0987654345',
        college: 'TEC',
        department: 'ECE',
        year: '4th Year',
        isLeader: false,
      },
    ],
  },

  // Demo / Evaluator Account (Bypasses start countdown timer completely)
  'DEMO2026': {
    passcode: 'DEMO2026',
    email: 'demo@spark2026.com',
    fullName: 'Demo Candidate (Tester)',
    college: 'SPARKTRON Institute of Technology',
    department: 'ECE',
    teamName: 'Demo Team',
    isDemo: true,
    members: [
      {
        id: 'demo-leader',
        fullName: 'Demo Candidate (Tester)',
        email: 'demo@spark2026.com',
        college: 'SPARKTRON Institute of Technology',
        department: 'ECE',
        isLeader: true,
      },
    ],
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

export interface ActivePasscodeSession {
  passcode: string;
  sessionId: string;
  memberName: string;
  startedAt: string;
  lastHeartbeat: number;
}

/**
 * Check if a passcode has an active session on another device/browser
 */
export function isPasscodeSessionActive(
  passcode: string,
  mySessionId?: string
): { active: boolean; activeMember?: string; activeSince?: string } {
  try {
    const clean = (passcode || '').trim().toUpperCase();
    if (!clean) return { active: false };

    const mapStr = localStorage.getItem('spark_active_passcode_sessions');
    if (!mapStr) return { active: false };

    const map: Record<string, ActivePasscodeSession> = JSON.parse(mapStr);
    const session = map[clean];
    if (!session) return { active: false };

    // Same session / tab refresh allowed
    if (mySessionId && session.sessionId === mySessionId) {
      return { active: false };
    }

    // Active session threshold: active if heartbeat within last 35 seconds
    const elapsed = Date.now() - (session.lastHeartbeat || 0);
    if (elapsed < 35000) {
      return { active: true, activeMember: session.memberName, activeSince: session.startedAt };
    }
  } catch (e) {}
  return { active: false };
}

export function claimPasscodeSession(passcode: string, sessionId: string, memberName: string) {
  try {
    const clean = (passcode || '').trim().toUpperCase();
    if (!clean || !sessionId) return;

    const mapStr = localStorage.getItem('spark_active_passcode_sessions');
    const map: Record<string, ActivePasscodeSession> = mapStr ? JSON.parse(mapStr) : {};
    map[clean] = {
      passcode: clean,
      sessionId,
      memberName,
      startedAt: new Date().toISOString(),
      lastHeartbeat: Date.now(),
    };
    localStorage.setItem('spark_active_passcode_sessions', JSON.stringify(map));

    if (syncBroadcastChannel) {
      try {
        syncBroadcastChannel.postMessage({
          type: 'passcode_session_claimed',
          payload: { passcode: clean, sessionId, memberName },
        });
      } catch (e) {}
    }
  } catch (e) {}
}

export function heartbeatPasscodeSession(passcode: string, sessionId: string) {
  try {
    const clean = (passcode || '').trim().toUpperCase();
    if (!clean || !sessionId) return;

    const mapStr = localStorage.getItem('spark_active_passcode_sessions');
    if (!mapStr) return;

    const map: Record<string, ActivePasscodeSession> = JSON.parse(mapStr);
    if (map[clean] && map[clean].sessionId === sessionId) {
      map[clean].lastHeartbeat = Date.now();
      localStorage.setItem('spark_active_passcode_sessions', JSON.stringify(map));
    }
  } catch (e) {}
}

export function releasePasscodeSession(passcode: string, sessionId?: string) {
  try {
    const clean = (passcode || '').trim().toUpperCase();
    if (!clean) return;

    const mapStr = localStorage.getItem('spark_active_passcode_sessions');
    if (!mapStr) return;

    const map: Record<string, ActivePasscodeSession> = JSON.parse(mapStr);
    if (map[clean]) {
      if (!sessionId || map[clean].sessionId === sessionId) {
        delete map[clean];
        localStorage.setItem('spark_active_passcode_sessions', JSON.stringify(map));
      }
    }

    if (syncBroadcastChannel) {
      try {
        syncBroadcastChannel.postMessage({
          type: 'passcode_session_released',
          payload: { passcode: clean },
        });
      } catch (e) {}
    }
  } catch (e) {}
}

/**
 * Verify candidate login using BOTH their unique PASSCODE and REGISTERED EMAIL.
 * Two-factor validation prevents code-guessing and team impersonation.
 * The entered email MUST match either team member's registered email for that passcode.
 */
export async function verifyStudentByPasscode(
  passcodeInput: string,
  emailInput: string,
  candidateSessionId?: string
): Promise<{ success: boolean; student?: StudentProfile; message?: string }> {
  try {
    const cleanPasscode = (passcodeInput || '').trim().toUpperCase();
    const cleanEmail = (emailInput || '').trim().toLowerCase();

    if (!cleanPasscode) {
      return { success: false, message: 'Please enter your Candidate Assessment Passcode.' };
    }
    if (!cleanEmail) {
      return { success: false, message: 'Please enter your team\'s Registered Email Address.' };
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, message: 'Please enter a valid email address format (e.g. yourname@gmail.com).' };
    }

    let candidateData: {
      passcode: string;
      fullName: string;
      teamName?: string;
      college?: string;
      department?: string;
      isDemo?: boolean;
      members: TeamMember[];
      primaryEmail: string;
      registrationId?: string;
    } | null = null;

    // 1. Check in PREDEFINED_PASSCODES by Passcode
    if (PREDEFINED_PASSCODES[cleanPasscode]) {
      const match = PREDEFINED_PASSCODES[cleanPasscode];
      const members: TeamMember[] = match.members && match.members.length > 0 ? match.members : [
        {
          id: `lead-${match.passcode.toLowerCase()}`,
          fullName: match.fullName,
          email: match.email,
          college: match.college,
          department: match.department,
          isLeader: true,
        }
      ];

      candidateData = {
        passcode: match.passcode,
        fullName: match.fullName,
        teamName: match.teamName,
        college: match.college,
        department: match.department,
        isDemo: match.isDemo || false,
        members,
        primaryEmail: match.email,
        registrationId: `reg-${match.passcode.toLowerCase()}`,
      };
    } else {
      // 2. Query Supabase registrations by registration_code (Passcode)
      const { data: reg, error: regErr } = await supabase
        .from('registrations')
        .select(
          'id, registration_code, technical_event_id, status, team_name, participants(id, registration_id, full_name, email, phone, college, department, is_team_leader, year)'
        )
        .ilike('registration_code', cleanPasscode)
        .maybeSingle();

      if (reg && !regErr) {
        if (reg.technical_event_id !== TECHNICAL_QUIZ_EVENT_ID) {
          return {
            success: false,
            message: 'Access Denied: This passcode is registered for another symposium event, not the Technical Quiz.',
          };
        }

        const parts = Array.isArray(reg.participants) ? reg.participants : [];
        const leader = parts.find((p: any) => p.is_team_leader) || parts[0] || {};
        const members: TeamMember[] = parts.map((p: any) => ({
          id: p.id,
          fullName: p.full_name || 'Member',
          email: p.email,
          phone: p.phone,
          college: p.college,
          department: p.department,
          year: p.year,
          isLeader: p.is_team_leader || false,
        }));

        const teamDisplayName = reg.team_name
          ? `${reg.team_name} (${members.map((m) => m.fullName).join(' & ') || leader.full_name})`
          : leader.full_name || 'Technical Quiz Team';

        candidateData = {
          passcode: reg.registration_code,
          fullName: teamDisplayName,
          teamName: reg.team_name || undefined,
          college: leader.college || 'Engineering College',
          department: leader.department || 'ECE',
          isDemo: false,
          members,
          primaryEmail: leader.email || '',
          registrationId: reg.id,
        };
      }
    }

    if (!candidateData) {
      return {
        success: false,
        message: `Invalid Passcode "${passcodeInput}". No Technical Quiz registration found for this passcode.`,
      };
    }

    // Two-Factor Verification: Check if the entered email matches either member of this team!
    const isEmailMatched =
      candidateData.primaryEmail.toLowerCase() === cleanEmail ||
      candidateData.members.some((m) => m.email && m.email.toLowerCase() === cleanEmail);

    if (!isEmailMatched) {
      return {
        success: false,
        message: `Email Verification Failed: The email "${cleanEmail}" is NOT registered for Passcode "${cleanPasscode}". Please enter the registered email of either team member.`,
      };
    }

    const matchedMember = candidateData.members.find((m) => m.email && m.email.toLowerCase() === cleanEmail);

    const resolvedProfile: StudentProfile = {
      id: matchedMember?.id || `id-${candidateData.passcode.toLowerCase()}`,
      registration_id: candidateData.registrationId,
      registration_code: candidateData.passcode,
      passcode: candidateData.passcode,
      full_name: candidateData.fullName,
      email: cleanEmail,
      college: matchedMember?.college || candidateData.college || 'Engineering College',
      department: matchedMember?.department || candidateData.department || 'ECE',
      phone: matchedMember?.phone || '',
      team_name: candidateData.teamName,
      members: candidateData.members,
      is_verified: true,
      is_demo: candidateData.isDemo || false,
    };

    // 3. Single-Attempt Check: Check if candidate or passcode has completed
    const completionCheck = isStudentCompleted(resolvedProfile.email, resolvedProfile.passcode);
    if (completionCheck.completed) {
      return {
        success: false,
        message: `Assessment Completed: Candidate team has already submitted this examination (Score: ${
          completionCheck.score ?? 0
        } pts). Multiple attempts are locked. If you encountered an issue (such as a call interruption), please ask the administrator to grant a Re-round.`,
      };
    }

    // 4. Duplicate Concurrent Login Check: Only ONE active session allowed per passcode
    const effectivePasscode = resolvedProfile.passcode || resolvedProfile.registration_code || '';
    const activeCheck = isPasscodeSessionActive(effectivePasscode, candidateSessionId);
    if (activeCheck.active) {
      return {
        success: false,
        message: `Session Already Active: Another device is currently active in this quiz session with passcode "${effectivePasscode}". Simultaneous duplicate logins with the same passcode are prohibited. Please coordinate with your teammate or contact Admin.`,
      };
    }

    // 5. Claim session
    if (candidateSessionId) {
      claimPasscodeSession(effectivePasscode, candidateSessionId, resolvedProfile.full_name);
      resolvedProfile.sessionId = candidateSessionId;
    }

    return {
      success: true,
      student: resolvedProfile,
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

export interface TechnicalQuizRegistration {
  id: string;
  registration_id: string;
  registration_code: string;
  passcode: string;
  team_name?: string;
  full_name: string;
  email: string;
  phone?: string;
  college: string;
  department: string;
  created_at: string;
  members: TeamMember[];
  isDemo?: boolean;
}

/**
 * Fetch ONLY registered teams/candidates for the Technical Quiz event
 * Groups team members into a single unified assessment registration with their real pass code
 */
export async function getTechnicalQuizParticipants(): Promise<TechnicalQuizRegistration[]> {
  try {
    const { data: regs, error } = await supabase
      .from('registrations')
      .select(
        'id, registration_code, technical_event_id, status, team_name, created_at, participants(id, registration_id, full_name, email, phone, college, department, is_team_leader, year)'
      )
      .eq('technical_event_id', TECHNICAL_QUIZ_EVENT_ID);

    if (!error && regs && regs.length > 0) {
      const dbTeams: TechnicalQuizRegistration[] = regs.map((reg) => {
        const parts = Array.isArray(reg.participants) ? reg.participants : [];
        const leader = parts.find((p: any) => p.is_team_leader) || parts[0] || {};
        const teamMembers: TeamMember[] = parts.map((p: any) => ({
          id: p.id,
          fullName: p.full_name || 'Member',
          email: p.email || '',
          phone: p.phone || '',
          college: p.college || 'Engineering College',
          department: p.department || 'ECE',
          year: p.year || '',
          isLeader: p.is_team_leader || false,
        }));

        const teamDisplayName = reg.team_name
          ? `${reg.team_name} (${teamMembers.map((m) => m.fullName).join(' & ') || leader.full_name})`
          : leader.full_name || 'Technical Quiz Team';

        return {
          id: reg.id,
          registration_id: reg.id,
          registration_code: reg.registration_code,
          passcode: reg.registration_code,
          team_name: reg.team_name || undefined,
          full_name: teamDisplayName,
          email: leader.email || `team_${reg.registration_code.toLowerCase()}@spark2026.com`,
          phone: leader.phone || '',
          college: leader.college || 'Engineering College',
          department: leader.department || 'ECE',
          created_at: reg.created_at || new Date().toISOString(),
          members: teamMembers,
          isDemo: false,
        };
      });

      // Always include Demo account at the top for testing
      const demoAccount: TechnicalQuizRegistration = {
        id: 'demo-tester-id',
        registration_id: 'reg-demo-2026',
        registration_code: 'DEMO2026',
        passcode: 'DEMO2026',
        team_name: 'Evaluator Demo',
        full_name: 'Demo Candidate (Tester)',
        email: 'demo@spark2026.com',
        college: 'SPARKTRON Institute of Technology',
        department: 'ECE',
        created_at: new Date().toISOString(),
        members: [
          {
            id: 'demo-lead',
            fullName: 'Demo Candidate (Tester)',
            email: 'demo@spark2026.com',
            isLeader: true,
            department: 'ECE',
          },
        ],
        isDemo: true,
      };

      return [demoAccount, ...dbTeams];
    }
  } catch (err) {
    console.error('getTechnicalQuizParticipants error:', err);
  }

  // Predefined Fallback if DB query returns 0
  return Object.values(PREDEFINED_PASSCODES).map((p, idx) => ({
    id: `reg-${p.passcode.toLowerCase()}`,
    registration_id: `reg-${p.passcode.toLowerCase()}`,
    registration_code: p.passcode,
    passcode: p.passcode,
    team_name: p.teamName,
    full_name: p.fullName,
    email: p.email,
    phone: '9876543210',
    college: p.college,
    department: p.department,
    created_at: new Date().toISOString(),
    members: p.members || [
      {
        id: `part-${idx + 1}`,
        fullName: p.fullName,
        email: p.email,
        college: p.college,
        department: p.department,
        isLeader: true,
      },
    ],
    isDemo: p.isDemo || false,
  }));
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

export function broadcastResetStudent(studentEmail: string, passcode?: string) {
  clearStudentCompleted(studentEmail, passcode);
  if (passcode) {
    releasePasscodeSession(passcode);
  }
  const payload = {
    studentEmail: (studentEmail || '').toLowerCase(),
    passcode: (passcode || '').toUpperCase(),
  };
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

export type QuizSessionState = 'lobby' | 'countdown' | 'in_progress';

export interface QuizSchedulePayload {
  state: QuizSessionState; // 'lobby' (waiting for admin to start), 'countdown' (10s countdown), 'in_progress'
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
      // Ensure state exists and clean any legacy 'paused' state
      if (!parsed.state || parsed.state === 'paused') {
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
    state: isQuizActive ? 'in_progress' : 'lobby',
    isQuizActive,
    message: isQuizActive ? 'Quiz started by Administrator' : 'Quiz returned to Waiting Lobby',
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

