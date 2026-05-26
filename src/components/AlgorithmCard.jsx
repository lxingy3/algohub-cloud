import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Info } from "lucide-react";

const impactColors = {
  Low: "bg-green-100 text-green-800 hover:bg-green-100",
  Medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  High: "bg-red-100 text-red-800 hover:bg-red-100"
};

const statusColors = {
  Active: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  "In Development": "bg-blue-100 text-blue-800 hover:bg-blue-100",
  Deprecated: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  "Under Review": "bg-orange-100 text-orange-800 hover:bg-orange-100"
};

export default function AlgorithmCard({ algorithm, onClick }) {
  return (
    <Card 
      className="h-full flex flex-col hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-yellow-500 group"
      onClick={() => onClick?.(algorithm)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors line-clamp-2 min-h-[3.5rem]">
            {algorithm.name}
          </CardTitle>
          <Badge className={`${statusColors[algorithm.status] || "bg-gray-100 text-gray-800 hover:bg-gray-100"} pointer-events-none whitespace-nowrap shrink-0`}>
            {algorithm.status}
          </Badge>
        </div>
        {algorithm.use_case && (
          <Badge variant="outline" className="w-fit pointer-events-none hover:bg-transparent">
            {algorithm.use_case}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
            {algorithm.description}
          </p>

          <div className="mt-auto flex items-center justify-between min-h-5">
            {algorithm.location && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{algorithm.location}</span>
              </div>
            )}
            {algorithm.impact_level && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Badge className={`${impactColors[algorithm.impact_level]} pointer-events-none`}>
                  {algorithm.impact_level} Impact
                </Badge>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex rounded-full p-0.5 text-yellow-600 hover:text-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                        aria-label="What does Impact mean?"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px]">
                      <p>Impact measures the scale and severity of how this algorithm affects the community</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          {/* TODO: Re-enable view count display when analytics are ready
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{algorithm.views || 0} views</span>
          </div>
          */}
        </div>
      </CardContent>
    </Card>
  );
}
