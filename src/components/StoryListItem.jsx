import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Mic, Video } from "lucide-react";
import { format } from "date-fns";
import { createStoryDetailUrl } from "@/utils";

const mediaTypeConfig = {
  text:  { icon: FileText, label: 'Text',  color: 'text-blue-600 bg-blue-50 border-blue-200' },
  voice: { icon: Mic,      label: 'Voice', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  video: { icon: Video,    label: 'Video', color: 'text-rose-600 bg-rose-50 border-rose-200' },
};

export default function StoryListItem({ story }) {
  const storyType = story.story_type || 'text';
  const media = mediaTypeConfig[storyType] || mediaTypeConfig.text;
  const MediaIcon = media.icon;

  return (
    <Link
      to={createStoryDetailUrl(story.id)}
      className="w-full flex items-start py-3 px-4 text-left hover:bg-gray-50/80 transition-colors group block"
    >
      <div className={`shrink-0 mt-1 mr-3 flex items-center justify-center w-8 h-8 rounded-lg border ${media.color}`}>
        <MediaIcon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="font-bold text-base text-gray-900 line-clamp-2 group-hover:text-yellow-600 transition-colors mb-1">
          {story.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-1.5">
          <span className="inline text-[9px] font-medium uppercase tracking-wider text-gray-400 bg-gray-100 px-1 py-0.5 rounded mr-1.5 align-middle">AI summary</span>
          {story.summary}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          {story.use_case && (
            <Badge variant="outline" className="text-gray-700 border-gray-300 bg-gray-50 text-[10px] px-1.5 py-0 h-4 font-normal">
              {story.use_case}
            </Badge>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(story.created_date), "MMM d, yyyy")}
          </span>
        </div>
      </div>
    </Link>
  );
}
