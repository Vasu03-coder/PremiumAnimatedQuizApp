import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, ChevronRight, ChevronLeft, Check, X, RotateCcw, Award, ShieldAlert, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Data ---
const QUESTIONS = [
  {
    id: 1,
    question: "Which semiconductor device is primarily controlled by an electric field?",
    options: [
      "BJT (Bipolar Junction Transistor)",
      "MOSFET (Metal-Oxide-Semiconductor Field-Effect Transistor)",
      "SCR (Silicon Controlled Rectifier)",
      "TRIAC (Triode for Alternating Current)"
    ],
    correctAnswer: 1
  },
  {
    id: 2,
    question: "What is the primary function of a multiplexer?",
    options: [
      "To convert analog signals to digital",
      "To select one of several input signals and forward it to a single line",
      "To store digital data temporarily",
      "To amplify weak electronic signals"
    ],
    correctAnswer: 1
  },
  {
    id: 3,
    question: "In Boolean algebra, what is the result of A + A'?",
    options: [
      "A",
      "A'",
      "0",
      "1"
    ],
    correctAnswer: 3
  },
  {
    id: 4,
    question: "Which diode is commonly used for voltage regulation?",
    options: [
      "Zener Diode",
      "Tunnel Diode",
      "Light Emitting Diode (LED)",
      "Schottky Diode"
    ],
    correctAnswer: 0
  },
  {
    id: 5,
    question: "What does an operational amplifier (Op-Amp) do in its basic form?",
    options: [
      "Acts as a high-frequency oscillator",
      "Filters out low-frequency noise",
      "Amplifies the difference between two input voltages",
      "Converts AC to DC power"
    ],
    correctAnswer: 2
  }
];

// --- Types ---
type ScreenState = 'landing' | 'registration' | 'quiz' | 'result';
type UserData = {
  name: string;
  college: string;
  department: string;
  year: string;
  email: string;
  phone: string;
};

// --- Animations ---
const pageTransition = {
  initial: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 1.02, filter: 'blur(4px)' },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
};

const inputContainerVariant = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const inputItemVariant = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

