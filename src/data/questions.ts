import type { Question } from '../types/quiz';

export const OFFICIAL_QUESTION_BANK_VERSION = 'v2026_sparktron_official_final';

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Which component is commonly used to store energy in a magnetic field?",
    options: [
      "Capacitor",
      "Inductor",
      "Resistor",
      "Diode"
    ],
    correctAnswer: 1,
    category: "Basic Electrical",
    points: 1
  },
  {
    id: 2,
    question: "What is the main function of a program counter in a microprocessor?",
    options: [
      "Stores the result of an operation",
      "Counts the number of instructions executed",
      "Holds the address of the next instruction",
      "Stores the current data value"
    ],
    correctAnswer: 2,
    category: "Microprocessor",
    points: 1
  },
  {
    id: 3,
    question: "Which logic gate gives a HIGH output when its two inputs are different?",
    options: [
      "AND",
      "NOR",
      "XNOR",
      "XOR"
    ],
    correctAnswer: 3,
    category: "Digital Electronics",
    points: 1
  },
  {
    id: 4,
    question: "Why is a heat sink attached to a power transistor?",
    options: [
      "To dissipate excess heat",
      "To increase its switching frequency",
      "To reduce the input voltage",
      "To store electrical energy"
    ],
    correctAnswer: 0,
    category: "Power Electronics",
    points: 1
  },
  {
    id: 5,
    question: "What is the main advantage of using an interrupt in a microcontroller?",
    options: [
      "It increases the memory capacity",
      "It allows the CPU to respond to events without continuously checking them",
      "It eliminates the need for a clock",
      "It permanently stops the main program"
    ],
    correctAnswer: 1,
    category: "Microcontroller",
    points: 1
  },
  {
    id: 6,
    question: "Which device is commonly used to convert DC power into AC power?",
    options: [
      "Rectifier",
      "Chopper",
      "Inverter",
      "Transformer"
    ],
    correctAnswer: 2,
    category: "Power Electronics",
    points: 1
  },
  {
    id: 7,
    question: "What happens when a diode is connected in reverse bias under normal operating conditions?",
    options: [
      "It conducts maximum current",
      "It allows only a small leakage current",
      "It acts as a short circuit",
      "It amplifies the applied voltage"
    ],
    correctAnswer: 1,
    category: "EDC",
    points: 1
  },
  {
    id: 8,
    question: "Which motor is commonly preferred when precise angular position control is required?",
    options: [
      "Stepper motor",
      "Induction motor",
      "DC series motor",
      "Universal motor"
    ],
    correctAnswer: 0,
    category: "Electrical Machines",
    points: 1
  },
  {
    id: 9,
    question: "In a BJT, which region is made very thin to allow efficient transistor action?",
    options: [
      "Collector",
      "Base",
      "Emitter",
      "Substrate"
    ],
    correctAnswer: 1,
    category: "EDC",
    points: 1
  },
  {
    id: 10,
    question: "What is the main purpose of the accumulator in a microprocessor?",
    options: [
      "To store the address of the next instruction",
      "To temporarily store arithmetic and logic operation results",
      "To control the clock frequency",
      "To store the entire program"
    ],
    correctAnswer: 1,
    category: "Microprocessor",
    points: 1
  },
  {
    id: 11,
    question: "Which modulation technique is generally more resistant to amplitude noise?",
    options: [
      "AM",
      "ASK",
      "PAM",
      "FM"
    ],
    correctAnswer: 3,
    category: "Communication",
    points: 1
  },
  {
    id: 12,
    question: "What is the main function of a multiplexer?",
    options: [
      "Select one of several input signals",
      "Convert analog data into digital data",
      "Store multiple binary values",
      "Generate a clock signal"
    ],
    correctAnswer: 0,
    category: "Digital Electronics",
    points: 1
  },
  {
    id: 13,
    question: "Which power electronic device conducts current in both directions when appropriately triggered?",
    options: [
      "SCR",
      "TRIAC",
      "Power diode",
      "IGBT"
    ],
    correctAnswer: 1,
    category: "Power Electronics",
    points: 1
  },
  {
    id: 14,
    question: "Why are CMOS circuits widely used in VLSI design?",
    options: [
      "They require no clock signal",
      "They contain no semiconductor devices",
      "They have low static power consumption",
      "They eliminate propagation delay"
    ],
    correctAnswer: 2,
    category: "VLSI",
    points: 1
  },
  {
    id: 15,
    question: "Which memory loses its stored data when the power supply is switched OFF?",
    options: [
      "ROM",
      "Flash",
      "EEPROM",
      "RAM"
    ],
    correctAnswer: 3,
    category: "Embedded Systems",
    points: 1
  },
  {
    id: 16,
    question: "Which type of filter allows signals within a particular frequency range to pass while attenuating frequencies outside that range?",
    options: [
      "Low-pass filter",
      "High-pass filter",
      "Band-pass filter",
      "Band-stop filter"
    ],
    correctAnswer: 2,
    category: "Signal Processing",
    points: 1
  },
  {
    id: 17,
    question: "Which electrical machine operates based on electromagnetic induction between the stator and rotor?",
    options: [
      "DC generator",
      "Induction motor",
      "Stepper motor",
      "Permanent magnet DC motor"
    ],
    correctAnswer: 1,
    category: "Electrical Machines",
    points: 1
  },
  {
    id: 18,
    question: "In CMOS technology, which pair of transistors is used to construct a basic inverter?",
    options: [
      "Two NMOS transistors",
      "Two PMOS transistors",
      "One NMOS and one PMOS transistor",
      "One BJT and one MOSFET"
    ],
    correctAnswer: 2,
    category: "VLSI",
    points: 1
  },
  {
    id: 19,
    question: "Which communication protocol typically uses TX and RX lines for serial data transfer?",
    options: [
      "SPI",
      "I²C",
      "CAN",
      "UART"
    ],
    correctAnswer: 3,
    category: "Embedded Systems",
    points: 1
  },
  {
    id: 20,
    question: "What happens to the output voltage of an ideal boost converter compared with its input voltage during normal operation?",
    options: [
      "It is higher than the input voltage",
      "It is always equal to the input voltage",
      "It is lower than the input voltage",
      "It becomes an AC voltage"
    ],
    correctAnswer: 0,
    category: "Power Electronics",
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
