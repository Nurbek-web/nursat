"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, PenTool } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TestGenerator from "@/components/test-generator";
import TestList from "@/components/test-list";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (user) {
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
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 bg-gradient-to-b from-background to-muted">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Master the SAT with AI-Powered Practice
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Personalized practice questions, instant feedback, and adaptive
            learning powered by advanced AI technology.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose SAT AI Prep?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card">
              <Brain className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">
                AI-Generated Questions
              </h3>
              <p className="text-muted-foreground">
                Unlimited practice with questions tailored to your skill level
                and learning style.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card">
              <PenTool className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Real-Time Feedback</h3>
              <p className="text-muted-foreground">
                Get instant explanations and learn from your mistakes as you
                practice.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card">
              <BookOpen className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">
                Comprehensive Coverage
              </h3>
              <p className="text-muted-foreground">
                Practice all SAT sections: Reading, Writing, and Math with
                detailed analytics.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
