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
  },
  {
    id: 11,
    question: "Which feedback topology is used in a standard operational amplifier inverting amplifier?",
    options: [
      "Voltage-Series Feedback",
      "Voltage-Shunt Feedback",
      "Current-Series Feedback",
      "Current-Shunt Feedback"
    ],
    correctAnswer: 1,
    category: "Analog Circuits",
    points: 1
  },
  {
    id: 12,
    question: "What is the primary operational advantage of CMOS technology over traditional TTL circuits?",
    options: [
      "Near-zero static power dissipation and high noise immunity",
      "Significantly higher output drive currents at low supply voltages",
      "Purely inductive input impedance at high frequencies",
      "Complete immunity to electrostatic discharge (ESD)"
    ],
    correctAnswer: 0,
    category: "VLSI Design",
    points: 1
  },
  {
    id: 13,
    question: "In digital signal processing (DSP), why are Finite Impulse Response (FIR) filters often preferred?",
    options: [
      "They require far fewer delay elements than equivalent IIR filters",
      "They are inherently stable and can be designed for exact linear phase",
      "They consume zero memory buffers in recursive filtering",
      "Their poles always lie outside the unit circle in the z-plane"
    ],
    correctAnswer: 1,
    category: "DSP",
    points: 1
  },
  {
    id: 14,
    question: "What physical phenomenon enables total light confinement inside an optical fiber glass core?",
    options: [
      "Chromic dispersion within the refractive buffer",
      "Rayleigh backscattering along the outer cladding",
      "Total Internal Reflection (TIR) at core-cladding boundary",
      "Fresnel reflection through atmospheric refractive index"
    ],
    correctAnswer: 2,
    category: "Optical Communication",
    points: 1
  },
  {
    id: 15,
    question: "In an ARM Cortex-M microcontroller register bank, which register specifically acts as the Link Register (LR)?",
    options: [
      "R14",
      "R13",
      "R15",
      "R12"
    ],
    correctAnswer: 0,
    category: "Embedded Systems",
    points: 1
  },
  {
    id: 16,
    question: "What are the two conditions of Barkhausen's criterion for sustained steady oscillations in an electronic oscillator?",
    options: [
      "Loop gain |Aβ| > 10 and net loop phase shift = 90°",
      "Open-loop gain A = 0 and feedback factor β = 1",
      "Loop gain |Aβ| = 1 and total loop phase shift = 0° or 360°",
      "Loop gain |Aβ| < 0.5 with 180° capacitive feedback"
    ],
    correctAnswer: 2,
    category: "Analog Electronics",
    points: 1
  },
  {
    id: 17,
    question: "What does the radiation resistance (Rr) of an electromagnetic transmitting antenna represent?",
    options: [
      "Ohmic heat losses dissipated in the antenna metallic element",
      "Equivalent resistance representing useful power radiated into free space",
      "Reactive impedance caused by near-field capacitive coupling",
      "Characteristic impedance of the coaxial feed line"
    ],
    correctAnswer: 1,
    category: "Electromagnetics",
    points: 1
  },
  {
    id: 18,
    question: "Which high-speed wireless multiplexing technology utilizes orthogonal subcarrier spacing to eliminate ISI?",
    options: [
      "OFDM / OFDMA (Orthogonal Frequency-Division Multiplexing)",
      "CDMA (Code Division Multiple Access with PN spreading)",
      "TDMA (Time Division Multiple Access with guard intervals)",
      "Pure ALOHA Carrier Sense Multiple Access"
    ],
    correctAnswer: 0,
    category: "Wireless Systems",
    points: 1
  },
  {
    id: 19,
    question: "In a Phase-Locked Loop (PLL) communication circuit, which element detects phase error between input and VCO?",
    options: [
      "Low-Pass Loop Filter",
      "Voltage-Controlled Oscillator",
      "Frequency Divider prescaler",
      "Phase Detector (Comparator)"
    ],
    correctAnswer: 3,
    category: "Communication Circuits",
    points: 1
  },
  {
    id: 20,
    question: "Why is a synchronous binary counter preferred over an asynchronous ripple counter in high-speed digital systems?",
    options: [
      "It requires no external clock source whatsoever",
      "All flip-flops trigger simultaneously, eliminating cumulative propagation delay ripples",
      "It consumes zero dynamic switching power across all clock transitions",
      "It uses unclocked SR latches instead of master-slave flip-flops"
    ],
    correctAnswer: 1,
    category: "Digital Electronics",
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
