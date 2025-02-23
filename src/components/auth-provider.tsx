"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export function AuthProvider() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (!user) {
        // Handle not authenticated state
        console.log("User not authenticated");
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
