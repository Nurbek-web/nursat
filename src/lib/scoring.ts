import { db } from './firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

interface ScoreUpdate {
  userId: string;
  section: string;
  score: number;
}

export async function updateUserProgress({ userId, section, score }: ScoreUpdate) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    // Calculate progress based on correct answers
    const currentProgress = userDoc.data().progress?.[section] || 0;
    const progressIncrement = score === 100 ? 2 : 0; // Increment progress by 2% for each correct answer
    
    // Update progress, ensuring it doesn't exceed 100%
    const newProgress = Math.min(currentProgress + progressIncrement, 100);

    await updateDoc(userRef, {
      [`progress.${section}`]: newProgress,
      [`stats.${section}.totalQuestions`]: increment(1),
      [`stats.${section}.correctAnswers`]: increment(score === 100 ? 1 : 0),
      lastActive: new Date().toISOString()
    });

    return newProgress;
  } catch (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
}