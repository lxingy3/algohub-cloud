import React, { useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Calendar, Play, Video, FileText, Quote, Mic } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import StoryEngagementBar from "@/components/StoryEngagementBar";
import ThreadedComments from "@/components/ThreadedComments";
import { storiesData } from "../components/data/storiesData";
import { getStories, getComments } from "@/lib/localData";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";

export default function StoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const commentsRef = useRef(null);

  const allStories = getStories(storiesData);
  const story = allStories.find((s) => s.id === id);

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => Promise.resolve(getComments(id)),
    enabled: !!id,
  });

  const scrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Story not found</h2>
          <p className="text-gray-500 mb-4">The story you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate(createPageUrl('Stories'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Breadcrumbs / Back */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('Stories'))}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stories
          </Button>
          <nav className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Link to={createPageUrl('Home')} className="hover:text-gray-900">Home</Link>
            <span>/</span>
            <Link to={createPageUrl('Stories')} className="hover:text-gray-900">Stories</Link>
            <span>/</span>
            <span className="text-gray-900 truncate max-w-[200px]" title={story.title}>{story.title}</span>
          </nav>
        </div>
      </div>

      {/* Story Content */}
      <article className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg border border-gray-100 p-8 pb-4">
          {/* Metadata */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {story.use_case && (
              <Badge variant="outline" className="text-indigo-700 border-indigo-300">
                {story.use_case}
              </Badge>
            )}
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(story.created_date), "MMMM d, yyyy")}
            </span>
          </div>

          {/* Engagement: Eye-Opening, Support, Share, Comment */}
          <StoryEngagementBar
            story={story}
            commentCount={comments.length}
            onCommentClick={scrollToComments}
          />

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{story.title}</h1>

          {/* Summary */}
          <div className="mb-8 border-l-4 border-yellow-500 pl-4">
            <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mb-1">AI-generated summary</span>
            <p className="text-gray-600 text-lg">
              {story.summary}
            </p>
          </div>

          {/* Content */}
          {story.story_type === 'video' ? (
            <>
              {/* Video Player Placeholder */}
              <div className="mb-8 rounded-xl overflow-hidden border border-gray-200 bg-gray-900 relative aspect-video flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950" />
                <div className="relative flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Video className="w-4 h-4" />
                    <span>Video Story</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/60 to-transparent flex items-end px-4 pb-2">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-1 flex-1 bg-white/20 rounded-full">
                      <div className="h-1 w-0 bg-amber-400 rounded-full" />
                    </div>
                    <span className="text-white/50 text-xs font-mono">0:00</span>
                  </div>
                </div>
              </div>

              {/* Video Excerpts Template */}
              {story.video_excerpts && (
                <div className="mb-6 border border-amber-200 rounded-xl bg-amber-50/50 overflow-hidden">
                  <div className="px-6 py-4 bg-amber-100/60 border-b border-amber-200 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-700" />
                    <h3 className="font-bold text-amber-900">Key Excerpts</h3>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {story.video_excerpts.map((excerpt, i) => (
                      <div key={i} className="px-6 py-5">
                        <span className="inline-block text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded mb-2">
                          {excerpt.label}
                        </span>
                        <div className="flex gap-3">
                          <Quote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-gray-700 italic leading-relaxed">{excerpt.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {story.video_citation && (
                    <div className="px-6 py-3 bg-amber-100/40 border-t border-amber-200 text-sm text-gray-500">
                      <span className="font-medium text-gray-600">Citation:</span> ({story.video_citation})
                    </div>
                  )}
                </div>
              )}
            </>
          ) : story.story_type === 'voice' ? (
            <>
              {/* Voice Player Placeholder */}
              <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
                <div className="flex items-center gap-4">
                  <button className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-md hover:bg-amber-600 transition-colors">
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Mic className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-gray-700">Voice Story</span>
                    </div>
                    <div className="h-10 flex items-center gap-[2px]">
                      {Array.from({ length: 60 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-amber-300 rounded-full"
                          style={{ height: `${Math.max(4, Math.sin(i * 0.5) * 16 + Math.random() * 18 + 8)}px` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400 font-mono">0:00</span>
                      <span className="text-xs text-gray-400 font-mono">3:24</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice Excerpts Template */}
              {story.voice_excerpts && (
                <div className="mb-6 border border-amber-200 rounded-xl bg-amber-50/50 overflow-hidden">
                  <div className="px-6 py-4 bg-amber-100/60 border-b border-amber-200 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-700" />
                    <h3 className="font-bold text-amber-900">Key Excerpts</h3>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {story.voice_excerpts.map((excerpt, i) => (
                      <div key={i} className="px-6 py-5">
                        <span className="inline-block text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded mb-2">
                          {excerpt.label}
                        </span>
                        <div className="flex gap-3">
                          <Quote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-gray-700 italic leading-relaxed">{excerpt.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {story.voice_citation && (
                    <div className="px-6 py-3 bg-amber-100/40 border-t border-amber-200 text-sm text-gray-500">
                      <span className="font-medium text-gray-600">Citation:</span> ({story.voice_citation})
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown>{story.content}</ReactMarkdown>
              </div>
              {story.citation && (
                <p className="mt-6 text-sm text-gray-500">
                  <span className="font-medium text-gray-600">Citation:</span> ({story.citation})
                </p>
              )}
            </>
          )}
        </div>

        {/* Comments Section */}
        <div ref={commentsRef} className="bg-white rounded-lg border border-gray-100 p-8 mt-6">
          <ThreadedComments story={story} comments={comments} />
        </div>
      </article>
    </div>
  );
}
