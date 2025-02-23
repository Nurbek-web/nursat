"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { generateQuestion } from "@/lib/ai";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Loader2, Search, Shuffle } from "lucide-react";
import { Question, QuestionType, Etymology } from "@/types";
import {
  getFirestore,
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  DocumentData,
  DocumentSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import TestGenerator from "@/components/test-generator";
import TestList from "@/components/test-list";
import { useAuth } from "@/hooks/useAuth";
import EtymologyBreakdown from "@/components/etymology-breakdown";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import EtymologyTree from "@/components/ethymology-tree"; // Import the new component

interface PracticeSession {
  totalQuestions: number;
  correctAnswers: number;
  questionType: QuestionType;
  duration: number;
  mode: "finite" | "infinite";
  completed?: boolean;
}

interface RawQuestion {
  "0": string; // The question data is stored as a JSON string in the "0" field
}

interface TestData {
  config: {
    numberOfQuestions: number;
    questionType: QuestionType;
    title: string;
  };
  progress: {
    correctAnswers: number;
    currentQuestion: number;
    completed: boolean;
  };
  questions: RawQuestion[];
  status: string;
  userId: string;
}

export default function PracticePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(150);
  const [excludedOptions, setExcludedOptions] = useState<string[]>([]);
  const [sessionData, setSessionData] = useState<PracticeSession>({
    totalQuestions: 0,
    correctAnswers: 0,
    questionType: (searchParams.get("type") as QuestionType) || "reading",
    duration: 0,
    mode: (searchParams.get("mode") as "finite" | "infinite") || "finite",
    completed: false,
  });
  const [questionsQueue, setQuestionsQueue] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const totalQuestionsToGenerate = sessionData.mode === "finite" ? 5 : 2;
  const testId = searchParams.get("testId");
  const [word, setWord] = useState("");
  const [etymology, setEtymology] = useState<Etymology | null>(null);

  const questionType = (searchParams.get("type") as QuestionType) || "reading";

  // Add this useEffect to handle initial load state
  useEffect(() => {
    setLoading(false); // Immediately set loading to false for vocabulary mode
  }, []);

  // For vocabulary mode, we don't need test authentication
  if (questionType === "vocabulary") {
    const handleWordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!word.trim()) {
        toast({
          title: "Please enter a word",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          "/api/etymology?word=" + encodeURIComponent(word)
        );
        const data = await response.json();
        setEtymology({
          ...data,
          origins: data.origins || [],
        });
      } catch (error) {
        console.error("Error fetching etymology:", error);
        toast({
          title: "Error",
          description: "Failed to get word etymology",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const getRandomWord = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/random-word");
        const data = await response.json();
        setWord(data.word);
        setEtymology({
          ...data,
          origins: data.origins || [],
        });
      } catch (error) {
        console.error("Error fetching random word:", error);
        toast({
          title: "Error",
          description: "Failed to get random word",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-serif font-semibold mb-2">
                Word Etymology Tool
              </h2>
              <p className="text-gray-600">
                Enter any word to see its etymology breakdown, or get a random
                SAT vocabulary word.
              </p>
            </div>
            <form onSubmit={handleWordSubmit} className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter a word..."
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={getRandomWord}
                  disabled={loading}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Random SAT Word
                </Button>
              </div>
            </form>
            {loading && (
              <div className="flex justify-center my-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            {etymology && <EtymologyTree etymology={etymology} />}{" "}
            {/* Use the new component */}
          </CardContent>
        </Card>
      </div>
    );
  }
  useEffect(() => {
    // Don't redirect while auth is loading
    if (authLoading) return;

    // Only redirect if user is definitely not authenticated
    if (!user) {
      router.push("/login");
      return;
    }

    // Redirect to dashboard if no testId is provided
    if (!testId) {
      router.push("/dashboard");
      toast({
        title: "Access Denied",
        description: "Please select a test from your dashboard to practice",
        variant: "destructive",
      });
      return;
    }

    const db = getFirestore();
    const testRef = doc(db, "practice_tests", testId);

    setLoading(true);
    const unsubscribe = onSnapshot(
      testRef,
      (doc: DocumentSnapshot<DocumentData>) => {
        if (doc.exists()) {
          const testData = doc.data() as TestData;
          console.log("Test data loaded:", testData);

          if (!testData.questions || !testData.questions.length) {
            console.error("No questions found in test data");
            toast({
              title: "Error",
              description: "Failed to load test questions",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Use the questions directly, since they are stored as objects
          const parsedQuestions = testData.questions.filter((q) => q !== null);

          if (!parsedQuestions.length) {
            console.error("No valid questions found in test data");
            toast({
              title: "Error",
              description: "Failed to load test questions",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Validate each question has required fields
          const validQuestions = parsedQuestions.filter((q) => {
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

          if (!validQuestions.length) {
            console.error("No valid questions found after validation");
            toast({
              title: "Error",
              description: "Failed to load valid test questions",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Set the questions and other state as needed
          setQuestionsQueue(validQuestions);
          setSessionData((prev) => ({
            ...prev,
            totalQuestions: validQuestions.length,
          }));
          setQuestion(validQuestions[currentQuestionIndex]);
          setLoading(false);
        } else {
          console.error("Test document does not exist");
          toast({
            title: "Error",
            description: "Test not found",
            variant: "destructive",
          });
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error fetching test data:", error);
        toast({
          title: "Error",
          description: "Failed to load test data",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    // Clean up the listener on unmount
    return () => {
      unsubscribe();
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (timeLeft === 0 || showExplanation) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, showExplanation]);

  const generateMultipleQuestions = async (
    count: number
  ): Promise<Question[]> => {
    const questionPromises = Array(count)
      .fill(null)
      .map(() => generateQuestion(questionType, "medium"));
    const results = await Promise.all(questionPromises);
    // Flatten the results since generateQuestion returns an array
    return results.flat();
  };

  const resetQuestionState = () => {
    setSelectedAnswer("");
    setShowExplanation(false);
    setTimeLeft(150);
    setExcludedOptions([]);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !question) {
      toast({
        title: "Please select an answer",
        variant: "destructive",
      });
      return;
    }

    const correct = selectedAnswer === question.correctAnswer;
    setShowExplanation(true);

    // Update session data
    setSessionData((prev) => ({
      ...prev,
      totalQuestions: prev.totalQuestions + 1,
      correctAnswers: prev.correctAnswers + (correct ? 1 : 0),
      duration: prev.duration + (150 - timeLeft),
    }));
  };

  const loadNextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1;

    // For finite mode, check if we're done
    if (
      sessionData.mode === "finite" &&
      nextIndex >= totalQuestionsToGenerate
    ) {
      await savePracticeSession(sessionData);
      setSessionData((prev) => ({ ...prev, completed: true }));
      return;
    }

    // For infinite mode, generate more questions when needed
    if (
      sessionData.mode === "infinite" &&
      nextIndex >= questionsQueue.length - 1
    ) {
      const newQuestions = await generateMultipleQuestions(2);
      setQuestionsQueue((prev) => [...prev, ...newQuestions]);
    }

    setCurrentQuestionIndex(nextIndex);
    setQuestion(questionsQueue[nextIndex]);
    resetQuestionState();
  };

  const savePracticeSession = async (sessionData: PracticeSession) => {
    if (testId) {
      const db = getFirestore();
      const testRef = doc(db, "practice_tests", testId);
      await updateDoc(testRef, {
        status: "completed",
        progress: {
          currentQuestion: currentQuestionIndex,
          correctAnswers: sessionData.correctAnswers,
          completed: true,
        },
      });
    } else {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) return;

      const db = getFirestore();
      try {
        await addDoc(collection(db, "practice_sessions"), {
          userId: user.uid,
          timestamp: new Date(),
          ...sessionData,
        });

        toast({
          title: "Progress Saved",
          description: `Completed ${sessionData.totalQuestions} questions with ${sessionData.correctAnswers} correct answers`,
        });
      } catch (error) {
        console.error("Error saving practice session:", error);
        toast({
          title: "Error",
          description: "Failed to save progress",
          variant: "destructive",
        });
      }
    }
  };

  // Show loading state while checking auth
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Only show practice content if user is authenticated
  if (!user) {
    return null; // Will redirect in useEffect
  }

  // If no test is active, redirect to dashboard
  if (!testId) {
    return null; // Will redirect in useEffect
  }

  // Show practice overview when completed
  if (sessionData.completed) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Practice Complete!</h2>
              <p className="text-gray-600">Here's how you did</p>
            </div>

            <div className="grid gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-600">Score</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {Math.round(
                        (sessionData.correctAnswers /
                          sessionData.totalQuestions) *
                          100
                      )}
                      %
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-600">
                      Correct Answers
                    </h3>
                    <p className="text-3xl font-bold text-green-600">
                      {sessionData.correctAnswers}/{sessionData.totalQuestions}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium mb-4">Session Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Question Type</span>
                    <span className="font-medium">
                      {sessionData.questionType}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Time Spent</span>
                    <span className="font-medium">
                      {Math.round(sessionData.duration / 60)} minutes
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      Average Time per Question
                    </span>
                    <span className="font-medium">
                      {Math.round(
                        sessionData.duration / sessionData.totalQuestions
                      )}{" "}
                      seconds
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => router.push("/practice")}
                className="flex-1"
              >
                Practice Again
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="flex-1"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only render vocabulary tool if type is vocabulary
  if (questionType !== "vocabulary") {
    return null; // Let other question types be handled by existing code
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-semibold">
              {questionType.charAt(0).toUpperCase() + questionType.slice(1)}{" "}
              Practice
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Medium
              </span>
            </h2>
            <div className="flex items-center text-blue-600 font-medium">
              <Clock className="h-5 w-5 mr-2" />
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </div>
          </div>

          {question && question.question && (
            <>
              {question.question.includes("Passage:") && (
                <div className="mb-6 p-4 bg-gray-50 rounded font-serif">
                  {question.question.split("Question:")[0]}
                </div>
              )}
              <div className="mb-6">
                <p className="text-lg mb-4 font-medium">
                  {question.question.includes("Question:")
                    ? question.question.split("Question:")[1]
                    : question.question}
                </p>

                <RadioGroup
                  value={selectedAnswer}
                  onValueChange={setSelectedAnswer}
                  className="space-y-4"
                >
                  {question.options.map((option, index) => {
                    const isExcluded = excludedOptions.includes(option);
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center space-x-2 p-4 rounded-lg border transition-colors",
                          {
                            "opacity-50": isExcluded,
                            "bg-white": !isExcluded,
                            "border-blue-500 bg-blue-50":
                              selectedAnswer === option && !showExplanation,
                            "border-green-500 bg-green-50":
                              option === question.correctAnswer &&
                              showExplanation,
                            "border-red-500 bg-red-50":
                              selectedAnswer === option &&
                              option !== question.correctAnswer &&
                              showExplanation,
                          }
                        )}
                      >
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label
                          htmlFor={`option-${index}`}
                          className="flex-grow cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Show etymology breakdown for vocabulary questions */}
              {questionType === "vocabulary" &&
                question.etymology &&
                !showExplanation && (
                  <EtymologyBreakdown etymology={question.etymology} />
                )}

              {showExplanation && (
                <div className="mt-6 p-4 rounded-lg bg-blue-50">
                  <h3 className="font-medium text-blue-900 mb-2">
                    Explanation
                  </h3>
                  <p className="text-blue-800">{question.explanation}</p>

                  {/* Show etymology after answering for vocabulary questions */}
                  {questionType === "vocabulary" && question.etymology && (
                    <EtymologyBreakdown etymology={question.etymology} />
                  )}
                </div>
              )}

              {!showExplanation ? (
                <Button onClick={handleSubmit} className="w-full mt-6">
                  Submit Answer
                </Button>
              ) : (
                <>
                  <div className="mb-4 p-4 rounded-md bg-gray-100">
                    <p>
                      Progress: {sessionData.correctAnswers}/
                      {sessionData.totalQuestions} correct
                    </p>
                    {sessionData.mode === "finite" && (
                      <p>
                        Questions remaining:{" "}
                        {totalQuestionsToGenerate - currentQuestionIndex - 1}
                      </p>
                    )}
                  </div>
                  <Button onClick={loadNextQuestion} className="w-full">
                    {sessionData.mode === "finite" &&
                    currentQuestionIndex >= totalQuestionsToGenerate - 1
                      ? "Complete Practice"
                      : "Next Question"}
                  </Button>
                </>
              )}
            </>
          )}

          <div className="mt-8">
            <h2 className="text-2xl font-serif font-semibold mb-2">
              Word Etymology Tool
            </h2>
            <p className="text-gray-600">
              Enter any word to see its etymology breakdown, or get a random SAT
              vocabulary word.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Enter a word..."
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button type="submit" disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Analyze
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={getRandomWord}
                disabled={loading}
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Random SAT Word
              </Button>
            </div>
          </form>

          {loading && (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {etymology && <EtymologyBreakdown etymology={etymology} />}
        </CardContent>
      </Card>
    </div>
  );
}
