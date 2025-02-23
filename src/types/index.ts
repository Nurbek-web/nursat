export type QuestionType = "reading" | "writing" | "math";

export interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}
