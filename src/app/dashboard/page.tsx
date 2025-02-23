"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

interface ActivityLog {
  type: string;
  score: number;
  timestamp: Date;
  section: string;
}

interface UserStats {
  totalQuestions: number;
  correctAnswers: number;
  readingScore: number;
  writingScore: number;
  mathScore: number;
  practiceTime: number;
  lastPracticed: Date | null;
}

interface UserProgress {
  reading: number;
  writing: number;
  math: number;
  vocabulary?: number;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState<UserStats>({
    totalQuestions: 0,
    correctAnswers: 0,
    readingScore: 0,
    writingScore: 0,
    mathScore: 0,
    practiceTime: 0,
    lastPracticed: null,
  });
  const [progress, setProgress] = useState<UserProgress>({
    reading: 0,
    writing: 0,
    math: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [performanceData, setPerformanceData] = useState<
    Array<{
      date: string;
      score: number;
    }>
  >([]);

  useEffect(() => {
    if (!user && !loading) {
      router.push("/login");
      return;
    }

    if (user) {
      fetchUserData();
    }
  }, [user, loading, router]);

  const fetchUserStats = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return;

    const db = getFirestore();
    const practiceRef = collection(db, "practice_sessions");
    const userPracticeQuery = query(
      practiceRef,
      where("userId", "==", user.uid)
    );

    try {
      const querySnapshot = await getDocs(userPracticeQuery);
      let total = 0;
      let correct = 0;
      let timeSpent = 0;
      let lastDate = null;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        total += data.totalQuestions || 0;
        correct += data.correctAnswers || 0;
        timeSpent += data.duration || 0;

        if (!lastDate || data.timestamp > lastDate) {
          lastDate = data.timestamp;
        }
      });

      setStats({
        totalQuestions: total,
        correctAnswers: correct,
        practiceTime: timeSpent,
        lastPracticed: lastDate,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch user document
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        toast({
          title: "Profile Setup Required",
          description: "Please complete your profile setup to track progress",
          variant: "destructive",
        });
        return;
      }

      // Update progress state
      const userData = userDoc.data();
      setProgress(userData.progress || { reading: 0, writing: 0, math: 0 });

      // Fetch recent activity
      const activityQuery = query(
        collection(db, "practice_sessions"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(5)
      );

      const activityDocs = await getDocs(activityQuery);
      const activities = activityDocs.docs.map(
        (doc: QueryDocumentSnapshot<DocumentData>) => ({
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate(),
        })
      );
      setRecentActivity(activities);

      // Fetch performance data
      const performanceQuery = query(
        collection(db, "practice_sessions"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "asc"),
        limit(10)
      );

      const performanceDocs = await getDocs(performanceQuery);
      const performanceHistory = performanceDocs.docs.map(
        (doc: QueryDocumentSnapshot<DocumentData>) => ({
          date: doc.data().timestamp.toDate().toLocaleDateString(),
          score: doc.data().score,
        })
      );
      setPerformanceData(performanceHistory);

      // Fetch stats
      await fetchUserStats();
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Questions</h3>
          <p className="text-3xl font-bold">{stats.totalQuestions}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Correct Answers</h3>
          <p className="text-3xl font-bold">{stats.correctAnswers}</p>
          <p className="text-sm text-gray-500">
            (
            {((stats.correctAnswers / stats.totalQuestions) * 100 || 0).toFixed(
              1
            )}
            % accuracy)
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Practice Time</h3>
          <p className="text-3xl font-bold">
            {Math.round(stats.practiceTime / 60)} mins
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Last Practice</h3>
          <p className="text-3xl font-bold">
            {stats.lastPracticed
              ? new Date(stats.lastPracticed).toLocaleDateString()
              : "Never"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={(stats.correctAnswers / stats.totalQuestions) * 100 || 0}
            />
            <p className="mt-2">
              {stats.correctAnswers} correct out of {stats.totalQuestions}{" "}
              questions
            </p>
          </CardContent>
        </Card>

        {/* Add more cards for different sections */}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <Button
          onClick={() => router.push("/practice?type=reading")}
          className="w-full"
        >
          Practice Reading
        </Button>
        <Button
          onClick={() => router.push("/practice?type=writing")}
          className="w-full"
        >
          Practice Writing
        </Button>
        <Button
          onClick={() => router.push("/practice?type=math")}
          className="w-full"
        >
          Practice Math
        </Button>
        <Button
          onClick={() => router.push("/practice?type=vocabulary")}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          Practice Vocabulary
        </Button>
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Reading Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress.reading} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Writing Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress.writing} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Math Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress.math} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vocabulary Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress.vocabulary || 0} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <p className="font-medium">{activity.type}</p>
                <p className="text-sm text-muted-foreground">
                  Score: {activity.score}% - {activity.section}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity.timestamp.toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Performance Chart */}
      {performanceData.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add your chart component here */}
            <div className="h-64">
              {performanceData.map((data, index) => (
                <div key={index}>
                  {data.date}: {data.score}%
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
