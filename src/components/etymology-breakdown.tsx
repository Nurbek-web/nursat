import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Etymology } from "@/types";

interface EtymologyBreakdownProps {
  etymology: Etymology;
}

export default function EtymologyBreakdown({
  etymology,
}: EtymologyBreakdownProps) {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Word Etymology Breakdown</h3>
      <Card className="bg-slate-50">
        <CardContent className="p-6">
          <div className="mb-4">
            <h4 className="font-medium text-lg text-blue-700">
              {etymology.word}
            </h4>
            <p className="text-gray-600 mt-1">{etymology.definition}</p>
            <p className="text-sm text-gray-500 mt-2 italic">
              Usage: {etymology.usage}
            </p>
          </div>

          <div className="space-y-4">
            <h5 className="font-medium text-gray-700">Word Roots:</h5>
            <div className="grid gap-3">
              {(etymology.roots || []).map((root, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium text-blue-600">
                        {root.root}
                      </span>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="text-gray-600">{root.origin}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-700">{root.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
