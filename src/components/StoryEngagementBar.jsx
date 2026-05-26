import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Lightbulb, Heart, Share2, MessageCircle, Copy, Twitter } from "lucide-react";
import {
  getStoryReactions,
  updateStoryReaction,
  getUserStoryReactions,
  setUserStoryReaction,
} from "@/lib/localData";
import { createStoryDetailUrl } from "@/utils";
import { toast } from "sonner";

export default function StoryEngagementBar({ story, onCommentClick }) {
  const [reactions, setReactions] = useState(() => getStoryReactions(story.id));
  const [userReactions, setUserReactions] = useState(() => getUserStoryReactions(story.id));

  const handleEyeOpening = () => {
    const has = userReactions.eye_opening;
    const delta = has ? -1 : 1;
    updateStoryReaction(story.id, 'eye_opening', delta);
    setUserStoryReaction(story.id, 'eye_opening', !has);
    setReactions((prev) => ({ ...prev, eye_opening: Math.max(0, (prev.eye_opening || 0) + delta) }));
    setUserReactions((prev) => ({ ...prev, eye_opening: !has }));
  };

  const handleSupport = () => {
    const has = userReactions.support;
    const delta = has ? -1 : 1;
    updateStoryReaction(story.id, 'support', delta);
    setUserStoryReaction(story.id, 'support', !has);
    setReactions((prev) => ({ ...prev, support: Math.max(0, (prev.support || 0) + delta) }));
    setUserReactions((prev) => ({ ...prev, support: !has }));
  };

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${createStoryDetailUrl(story.id)}`
    : `${createStoryDetailUrl(story.id)}`;
  const shareText = encodeURIComponent(`${story.title} - AlgoStories`);
  const shareUrlEncoded = encodeURIComponent(shareUrl);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Link copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrlEncoded}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrlEncoded}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrlEncoded}`;

  return (
    <div className="flex flex-wrap items-center gap-4 py-4 border-b border-gray-100">
      <Button
        variant="outline"
        size="sm"
        className={userReactions.eye_opening ? 'text-yellow-600 border-yellow-600 bg-yellow-50' : 'text-gray-600'}
        onClick={handleEyeOpening}
        title="This taught me something / opened my eyes to the issue"
      >
        <Lightbulb className="w-4 h-4 mr-2" />
        Eye-Opening
        <span className="ml-2 font-medium">{reactions.eye_opening || 0}</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className={userReactions.support ? 'text-yellow-600 border-yellow-600 bg-yellow-50' : 'text-gray-600'}
        onClick={handleSupport}
        title="I stand with you / solidarity"
      >
        <Heart className="w-4 h-4 mr-2" />
        Support
        <span className="ml-2 font-medium">{reactions.support || 0}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-gray-600">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleCopyLink}>
            <Copy className="w-4 h-4 mr-2" />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer">
              <Twitter className="w-4 h-4 mr-2" />
              Share on X
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={facebookShareUrl} target="_blank" rel="noopener noreferrer">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Share on Facebook
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Share on LinkedIn
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        className="text-gray-600"
        onClick={onCommentClick}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Comment
      </Button>
    </div>
  );
}
