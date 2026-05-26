import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Video, ExternalLink, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function EventListItem({ event, onClick }) {
  return (
    <div
      className="group flex gap-6 py-6 hover:bg-amber-50/35 -mx-4 px-4 rounded-lg transition-colors cursor-pointer"
      onClick={() => onClick?.(event)}
    >
      {/* Timeline date node */}
      <div className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-yellow-300 bg-amber-50 flex flex-col items-center justify-center">
        <span className="text-xs font-semibold text-yellow-700 leading-tight">
          {format(new Date(event.date), "MMM")}
        </span>
        <span className="text-xl font-bold text-gray-900 leading-tight">
          {format(new Date(event.date), "d")}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {event.isVirtual && (
                <Badge variant="outline" className="text-gray-700 border-gray-300 text-xs">
                  <Video className="w-3 h-3 mr-1" />
                  Virtual
                </Badge>
              )}
              {event.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="text-gray-600 border-gray-300 text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-amber-700 transition-colors">
              {event.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
              {event.description}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {event.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">{event.location}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!event.isPast && event.registrationLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(event.registrationLink, "_blank");
                }}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Register
              </Button>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-700 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}
