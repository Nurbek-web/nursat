import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function PracticeModeSelector() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto p-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Finite Practice</h2>
          <p className="text-gray-600 mb-4">
            Practice with a set of 5 questions. Perfect for quick practice
            sessions.
          </p>
          <Button
            onClick={() => router.push("/practice?mode=finite")}
            className="w-full"
          >
            Start Finite Practice
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Infinite Practice</h2>
          <p className="text-gray-600 mb-4">
            Practice with unlimited questions. Continue as long as you want.
          </p>
          <Button
            onClick={() => router.push("/practice?mode=infinite")}
            className="w-full"
          >
            Start Infinite Practice
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
