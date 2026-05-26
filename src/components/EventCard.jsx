import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Video, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function EventCard({ event, onClick }) {
  return (
    <Card
      className="hover:shadow-lg transition-all duration-300 overflow-hidden group"
    >
      {event.imageURL && (
        <div className="relative aspect-video overflow-hidden bg-gray-100">
          <img
            src={event.imageURL}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {event.isPast && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-gray-600">Past</Badge>
            </div>
          )}
        </div>
      )}
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {event.isVirtual && (
            <Badge variant="outline" className="text-indigo-700 border-indigo-300">
              <Video className="w-3 h-3 mr-1" />
              Virtual
            </Badge>
          )}
          {event.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-gray-600 border-gray-300">
              {tag}
            </Badge>
          ))}
        </div>

        <h3
          className="font-semibold text-lg text-gray-900 line-clamp-2 group-hover:text-yellow-600 transition-colors cursor-pointer"
          onClick={() => onClick?.(event)}
        >
          {event.title}
        </h3>

        <p className="text-sm text-gray-600 line-clamp-3">
          {event.description}
        </p>

        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{format(new Date(event.date), "EEEE, MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>

        {!event.isPast && event.registrationLink && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={(e) => {
              e.stopPropagation();
              window.open(event.registrationLink, "_blank");
            }}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-2" />
            Register
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
