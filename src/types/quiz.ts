export interface Question {
  id: number | string;
  question: string;
  options: string[];
  correctAnswer: number;
  category?: string;
  points?: number;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  college?: string;
  department?: string;
  year?: string;
  isLeader?: boolean;
}

export interface StudentProfile {
  id?: string;
  registration_id?: string;
  registration_code?: string;
  passcode?: string;
  full_name: string;
  email: string;
  college?: string;
  department?: string;
  phone?: string;
  is_verified?: boolean;
  is_demo?: boolean;
  team_name?: string;
  members?: TeamMember[];
  sessionId?: string;
}

export type QuizSessionState = 'lobby' | 'countdown' | 'in_progress';

export interface QuizScheduleConfig {
  state: QuizSessionState;
  isQuizActive: boolean;
  countdownSeconds?: number;
  countdownEndTime?: string | null;
  scheduledStartTime?: string | null;
  targetClockTime?: string;
  durationMinutes?: number;
  message?: string;
  startedAt?: string | null;
}

export interface ProctoringViolation {
  id: string;
  studentName: string;
  studentEmail: string;
  violationType: 'tab_switch' | 'screenshot' | 'window_blur' | 'devtools_or_print';
  questionIndex: number;
  timestamp: string;
  penaltyApplied: boolean;
}

export interface LiveStudentStatus {
  studentId: string;
  name: string;
  email: string;
  college: string;
  department?: string;
  passcode?: string;
  teamName?: string;
  members?: TeamMember[];
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  violationsCount: number;
  status: 'lobby' | 'active' | 'completed' | 'flagged' | 'offline';
  lastSeen: string;
  completedAt?: string;
  isOnline?: boolean;
  activeSessionId?: string;
  activeMemberName?: string;
}

export interface QuizSubmission {
  id?: string;
  registration_id?: string;
  participant_name: string;
  participant_email: string;
  score: number;
  total_questions: number;
  violations_count: number;
  answers: Record<number, number>;
  penalized_questions: Record<number, boolean>;
  completed_at: string;
}
