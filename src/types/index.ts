export type QuestionType = "reading" | "writing" | "math" | "vocabulary";

export interface WordRoot {
  root: string;
  origin: string;
  meaning: string;
}

export interface Etymology {
  word: string;
  roots: WordRoot[];
  definition: string;
  usage: string;
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  etymology?: Etymology; // Optional etymology info for vocabulary questions
}