// --- Thunder Background Component ---
function AtmosphericBackground() {
  const [thunder, setThunder] = useState(false);

  useEffect(() => {
    // Random occasional thunder
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 10s
        setThunder(true);
        setTimeout(() => setThunder(false), 800);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="stars-bg" />
      {/* Electric grid lines */}
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(0,217,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,217,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
      {/* Occasional Thunder Flash */}
      <div className="thunder-flash" style={{ animation: thunder ? 'thunder 0.8s ease-out' : 'none' }} />
    </>
  );
}

// --- Main App Component ---
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('landing');
  const [userData, setUserData] = useState<UserData>({
    name: '', college: '', department: '', year: '', email: '', phone: ''
  });
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(60); 
  
  // Handlers
  const handleStart = () => setCurrentScreen('registration');
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentScreen('quiz');
    setTimeLeft(60);
  };
  
  const handleAnswerSelect = (optionIndex: number) => {
    if (answers[currentQuestionIndex] !== undefined) return; // Prevent changing answer for effect
    setAnswers({ ...answers, [currentQuestionIndex]: optionIndex });
  };
  
  const handleNext = () => {
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(curr => curr + 1);
      setTimeLeft(60);
    } else {
      finishQuiz();
    }
  };
  
  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(curr => curr - 1);
    }
  };

  const finishQuiz = () => {
    setCurrentScreen('result');
    confetti({
      particleCount: 200,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#00D9FF', '#38F5FF', '#7C5CFF', '#00FF66', '#FFFFFF']
    });
  };

  const handleRestart = () => {
    setCurrentScreen('landing');
    setUserData({ name: '', college: '', department: '', year: '', email: '', phone: '' });
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(60);
  };

  // Timer Effect
  useEffect(() => {
    if (currentScreen === 'quiz' && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (currentScreen === 'quiz' && timeLeft === 0) {
      handleNext();
    }
  }, [timeLeft, currentScreen]);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden font-sans text-bright-white">
      <AtmosphericBackground />

      <AnimatePresence mode="wait">
        {currentScreen === 'landing' && (
          <motion.div key="landing" {...pageTransition} className="w-full max-w-5xl z-10">
            <LandingScreen onStart={handleStart} />
          </motion.div>
        )}
        
        {currentScreen === 'registration' && (
          <motion.div key="registration" {...pageTransition} className="w-full max-w-3xl z-10">
            <RegistrationScreen userData={userData} setUserData={setUserData} onSubmit={handleRegister} />
          </motion.div>
        )}
        
        {currentScreen === 'quiz' && (
          <motion.div key="quiz" {...pageTransition} className="w-full max-w-5xl z-10 h-full flex items-center">
            <QuizScreen 
              question={QUESTIONS[currentQuestionIndex]}
              questionIndex={currentQuestionIndex}
              totalQuestions={QUESTIONS.length}
              selectedAnswer={answers[currentQuestionIndex]}
              onAnswerSelect={handleAnswerSelect}
              onNext={handleNext}
              onPrev={handlePrev}
              timeLeft={timeLeft}
            />
          </motion.div>
        )}
        
        {currentScreen === 'result' && (
          <motion.div key="result" {...pageTransition} className="w-full max-w-4xl z-10">
            <ResultScreen 
              questions={QUESTIONS}
              answers={answers}
              onRestart={handleRestart}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Screens ---

function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.8 }}
        className="mb-6 flex items-center justify-center gap-3 text-electric-cyan font-mono tracking-widest text-sm uppercase"
      >
        <Activity size={18} className="animate-pulse" />
        Mission Control Interface Active
      </motion.div>
      
      <motion.h1 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-5xl sm:text-7xl font-bold tracking-tight mb-4 neon-text-blue"
      >
        ECE TECHNICAL QUIZ <span className="font-mono text-electric-cyan">2026</span>
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="text-xl sm:text-2xl text-bright-white/80 font-medium mb-8 max-w-2xl"
      >
        Test Your Electronics. Challenge Your Mind.
      </motion.p>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="text-muted-text max-w-2xl mx-auto mb-14 text-base sm:text-lg leading-relaxed"
      >
        A futuristic technical challenge covering Electronics, Digital Systems, Communication, Embedded Systems, Signals and Semiconductor Technology.
      </motion.p>
      
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="relative group bg-midnight-800/50 backdrop-blur-md border border-electric-blue text-bright-white px-10 py-4 rounded-lg font-mono tracking-wide text-lg shadow-[0_0_15px_rgba(0,217,255,0.3)] hover:shadow-[0_0_25px_rgba(0,217,255,0.6)] transition-all duration-300 flex items-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 bg-electric-blue/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <span className="relative z-10 flex items-center gap-2">
            START QUIZ <Zap size={20} className="text-electric-cyan" />
          </span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-muted-text hover:text-bright-white font-mono tracking-wide text-sm flex items-center gap-2 transition-colors"
        >
          <BookOpen size={16} /> HOW IT WORKS
        </motion.button>
      </div>
    </div>
  );
}

