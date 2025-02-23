import OpenAI from "openai";
import { Question, QuestionType } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export async function generateQuestion(
  type: QuestionType,
  difficulty: "easy" | "medium" | "hard"
): Promise<Question[]> {
  try {
    const prompt = generatePromptForQuestionType(type, difficulty);

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate questions");
    }

    const data = await response.json();
    return data.questions;
  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
}

function generatePromptForQuestionType(
  type: QuestionType,
  difficulty: string
): string {
  const prompts = {
    reading: `
      Generate a DSAT-style Reading question at ${difficulty} difficulty level.
      
      Choose ONE of these question types randomly:
      1. Specific Detail: Ask about locating and identifying specific information from the passage
      2. Main Idea: Ask about the central theme or main point of the passage
      3. Purpose: Ask about the author's primary purpose or intent
      4. Function: Ask about the function of a specific phrase or section
      5. Claims: Ask about evidence supporting or weakening claims in the passage
      6. Data Interpretation: Include a small data point and ask how it relates to the passage
      7. Complete The Text: Ask about logical completion of a thought or argument
      8. Cross Text: Provide two short related passages and ask about their relationship
      9. Structure: Ask about the organizational pattern or structure of the passage

      Follow these steps:
      1. Write a concise passage (80-120 words) appropriate for DSAT Reading.
         - For Cross Text questions, write two related short passages (50-60 words each)
         - For Data questions, include a simple data point or statistic
      2. Formulate ONE question based on the randomly chosen question type above.
         Use these example stems based on the question type:
         - Specific Detail: "According to the passage, what..."
         - Main Idea: "The main purpose of this passage is to..."
         - Purpose: "The author primarily intends to..."
         - Function: "The phrase [quote] primarily serves to..."
         - Claims: "Which choice provides the strongest evidence for..."
         - Complete Text: "Which choice most logically completes..."
         - Cross Text: "How do the two passages differ in their approach to..."
         - Structure: "The passage is primarily organized by..."
      3. Provide four answer choices labeled A, B, C, D.
      4. Indicate the correct answer.
      5. Provide a detailed explanation that:
         - Explains why the correct choice is correct
         - Briefly addresses why each other choice is incorrect
         - References specific parts of the passage(s)

      Return a VALID JSON object in this EXACT format (no extra keys, no additional text):
      {
        "question": "Passage: ...\\nQuestion: ...",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correctAnswer": "X",
        "explanation": "..."
      }
    `,

    writing: `
      Generate a DSAT-style Writing and Language question at ${difficulty} difficulty level.

      1. Provide a short sentence or brief passage (1–2 sentences) with an underlined or bracketed 
         portion that needs editing or improvement. 
         - Focus on typical DSAT Writing topics: grammar, punctuation, word choice, style, 
           sentence structure, or usage.
      2. Formulate ONE question that asks how best to revise the underlined or bracketed portion.
         - Example prompt: "Which choice completes the text so that it conforms to the conventions 
           of Standard English?"
      3. Provide four answer choices labeled A, B, C, D (including the original wording if it helps).
      4. Indicate the correct answer.
      5. Provide a detailed explanation that:
         - Explains why the correct choice is best.
         - Addresses why each of the other options is incorrect or less effective.

      Return a VALID JSON object in this EXACT format (no extra keys, no additional text):
      {
        "question": "Short text with [underlined portion] + question",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correctAnswer": "X",
        "explanation": "..."
      }
    `,

    math: `
      Generate a DSAT-style Math question at ${difficulty} difficulty level.

      1. Provide ONE math problem typical of the DSAT Math section (algebra, geometry, data analysis, 
          or a word problem).
      2. Give four answer choices labeled A, B, C, D.
      3. Indicate the correct answer.
      4. Offer a step-by-step explanation:
         - Demonstrate how to solve the problem from start to finish.
         - Include any relevant formulas or reasoning steps.

      Return a VALID JSON object in this EXACT format (no extra keys, no additional text):
      {
        "question": "...",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correctAnswer": "X",
        "explanation": "..."
      }
    `,
  };

  // Default to "reading" prompt if the type is unrecognized
  return prompts[type] || prompts.reading;
}
