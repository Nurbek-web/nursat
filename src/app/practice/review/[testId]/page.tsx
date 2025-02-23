"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, doc, getDoc, DocumentData } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Question } from "@/types";

interface ReviewQuestion extends Question {
  userAnswer?: string;
  isCorrect?: boolean;
}

interface TestReview {
  id: string;
  config: {
    title: string;
    questionType: string;
    numberOfQuestions: number;
  };
  questions: ReviewQuestion[];
  progress: {
    correctAnswers: number;
    currentQuestion: number;
    completed: boolean;
  };
  createdAt: Date;
}

export default function TestReviewPage() {
  const { testId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<TestReview | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const fetchTest = async () => {
      const db = getFirestore();
      const testRef = doc(db, "practice_tests", testId as string);

      try {
        const testDoc = await getDoc(testRef);
        if (!testDoc.exists()) {
          toast({
            title: "Error",
            description: "Test not found",
            variant: "destructive",
          });
          router.push("/practice");
          return;
        }

        const data = testDoc.data() as DocumentData;

        // Parse questions from the stringified JSON format
        const parsedQuestions = data.questions
          .map((q: { "0": string }) => {
            try {
              return JSON.parse(q["0"]) as Question;
            } catch (error) {
              console.error("Error parsing question:", error);
              return null;
            }
          })
          .filter((q: Question | null): q is Question => q !== null);

        setTest({
          id: testDoc.id,
          config: data.config,
          questions: parsedQuestions,
          progress: data.progress,
          createdAt: data.createdAt.toDate(),
        });
      } catch (error) {
        console.error("Error fetching test:", error);
        toast({
          title: "Error",
          description: "Failed to load test details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [testId, user, router, authLoading, toast]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!test) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-2">{test.config.title}</h1>
              <p className="text-gray-600">
                {test.config.questionType} • {test.config.numberOfQuestions}{" "}
                questions
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">
                Score:{" "}
                {Math.round(
                  (test.progress.correctAnswers /
                    test.config.numberOfQuestions) *
                    100
                )}
                %
              </p>
              <p className="text-gray-600">
                {test.progress.correctAnswers}/{test.config.numberOfQuestions}{" "}
                correct
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {test.questions.map((question, index) => (
              <div
                key={index}
                className="border rounded-lg p-6 bg-white shadow-sm"
              >
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-500">
                    Question {index + 1}
                  </span>
                </div>

                {question.question.includes("Passage:") && (
                  <div className="mb-6 p-4 bg-gray-50 rounded font-serif">
                    {question.question.split("Question:")[0]}
                  </div>
                )}

                <p className="text-lg mb-6 font-medium">
                  {question.question.includes("Question:")
                    ? question.question.split("Question:")[1]
                    : question.question}
                </p>

                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`p-3 rounded-md ${
                        option === question.correctAnswer
                          ? "bg-green-50 border border-green-200"
                          : option === question.userAnswer &&
                            option !== question.correctAnswer
                          ? "bg-red-50 border border-red-200"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <p className="font-medium">
                        {option}
                        {option === question.correctAnswer && (
                          <span className="ml-2 text-green-600">
                            ✓ Correct Answer
                          </span>
                        )}
                        {option === question.userAnswer &&
                          option !== question.correctAnswer && (
                            <span className="ml-2 text-red-600">
                              ✗ Your Answer
                            </span>
                          )}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-md">
                  <p className="font-medium text-blue-900">Explanation</p>
                  <p className="text-blue-800">{question.explanation}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => router.push("/practice")}>
              Back to Practice
            </Button>
            <Button
              onClick={() =>
                router.push(`/practice?type=${test.config.questionType}`)
              }
            >
              Start New Practice
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
