"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Question, QuestionType } from "@/types";
import { generateQuestion } from "@/lib/ai";
import {
  getFirestore,
  addDoc,
  collection,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface TestConfig {
  title: string;
  questionType: QuestionType;
  numberOfQuestions: number;
}

export default function TestGenerator() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<TestConfig>({
    title: "",
    questionType: "reading",
    numberOfQuestions: 5,
  });
  const { toast } = useToast();

  const generateTest = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to generate tests",
        variant: "destructive",
      });
      return;
    }

    if (!config.title) {
      toast({
        title: "Error",
        description: "Please enter a title for the test",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const db = getFirestore();

    try {
      // First create the test document with generating status
      const testRef = await addDoc(collection(db, "practice_tests"), {
        userId: user.uid,
        createdAt: new Date(),
        status: "generating",
        config,
        questions: [],
        progress: {
          currentQuestion: 0,
          correctAnswers: 0,
          completed: false,
        },
      });

      // Generate all questions in parallel
      const questionPromises = Array(config.numberOfQuestions)
        .fill(null)
        .map(() => generateQuestion(config.questionType, "medium"));

      const questions = await Promise.all(questionPromises);

      // Update the test document with questions and ready status
      await updateDoc(testRef, {
        status: "ready",
        questions,
      });

      // Reset form
      setConfig({
        title: "",
        questionType: "reading",
        numberOfQuestions: 5,
      });

      toast({
        title: "Success",
        description: "Test generated and saved successfully",
      });
    } catch (error) {
      console.error("Error generating test:", error);
      toast({
        title: "Error",
        description: "Failed to generate test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Generate New Test</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Test Title</label>
            <Input
              placeholder="Enter test title"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Question Type
            </label>
            <Select
              value={config.questionType}
              onValueChange={(value: QuestionType) =>
                setConfig({ ...config, questionType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="listening">Listening</SelectItem>
                <SelectItem value="writing">Writing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Number of Questions
            </label>
            <Input
              type="number"
              min={1}
              max={20}
              value={config.numberOfQuestions}
              onChange={(e) =>
                setConfig({
                  ...config,
                  numberOfQuestions: parseInt(e.target.value) || 5,
                })
              }
            />
          </div>
          <Button onClick={generateTest} className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Test...
              </>
            ) : (
              "Generate Test"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
