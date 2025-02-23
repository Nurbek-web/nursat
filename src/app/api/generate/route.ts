import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "o1-preview",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const response = completion.choices[0].message.content;
    console.log("Raw OpenAI response:", response);
    let questions;

    try {
      // Clean the response string before parsing
      const cleanedResponse = response?.trim() || "[]";
      console.log("Cleaned response:", cleanedResponse);

      // Try to remove any markdown code block syntax if present
      const withoutMarkdown = cleanedResponse
        .replace(/^```json\n?|\n?```$/g, "")
        .trim();
      console.log("Response after markdown removal:", withoutMarkdown);

      const parsedData = JSON.parse(withoutMarkdown);

      // Handle different possible response structures
      if (typeof parsedData === "object" && parsedData !== null) {
        if ("questions" in parsedData) {
          questions = parsedData.questions;
        } else {
          questions = parsedData;
        }
      } else {
        questions = parsedData;
      }

      // Ensure questions is an array
      if (!Array.isArray(questions)) {
        questions = [questions];
      }

      // Parse each question to ensure it's in the correct format
      questions = questions
        .flat(Infinity)
        .filter((q) => q != null)
        .map((q: unknown) => {
          try {
            if (typeof q === "string") {
              return JSON.parse(q);
            }
            if (typeof q === "object" && q !== null) {
              return q;
            }
            return null;
          } catch (error) {
            console.error("Error parsing question:", error);
            return null;
          }
        })
        .filter((q) => q !== null);

      // Validate each question has the required fields
      questions = questions.filter((q) => {
        const isValid =
          q &&
          typeof q === "object" &&
          "question" in q &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          "correctAnswer" in q &&
          "explanation" in q;

        if (!isValid) {
          console.error("Invalid question format:", q);
        }

        return isValid;
      });

      // If we ended up with no questions, return an error
      if (questions.length === 0) {
        return NextResponse.json(
          { error: "No valid questions generated" },
          { status: 500 }
        );
      }

      return NextResponse.json({ questions });
    } catch (error) {
      console.error("Failed to parse OpenAI response:", error);
      return NextResponse.json(
        { error: "Failed to generate valid questions" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
