"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { generateQuestion } from "@/lib/ai";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock } from "lucide-react";
import { Question, QuestionType } from "@/types";
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

interface PracticeSession {
  totalQuestions: number;
  correctAnswers: number;
  questionType: QuestionType;
  duration: number;
  mode: "finite" | "infinite";
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
  });
  const [questionsQueue, setQuestionsQueue] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const totalQuestionsToGenerate = sessionData.mode === "finite" ? 5 : 2;
  const testId = searchParams.get("testId");

  const questionType = (searchParams.get("type") as QuestionType) || "reading";

  useEffect(() => {
    // Don't redirect while auth is loading
    if (authLoading) return;

    // Only redirect if user is definitely not authenticated
    if (!user) {
      router.push("/login");
      return;
    }

    if (!testId) {
      initializeSession();
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

          // Parse the questions from the stringified JSON format
          const parsedQuestions = testData.questions
            .map((q) => {
              try {
                // Each question is an object with a "0" property containing the stringified question
                return JSON.parse(q["0"]) as Question;
              } catch (error) {
                console.error("Error parsing question:", error);
                return null;
              }
            })
            .filter((q): q is Question => q !== null);

          if (parsedQuestions.length === 0) {
            console.error("No valid questions found in test data");
            toast({
              title: "Error",
              description: "Failed to load test questions",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          const currentQuestion = parsedQuestions[currentQuestionIndex];
          if (!currentQuestion) {
            console.error("Invalid question index:", currentQuestionIndex);
            setCurrentQuestionIndex(0);
            setQuestion(parsedQuestions[0]);
          } else {
            setQuestion(currentQuestion);
          }

          setSessionData({
            totalQuestions: testData.config.numberOfQuestions,
            correctAnswers: testData.progress.correctAnswers,
            questionType: testData.config.questionType,
            duration: 0,
            mode: "finite",
          });
          setQuestionsQueue(parsedQuestions);
          resetQuestionState();
        } else {
          console.error("Test document does not exist");
          toast({
            title: "Error",
            description: "Test not found",
            variant: "destructive",
          });
        }
        setLoading(false);
      },
      (error: Error) => {
        console.error("Error loading test:", error);
        toast({
          title: "Error",
          description: "Failed to load test",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [testId, currentQuestionIndex, user, router, authLoading]);

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

  const initializeSession = async () => {
    setLoading(true);
    try {
      // Generate initial batch of questions in parallel
      const questions = await generateMultipleQuestions(
        totalQuestionsToGenerate
      );
      setQuestionsQueue(questions);
      setQuestion(questions[0]);
      resetQuestionState();

      // For infinite mode, start generating next batch in background
      if (sessionData.mode === "infinite") {
        generateMultipleQuestions(2).then((newQuestions) => {
          setQuestionsQueue((prevQuestions) => [
            ...prevQuestions,
            ...newQuestions,
          ]);
        });
      }
    } catch (error) {
      console.error("Error initializing session:", error);
      toast({
        title: "Error",
        description: "Failed to initialize practice session",
        variant: "destructive",
      });
    }
    setLoading(false);
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
      // Show completion screen or redirect
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

  // If no test is active, show the test generator and list
  if (!testId && !question) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TestGenerator />
          <TestList />
        </div>
      </div>
    );
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
                        className="flex items-center justify-between group relative"
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          <RadioGroupItem
                            value={option}
                            id={`option-${index}`}
                            className="h-5 w-5 border-2 text-blue-600"
                            disabled={isExcluded}
                          />
                          <Label
                            htmlFor={`option-${index}`}
                            className={`text-base font-normal ${
                              isExcluded ? "opacity-50 line-through" : ""
                            }`}
                          >
                            {option}
                          </Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (isExcluded) {
                              setExcludedOptions(
                                excludedOptions.filter((opt) => opt !== option)
                              );
                            } else {
                              setExcludedOptions([...excludedOptions, option]);
                            }
                          }}
                          className={`text-gray-400 hover:text-gray-600 ${
                            isExcluded
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {isExcluded ? "↺" : "×"}
                        </Button>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {!showExplanation ? (
                <Button onClick={handleSubmit} className="w-full">
                  Submit Answer
                </Button>
              ) : (
                <>
                  <div className="mb-6 space-y-4">
                    <div
                      className={`p-4 rounded-md ${
                        selectedAnswer === question.correctAnswer
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <h3
                        className={`font-medium mb-2 ${
                          selectedAnswer === question.correctAnswer
                            ? "text-green-800"
                            : "text-red-800"
                        }`}
                      >
                        {selectedAnswer === question.correctAnswer
                          ? "Correct!"
                          : "Incorrect"}
                      </h3>
                      <p className="text-gray-700">{question.explanation}</p>
                      {selectedAnswer !== question.correctAnswer && (
                        <p className="mt-2 font-medium text-gray-900">
                          Correct answer: {question.correctAnswer}
                        </p>
                      )}
                    </div>
                  </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
