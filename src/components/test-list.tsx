"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Test {
  id: string;
  config: {
    title: string;
    questionType: string;
    numberOfQuestions: number;
  };
  createdAt: Date;
  status: "ready" | "in-progress" | "completed" | "generating";
  progress: {
    currentQuestion: number;
    correctAnswers: number;
    completed: boolean;
  };
}

export default function TestList() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const testsRef = collection(db, "practice_tests");
    const userTestsQuery = query(testsRef, where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      userTestsQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const testData: Test[] = [];
        snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          testData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt.toDate(),
          } as Test);
        });
        setTests(
          testData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        );
        setLoading(false);
      },
      (error: Error) => {
        console.error("Error fetching tests:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const startTest = (testId: string) => {
    router.push(`/practice?testId=${testId}`);
  };

  const reviewTest = (testId: string) => {
    router.push(`/practice/review/${testId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Tests</h2>
        <p className="text-gray-500">Please sign in to view your tests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Tests</h2>
      {tests.length === 0 ? (
        <p className="text-gray-500">
          No tests found. Generate a new test to get started!
        </p>
      ) : (
        tests.map((test) => (
          <Card key={test.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{test.config.title}</h3>
                  <p className="text-sm text-gray-500">
                    {test.config.questionType} • {test.config.numberOfQuestions}{" "}
                    questions •{" "}
                    {formatDistanceToNow(test.createdAt, { addSuffix: true })}
                  </p>
                  {test.status === "completed" && (
                    <p className="text-sm text-green-600">
                      Score: {test.progress.correctAnswers}/
                      {test.config.numberOfQuestions}
                    </p>
                  )}
                  {test.status === "generating" && (
                    <p className="text-sm text-blue-600 flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Generating test...
                    </p>
                  )}
                </div>
                <div>
                  {test.status === "ready" && (
                    <Button onClick={() => startTest(test.id)}>
                      Start Test
                    </Button>
                  )}
                  {test.status === "in-progress" && (
                    <Button onClick={() => startTest(test.id)}>Continue</Button>
                  )}
                  {test.status === "completed" && (
                    <Button
                      onClick={() => reviewTest(test.id)}
                      variant="outline"
                    >
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
