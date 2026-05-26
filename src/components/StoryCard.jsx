import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

export default function StoryCard({ story, onClick }) {
  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden group"
      onClick={() => onClick?.(story)}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {story.use_case && (
            <Badge variant="outline" className="text-indigo-700 border-indigo-300 pointer-events-none">
              {story.use_case}
            </Badge>
          )}
        </div>
        
        <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 group-hover:text-yellow-600 transition-colors">
          {story.title}
        </h3>
        
        <p className="text-sm text-gray-600 line-clamp-3">
          {story.summary}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(story.created_date), "MMM d, yyyy")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}