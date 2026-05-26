import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, MessageCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { addComment, updateComment } from '@/lib/localData';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const INITIAL_REPLIES_SHOWN = 3;
const INITIAL_COMMENTS_SHOWN = 10;

function CommentItem({ comment, allComments, storyId, level = 0 }) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [hasLiked, setHasLiked] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [repliesShown, setRepliesShown] = useState(INITIAL_REPLIES_SHOWN);
  const queryClient = useQueryClient();

  const childComments = allComments.filter(c => c.parent_comment_id === comment.id);
  const hasMoreReplies = childComments.length > repliesShown;
  const visibleReplies = childComments.slice(0, repliesShown);

  const likeMutation = useMutation({
    mutationFn: () => {
      const newLikes = hasLiked ? (comment.likes || 0) - 1 : (comment.likes || 0) + 1;
      updateComment(comment.id, { likes: newLikes });
      return Promise.resolve();
    },
    onSuccess: () => {
      setHasLiked(!hasLiked);
      queryClient.invalidateQueries({ queryKey: ['comments', storyId] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: (commentData) => {
      addComment(commentData);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', storyId] });
      setReplyText('');
      setIsReplying(false);
      toast.success('Reply posted!');
    },
  });

  const handleReply = () => {
    if (!replyText.trim()) return;
    replyMutation.mutate({
      story_id: storyId,
      parent_comment_id: comment.id,
      content: replyText,
      author_name: 'Anonymous User'
    });
  };

  return (
    <div className={`${level > 0 ? 'ml-8 mt-3' : 'mt-4'} border-l-2 ${level > 0 ? 'border-gray-200' : 'border-transparent'} pl-4`}>
      <div className="rounded-lg p-4 border bg-white">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm text-gray-900">{comment.author_name || 'Anonymous'}</span>
            <span className="text-xs text-gray-500 ml-2">
              {format(new Date(comment.created_date), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
          {childComments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 shrink-0 text-xs text-gray-500"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand thread' : 'Collapse thread'}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  {childComments.length} {childComments.length === 1 ? 'reply' : 'replies'}
                </>
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
        
        <p className="text-gray-700 text-sm mb-3">{comment.content}</p>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 ${hasLiked ? 'text-yellow-600' : 'text-gray-500'}`}
            onClick={() => likeMutation.mutate()}
          >
            <ThumbsUp className="w-4 h-4 mr-1" />
            {comment.likes || 0}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-gray-500"
            onClick={() => setIsReplying(!isReplying)}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Reply
          </Button>
        </div>

        {isReplying && (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleReply}
                disabled={!replyText.trim() || replyMutation.isPending}
              >
                <Send className="w-3 h-3 mr-1" />
                Post Reply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsReplying(false);
                  setReplyText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {!isCollapsed && childComments.length > 0 && (
        <div className="mt-2">
          {visibleReplies.map(childComment => (
            <CommentItem
              key={childComment.id}
              comment={childComment}
              allComments={allComments}
              storyId={storyId}
              level={level + 1}
            />
          ))}
          {hasMoreReplies && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-gray-500 hover:text-gray-900"
              onClick={() => setRepliesShown((p) => p + INITIAL_REPLIES_SHOWN)}
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Load {Math.min(INITIAL_REPLIES_SHOWN, childComments.length - repliesShown)} more replies
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ThreadedComments({ story, comments }) {
  const [newComment, setNewComment] = useState('');
  const [commentsShown, setCommentsShown] = useState(INITIAL_COMMENTS_SHOWN);
  const queryClient = useQueryClient();

  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const hasMoreComments = topLevelComments.length > commentsShown;
  const visibleTopComments = topLevelComments.slice(0, commentsShown);

  const commentMutation = useMutation({
    mutationFn: (commentData) => {
      addComment(commentData);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', story.id] });
      setNewComment('');
      toast.success('Comment posted!');
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    commentMutation.mutate({
      story_id: story.id,
      content: newComment,
      author_name: 'Anonymous User'
    });
  };

  return (
    <div className="mt-6">
      <div className="mt-6 space-y-3">
        <h3 className="font-semibold text-gray-900">Add a comment</h3>
        <Textarea
          placeholder="What are your thoughts?"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={4}
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || commentMutation.isPending}
        >
          <Send className="w-4 h-4 mr-2" />
          Post Comment
        </Button>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Comments ({topLevelComments.length})
        </h3>
        {topLevelComments.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <div className="space-y-4">
            {visibleTopComments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                allComments={comments}
                storyId={story.id}
              />
            ))}
            {hasMoreComments && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setCommentsShown((p) => p + INITIAL_COMMENTS_SHOWN)}
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                Load more comments ({topLevelComments.length - commentsShown} remaining)
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
