import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Etymology } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word");

  if (!word) {
    return NextResponse.json(
      { error: "Word parameter is required" },
      { status: 400 }
    );
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful etymology expert. Break down words into their roots and provide accurate etymological information.",
        },
        {
          role: "user",
          content: `Analyze the etymology of the word "${word}" and return a JSON object with this exact structure:
          {
            "word": "${word}",
            "definition": "precise definition",
            "roots": [
              {
                "root": "root part",
                "origin": "Latin/Greek/etc",
                "meaning": "meaning of this root"
              }
            ],
            "usage": "example sentence using the word"
          }
          Return only raw JSON without any markdown formatting or additional text`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual responses
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // Sanitize the response by removing markdown code blocks
    const sanitizedResponse = response.replace(/```json?|```/g, "");
    const etymology: Etymology = JSON.parse(sanitizedResponse);
    return NextResponse.json(etymology);
  } catch (error) {
    console.error("Error analyzing word:", error);
    return NextResponse.json(
      { error: "Failed to analyze word" },
      { status: 500 }
    );
  }
}
