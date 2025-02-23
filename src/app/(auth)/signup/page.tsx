"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  grade: string;
  targetScore: string;
  studyHoursPerWeek: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SignupForm>({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    grade: "",
    targetScore: "",
    studyHoursPerWeek: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (!formData.fullName || !formData.grade || !formData.targetScore) {
        throw new Error("Please fill in all required fields");
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Update profile
      await updateProfile(userCredential.user, {
        displayName: formData.fullName,
      });

      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email,
        fullName: formData.fullName,
        grade: formData.grade,
        targetScore: formData.targetScore,
        studyHoursPerWeek: formData.studyHoursPerWeek,
        createdAt: new Date().toISOString(),
        stats: {
          totalQuestions: 0,
          correctAnswers: 0,
          readingScore: 0,
          writingScore: 0,
          mathScore: 0,
        },
        progress: {
          reading: 0,
          writing: 0,
          math: 0,
        },
      });

      toast({
        title: "Account created successfully",
        description: "Welcome to SAT AI Prep!",
      });

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fullName">Full Name</label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="grade">Grade</label>
              <Select
                value={formData.grade}
                onValueChange={(value) =>
                  setFormData({ ...formData, grade: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">9th Grade</SelectItem>
                  <SelectItem value="10">10th Grade</SelectItem>
                  <SelectItem value="11">11th Grade</SelectItem>
                  <SelectItem value="12">12th Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="targetScore">Target Score</label>
              <Select
                value={formData.targetScore}
                onValueChange={(value) =>
                  setFormData({ ...formData, targetScore: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1200">1200+</SelectItem>
                  <SelectItem value="1300">1300+</SelectItem>
                  <SelectItem value="1400">1400+</SelectItem>
                  <SelectItem value="1500">1500+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="studyHours">Study Hours per Week</label>
              <Select
                value={formData.studyHoursPerWeek}
                onValueChange={(value) =>
                  setFormData({ ...formData, studyHoursPerWeek: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select study hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 hours</SelectItem>
                  <SelectItem value="10">10 hours</SelectItem>
                  <SelectItem value="15">15 hours</SelectItem>
                  <SelectItem value="20">20+ hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>

            <p className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
