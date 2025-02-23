"use client";

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface UserProfile {
  email: string;
  studyGoals: {
    daily: number;
    weekly: number;
  };
  targetScore: number;
}

export default function ProfilePage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    studyGoals: {
      daily: 30,
      weekly: 5
    },
    targetScore: 1200
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile({
            ...profile,
            ...docSnap.data()
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user, router]);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        studyGoals: profile.studyGoals,
        targetScore: profile.targetScore
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-8">Profile Settings</h1>

      <div className="grid gap-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Study Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Daily Study Time (minutes)</Label>
                <Slider
                  value={[profile.studyGoals.daily]}
                  onValueChange={(value) => setProfile({
                    ...profile,
                    studyGoals: { ...profile.studyGoals, daily: value[0] }
                  })}
                  max={180}
                  step={15}
                />
                <p className="text-sm text-muted-foreground">{profile.studyGoals.daily} minutes per day</p>
              </div>

              <div className="space-y-4">
                <Label>Practice Sessions per Week</Label>
                <Slider
                  value={[profile.studyGoals.weekly]}
                  onValueChange={(value) => setProfile({
                    ...profile,
                    studyGoals: { ...profile.studyGoals, weekly: value[0] }
                  })}
                  max={14}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">{profile.studyGoals.weekly} sessions per week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Target Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Slider
                value={[profile.targetScore]}
                onValueChange={(value) => setProfile({
                  ...profile,
                  targetScore: value[0]
                })}
                min={400}
                max={1600}
                step={10}
              />
              <p className="text-sm text-muted-foreground">Target SAT Score: {profile.targetScore}</p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}