function RegistrationScreen({ userData, setUserData, onSubmit }: { 
  userData: UserData, 
  setUserData: React.Dispatch<React.SetStateAction<UserData>>,
  onSubmit: (e: React.FormEvent) => void 
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUserData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="glass-panel-dark rounded-2xl p-8 sm:p-12 relative overflow-hidden">
      {/* Decorative circuit lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-electric-blue to-transparent opacity-50" />
      <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-electric-cyan to-transparent opacity-50" />
      
      <div className="mb-10 text-center sm:text-left flex items-start justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 neon-text-blue tracking-wide">ENTER THE CHALLENGE</h2>
          <p className="text-muted-text font-mono text-sm">SECURE CONNECTION ESTABLISHED</p>
        </div>
        <div className="hidden sm:flex h-12 w-12 border border-electric-blue/30 bg-electric-blue/10 rounded-lg items-center justify-center text-electric-cyan shadow-[0_0_15px_rgba(0,217,255,0.2)]">
          <ShieldAlert size={24} />
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <motion.div variants={inputContainerVariant} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <motion.div variants={inputItemVariant} className="space-y-2">
            <label className="text-xs font-mono text-electric-blue uppercase tracking-wider">Full Name</label>
            <input required name="name" value={userData.name} onChange={handleChange} className="w-full glass-input rounded-md px-4 py-3 transition-all" placeholder="Enter identity..." />
          </motion.div>
          <motion.div variants={inputItemVariant} className="space-y-2">
            <label className="text-xs font-mono text-electric-blue uppercase tracking-wider">Email Address</label>
            <input required type="email" name="email" value={userData.email} onChange={handleChange} className="w-full glass-input rounded-md px-4 py-3 transition-all" placeholder="Enter comms link..." />
          </motion.div>
          <motion.div variants={inputItemVariant} className="space-y-2">
            <label className="text-xs font-mono text-electric-blue uppercase tracking-wider">Phone Number</label>
            <input required type="tel" name="phone" value={userData.phone} onChange={handleChange} className="w-full glass-input rounded-md px-4 py-3 transition-all" placeholder="Enter frequency..." />
          </motion.div>
          <motion.div variants={inputItemVariant} className="space-y-2">
            <label className="text-xs font-mono text-electric-blue uppercase tracking-wider">College Name</label>
            <input required name="college" value={userData.college} onChange={handleChange} className="w-full glass-input rounded-md px-4 py-3 transition-all" placeholder="Enter origin..." />
          </motion.div>
          <motion.div variants={inputItemVariant} className="space-y-2">
            <label className="text-xs font-mono text-electric-blue uppercase tracking-wider">Department</label>
            <select required name="department" value={userData.department} onChange={handleChange} className="w-full glass-input rounded-md px-4 py-3 transition-all appearance-none cursor-pointer">
              <option value="" className="bg-midnight-900">Select Branch</option>
              <option value="ECE" className="bg-midnight-900">ECE</option>
              <option value="EEE" className="bg-midnight-900">EEE</option>
              <option value="CSE" className="bg-midnight-900">CSE</option>
              <option value="Other" className="bg-midnight-900">Other</option>
            </select>
          </motion.div>
          <motion.div variants={inputItemVariant} className="space-y-2">
            <label className="text-xs font-mono text-electric-blue uppercase tracking-wider">Year</label>
            <select required name="year" value={userData.year} onChange={handleChange} className="w-full glass-input rounded-md px-4 py-3 transition-all appearance-none cursor-pointer">
              <option value="" className="bg-midnight-900">Select Level</option>
              <option value="1" className="bg-midnight-900">Level 1 (First Year)</option>
              <option value="2" className="bg-midnight-900">Level 2 (Second Year)</option>
              <option value="3" className="bg-midnight-900">Level 3 (Third Year)</option>
              <option value="4" className="bg-midnight-900">Level 4 (Fourth Year)</option>
            </select>
          </motion.div>
        </motion.div>

        <div className="pt-6 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="bg-electric-blue/10 border border-electric-blue text-electric-cyan px-8 py-3 rounded-lg font-mono tracking-wider text-sm flex items-center gap-2 hover:bg-electric-blue/20 shadow-[0_0_15px_rgba(0,217,255,0.2)] hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] transition-all"
          >
            CONTINUE TO QUIZ <ChevronRight size={18} />
          </motion.button>
        </div>
      </form>
    </div>
  );
}

function QuizScreen({ question, questionIndex, totalQuestions, selectedAnswer, onAnswerSelect, onNext, onPrev, timeLeft }: any) {
  const progress = ((questionIndex + 1) / totalQuestions) * 100;
  
  // Timer color transition
  const timerColor = timeLeft <= 10 ? 'text-electric-red' : (timeLeft <= 30 ? 'text-yellow-400' : 'text-electric-cyan');
  
  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-bright-white/90 mb-1">ECE TECHNICAL QUIZ <span className="text-electric-blue font-mono">2026</span></h1>
          <div className="text-electric-cyan font-mono text-sm tracking-widest flex items-center gap-2 neon-text-cyan">
            <Activity size={14} /> QUESTION {String(questionIndex + 1).padStart(2, '0')} / {totalQuestions}
          </div>
        </div>
        
        <div className={cn("flex flex-col items-end gap-1 font-mono text-xl sm:text-2xl font-bold tracking-widest transition-colors duration-300", timerColor, timeLeft <= 10 && 'animate-pulse')}>
          <span className="text-[10px] text-muted-text uppercase tracking-widest">TIMER</span>
          00:{timeLeft.toString().padStart(2, '0')}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-midnight-800 rounded-full overflow-hidden border border-white/5 relative">
        <motion.div 
          className="absolute top-0 left-0 h-full bg-electric-cyan"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{ boxShadow: '0 0 10px #38F5FF, 0 0 20px #00D9FF' }}
        />
        {/* Moving electric pulse on progress bar */}
        <div className="absolute top-0 left-0 w-20 h-full bg-white/50 blur-[2px] -translate-x-full animate-[pulse-right_2s_infinite]" />
      </div>

      {/* Question Card */}
      <motion.div 
        key={question.id}
        initial={{ opacity: 0, x: 50, filter: 'blur(4px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: -50, filter: 'blur(4px)' }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass-panel-dark rounded-2xl p-6 sm:p-10 flex flex-col min-h-[450px] relative group"
      >
        {/* Subtle glowing circuit corner accents */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-electric-blue/30 rounded-tl-2xl opacity-50 group-hover:opacity-100 group-hover:border-electric-blue transition-all duration-500" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-electric-blue/30 rounded-br-2xl opacity-50 group-hover:opacity-100 group-hover:border-electric-blue transition-all duration-500" />
        
        <h2 className="text-2xl sm:text-3xl font-medium mb-10 leading-relaxed max-w-4xl">
          {question.question}
        </h2>

        <div className="space-y-4 mb-8 flex-1">
          {question.options.map((opt: string, i: number) => {
            const isSelected = selectedAnswer === i;
            const isCorrect = question.correctAnswer === i;
            const showResult = selectedAnswer !== undefined; // User has answered
            
            let statusClasses = "border-electric-blue/20 bg-midnight-800/40 hover:bg-midnight-800/80 hover:border-electric-cyan hover:shadow-[0_0_15px_rgba(56,245,255,0.15)] hover:translate-x-2";
            let letterClasses = "border-electric-blue/30 text-electric-blue group-hover/opt:border-electric-cyan group-hover/opt:text-electric-cyan group-hover/opt:shadow-[0_0_10px_rgba(56,245,255,0.4)]";
            let icon = null;
            
            if (showResult) {
              if (i === question.correctAnswer) {
                statusClasses = "border-electric-green shadow-[0_0_20px_rgba(0,255,102,0.3)] bg-electric-green/10";
                letterClasses = "border-electric-green bg-electric-green text-midnight-900 shadow-[0_0_15px_rgba(0,255,102,0.6)]";
                icon = <Check size={20} className="text-electric-green" />;
              } else if (isSelected && !isCorrect) {
                statusClasses = "border-electric-red shadow-[0_0_20px_rgba(255,51,102,0.3)] bg-electric-red/10 animate-[shake_0.4s_ease-in-out]";
                letterClasses = "border-electric-red bg-electric-red text-bright-white shadow-[0_0_15px_rgba(255,51,102,0.6)]";
                icon = <X size={20} className="text-electric-red" />;
              } else {
                statusClasses = "border-white/5 bg-transparent opacity-50";
                letterClasses = "border-white/10 text-muted-text";
              }
            }

            return (
              <motion.button
                key={i}
                disabled={showResult}
                onClick={() => onAnswerSelect(i)}
                className={cn(
                  "w-full text-left p-5 rounded-xl border backdrop-blur-sm transition-all duration-300 flex items-center justify-between gap-4 text-lg group/opt",
                  statusClasses
                )}
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono text-sm font-bold transition-all duration-300",
                    letterClasses
                  )}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className={cn("text-bright-white/90", showResult && !isCorrect && !isSelected && "text-muted-text")}>
                    {opt}
                  </span>
                </div>
                {icon && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{icon}</motion.div>}
              </motion.button>
            );
          })}
        </div>
        
        {/* Footer Controls */}
        <div className="flex justify-between items-center mt-auto pt-6 border-t border-electric-blue/10">
          <button 
            onClick={onPrev}
            disabled={questionIndex === 0}
            className="px-6 py-3 rounded-lg font-mono text-sm tracking-wider text-muted-text flex items-center gap-2 hover:text-bright-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ChevronLeft size={16} /> PREVIOUS
          </button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNext}
            className="bg-electric-blue/10 border border-electric-blue text-electric-cyan px-8 py-3 rounded-lg font-mono tracking-wider text-sm flex items-center gap-2 hover:bg-electric-blue/20 shadow-[0_0_15px_rgba(0,217,255,0.2)] hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] transition-all"
          >
            {questionIndex === totalQuestions - 1 ? 'FINISH QUIZ' : 'NEXT QUESTION'} <ChevronRight size={16} />
          </motion.button>
        </div>
      </motion.div>
      
      {/* Global CSS keyframes for specific animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-right {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(500%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
      `}} />
    </div>
  );
}

function ResultScreen({ questions, answers, onRestart }: any) {
  const [displayScore, setDisplayScore] = useState(0);
  
  let actualScore = 0;
  questions.forEach((q: any, index: number) => {
    if (answers[index] === q.correctAnswer) actualScore++;
  });
  
  const percentage = Math.round((actualScore / questions.length) * 100);
  const wrongCount = questions.length - actualScore;

  // Animated score counter
  useEffect(() => {
    let start = 0;
    const end = actualScore;
    if (start === end) return;
    
    let totalDuration = 1500;
    let incrementTime = (totalDuration / end);
    
    let timer = setInterval(() => {
      start += 1;
      setDisplayScore(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [actualScore]);

  return (
    <div className="glass-panel-dark rounded-2xl p-8 sm:p-12 relative overflow-hidden text-center">
      {/* Background glow for result */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-electric-blue/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border border-electric-blue/40 bg-electric-blue/10 text-electric-cyan shadow-[0_0_30px_rgba(0,217,255,0.2)] mb-8">
        <Award size={40} />
      </div>
      
      <h2 className="text-3xl font-bold mb-2 neon-text-blue tracking-widest">CHALLENGE COMPLETE</h2>
      <p className="text-electric-cyan font-mono tracking-widest mb-10 text-sm">EXCELLENT PERFORMANCE</p>
      
      <div className="grid grid-cols-2 gap-4 mb-10 max-w-2xl mx-auto">
        <div className="glass-card-dark p-6 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-electric-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-xs font-mono text-muted-text mb-2 tracking-widest">YOUR SCORE</div>
          <div className="text-5xl font-bold font-mono text-bright-white neon-text-blue">
            {displayScore}<span className="text-2xl text-white/30">/{questions.length}</span>
          </div>
        </div>
        <div className="glass-card-dark p-6 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-electric-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-xs font-mono text-muted-text mb-2 tracking-widest">PERCENTAGE</div>
          <div className="text-5xl font-bold font-mono text-electric-purple shadow-electric-purple/50 drop-shadow-[0_0_15px_rgba(124,92,255,0.6)]">
            {Math.round((displayScore / questions.length) * 100)}%
          </div>
        </div>
        
        <div className="glass-card-dark p-4 rounded-xl flex flex-col items-center justify-center border-electric-green/20">
          <div className="text-xs font-mono text-muted-text mb-1 tracking-widest">CORRECT</div>
          <div className="text-2xl font-bold font-mono text-electric-green drop-shadow-[0_0_10px_rgba(0,255,102,0.4)]">{displayScore}</div>
        </div>
        <div className="glass-card-dark p-4 rounded-xl flex flex-col items-center justify-center border-electric-red/20">
          <div className="text-xs font-mono text-muted-text mb-1 tracking-widest">WRONG</div>
          <div className="text-2xl font-bold font-mono text-electric-red drop-shadow-[0_0_10px_rgba(255,51,102,0.4)]">{questions.length - displayScore}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
          className="w-full sm:w-auto bg-electric-blue/20 border border-electric-blue text-electric-cyan px-8 py-4 rounded-lg font-mono tracking-wider text-sm flex items-center justify-center gap-3 hover:bg-electric-blue/30 shadow-[0_0_15px_rgba(0,217,255,0.2)] hover:shadow-[0_0_25px_rgba(0,217,255,0.4)] transition-all"
        >
          <RotateCcw size={18} /> RETAKE QUIZ
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full sm:w-auto bg-transparent border border-white/20 text-bright-white px-8 py-4 rounded-lg font-mono tracking-wider text-sm flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
        >
          VIEW ANSWERS
        </motion.button>
      </div>
    </div>
  );
}
