import React from "react";
import { Etymology } from "@/types";

interface EtymologyTreeProps {
  etymology: Etymology;
}

export default function EtymologyTree({ etymology }: EtymologyTreeProps) {
  return (
    <div className="bg-white text-gray-900 p-6 rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-center mb-6">{etymology.word}</h2>
      <div className="flex justify-center mb-6">
        <div className="border-t border-gray-300 w-1/2"></div>
      </div>
      <div className="flex justify-center space-x-8 mb-6">
        {etymology.roots.map((root, index) => (
          <div key={index} className="text-center">
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold">{root.root}</h3>
              <p className="text-sm text-gray-500">{root.origin}</p>
              <p className="mt-2 text-gray-700">{root.meaning}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mb-6">
        <div className="border-t border-gray-300 w-1/2"></div>
      </div>
      <div className="text-center">
        <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold">{etymology.word}</h3>
          <p className="mt-2 text-gray-700">{etymology.definition}</p>
        </div>
      </div>
    </div>
  );
}
