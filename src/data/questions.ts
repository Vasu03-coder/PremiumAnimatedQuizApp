import type { Question } from '../types/quiz';

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Which semiconductor device is primarily controlled by an electric field?",
    options: [
      "BJT (Bipolar Junction Transistor)",
      "MOSFET (Metal-Oxide-Semiconductor Field-Effect Transistor)",
      "SCR (Silicon Controlled Rectifier)",
      "TRIAC (Triode for Alternating Current)"
    ],
    correctAnswer: 1,
    category: "Semiconductors",
    points: 1
  },
  {
    id: 2,
    question: "What is the primary function of a digital multiplexer (MUX)?",
    options: [
      "To convert analog signals into digital pulses",
      "To route one of several data inputs to a single output line based on select inputs",
      "To store digital binary data temporarily across clock cycles",
      "To modulate the frequency of high-speed digital carriers"
    ],
    correctAnswer: 1,
    category: "Digital Electronics",
    points: 1
  },
  {
    id: 3,
    question: "In Boolean algebra, what is the simplified value of the expression: A + A'B?",
    options: [
      "A + B",
      "A' + B",
      "A · B",
      "1"
    ],
    correctAnswer: 0,
    category: "Digital Logic",
    points: 1
  },
  {
    id: 4,
    question: "Which diode operating mode is specifically utilized for precision DC voltage regulation?",
    options: [
      "Zener breakdown in reverse-bias",
      "Tunneling in high forward-bias",
      "Spontaneous emission in forward-bias",
      "Avalanche photo-conduction"
    ],
    correctAnswer: 0,
    category: "Electronic Devices",
    points: 1
  },
  {
    id: 5,
    question: "According to the Nyquist-Shannon sampling theorem, what is the minimum sampling frequency required for a signal with maximum frequency fm?",
    options: [
      "fm / 2",
      "fm",
      "2 × fm",
      "4 × fm"
    ],
    correctAnswer: 2,
    category: "Signals & Systems",
    points: 1
  },
  {
    id: 6,
    question: "What is the theoretical Common Mode Rejection Ratio (CMRR) of an ideal Operational Amplifier?",
    options: [
      "Zero",
      "Unity (1)",
      "100 dB",
      "Infinity (∞)"
    ],
    correctAnswer: 3,
    category: "Analog Circuits",
    points: 1
  },
  {
    id: 7,
    question: "In an 8051 microcontroller architecture, how many 8-bit bidirectional I/O ports are present?",
    options: [
      "2 Ports (P0, P1)",
      "4 Ports (P0, P1, P2, P3)",
      "6 Ports (P0 to P5)",
      "8 Ports"
    ],
    correctAnswer: 1,
    category: "Embedded Systems",
    points: 1
  },
  {
    id: 8,
    question: "What is the skin depth (δ) in a high-conductivity electromagnetic conductor inversely proportional to?",
    options: [
      "Square root of frequency (√f)",
      "Frequency squared (f²)",
      "Permittivity only (ε)",
      "Wavelength (λ)"
    ],
    correctAnswer: 0,
    category: "Electromagnetics",
    points: 1
  },
  {
    id: 9,
    question: "Which flip-flop architecture resolves the race-around condition typically seen in JK flip-flops?",
    options: [
      "Master-Slave JK Flip-Flop",
      "Basic SR Latch",
      "Unclocked D Latch",
      "T Latch with propagation delay"
    ],
    correctAnswer: 0,
    category: "Digital Electronics",
    points: 1
  },
  {
    id: 10,
    question: "In wireless and satellite communications, which modulation technique varies both amplitude and phase simultaneously?",
    options: [
      "BPSK (Binary Phase Shift Keying)",
      "QAM (Quadrature Amplitude Modulation)",
      "FSK (Frequency Shift Keying)",
      "PWM (Pulse Width Modulation)"
    ],
    correctAnswer: 1,
    category: "Communication Systems",
    points: 1
  }
];

// Helper to shuffle questions and their options per student
export function getShuffledQuestions(questions: Question[]): Question[] {
  // Fisher-Yates shuffle on a copy
  const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

  return shuffledQuestions.map((q) => {
    // Keep track of the original correct text
    const correctOptionText = q.options[q.correctAnswer];
    // Shuffle options
    const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
    // Find new correct index
    const newCorrectAnswer = shuffledOptions.indexOf(correctOptionText);

    return {
      ...q,
      options: shuffledOptions,
      correctAnswer: newCorrectAnswer,
    };
  });
}
