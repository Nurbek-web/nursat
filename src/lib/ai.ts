import OpenAI from "openai";
import { Question, QuestionType, Etymology } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

const sampleVocabularyWords = [
  {
    word: "deconstruct",
    definition: "To break down into constituent parts; to analyze critically",
    roots: [
      {
        root: "de-",
        origin: "Latin",
        meaning: "down, off, away",
      },
      {
        root: "construct",
        origin: "Latin",
        meaning: "to build, to pile up",
      },
    ],
    usage:
      "The literary critic deconstructed the novel to reveal its underlying themes.",
  },
  {
    word: "benevolent",
    definition: "Kind, generous, and caring about others",
    roots: [
      {
        root: "bene-",
        origin: "Latin",
        meaning: "good, well",
      },
      {
        root: "vol",
        origin: "Latin",
        meaning: "to wish",
      },
    ],
    usage:
      "The benevolent donor provided funds for the new children's hospital.",
  },
  // Add more sample words as needed
];

export async function generateQuestion(type: QuestionType): Promise<Question> {
  if (type === "vocabulary") {
    // For now, randomly select a word from our sample list
    const wordData =
      sampleVocabularyWords[
        Math.floor(Math.random() * sampleVocabularyWords.length)
      ];

    // Generate wrong options that are semantically related but incorrect
    const wrongOptions = [
      "opposite meaning",
      "similar but incorrect",
      "related but wrong",
    ];

    return {
      question: `What is the meaning of the word "${wordData.word}"?`,
      options: [wordData.definition, ...wrongOptions],
      correctAnswer: wordData.definition,
      explanation: `The word "${wordData.word}" comes from ${wordData.roots
        .map((r) => r.root)
        .join(" + ")}. ${wordData.usage}`,
      etymology: {
        word: wordData.word,
        roots: wordData.roots,
        definition: wordData.definition,
        usage: wordData.usage,
      },
    };
  }

  // For other question types, use OpenAI to generate questions
  try {
    const prompt = getPromptForQuestionType(type);
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI tutor creating SAT practice questions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // Parse the response into a Question object
    const parsedQuestion = JSON.parse(response) as Question;
    return parsedQuestion;
  } catch (error) {
    console.error("Error generating question:", error);
    throw error;
  }
}

function getPromptForQuestionType(type: QuestionType): string {
  const prompts: Record<QuestionType, string> = {
    reading: `Create a SAT-style reading comprehension question. Return it in this JSON format:
      {
        "question": "Include a short passage followed by Question: What is the main idea?",
        "options": ["correct answer", "wrong answer 1", "wrong answer 2", "wrong answer 3"],
        "correctAnswer": "correct answer",
        "explanation": "Detailed explanation of why this is the correct answer"
      }`,
    writing: `Create a SAT-style writing/grammar question. Return it in this JSON format:
      {
        "question": "The question about grammar or writing style",
        "options": ["correct answer", "wrong answer 1", "wrong answer 2", "wrong answer 3"],
        "correctAnswer": "correct answer",
        "explanation": "Detailed explanation of why this is the correct answer"
      }`,
    math: `Create a SAT-style math question. Return it in this JSON format:
      {
        "question": "The math problem",
        "options": ["correct answer", "wrong answer 1", "wrong answer 2", "wrong answer 3"],
        "correctAnswer": "correct answer",
        "explanation": "Detailed explanation of the solution process"
      }`,
    vocabulary: `Create a SAT-style vocabulary question. Return it in this JSON format:
      {
        "question": "What is the meaning of [word]?",
        "options": ["correct definition", "wrong definition 1", "wrong definition 2", "wrong definition 3"],
        "correctAnswer": "correct definition",
        "explanation": "Explanation of the word's meaning and etymology"
      }`,
  };

  return prompts[type];
}
