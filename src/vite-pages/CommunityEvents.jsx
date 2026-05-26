import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, Video, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import EventListItem from "@/components/EventListItem";
import { eventsData } from "../components/data/eventsData";

function EventDetailView({ event }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {event.isVirtual && (
            <Badge variant="outline" className="text-gray-700 border-gray-300">
              <Video className="w-3 h-3 mr-1" />
              Virtual
            </Badge>
          )}
          {event.isPast && (
            <Badge variant="secondary" className="bg-gray-600">Past Event</Badge>
          )}
          {event.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-gray-600 border-gray-300">
              {tag}
            </Badge>
          ))}
        </div>
        <DialogTitle className="text-2xl">{event.title}</DialogTitle>
      </DialogHeader>
      <div className="py-4 space-y-6">
        {event.imageURL && (
          <img
            src={event.imageURL}
            alt={event.title}
            className="w-full rounded-lg object-cover max-h-48"
          />
        )}
        <p className="text-gray-600 text-lg border-l-4 border-yellow-500 pl-4">
          {event.description}
        </p>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-yellow-600" />
            <span>{format(new Date(event.date), "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-yellow-600" />
            <span>{event.location}</span>
          </div>
        </div>
        {!event.isPast && event.registrationLink && (
          <Button
            className="bg-yellow-600 hover:bg-yellow-700"
            onClick={() => window.open(event.registrationLink, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Register for this event
          </Button>
        )}
      </div>
    </>
  );
}

// Derive event types from tags (format-style tags first)
const EVENT_TYPE_OPTIONS = ['Workshop', 'Town Hall', 'Panel', 'Q&A', 'Education', 'Youth', 'Community', 'Other'];

export default function CommunityEvents() {
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'upcoming' | 'past'
  const [eventType, setEventType] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredEvents = eventsData.filter((event) => {
    const matchesTab =
      filterTab === 'all' ||
      (filterTab === 'upcoming' && !event.isPast) ||
      (filterTab === 'past' && event.isPast);
    const matchesEventType =
      eventType === 'all' ||
      event.tags?.includes(eventType) ||
      (eventType === 'Other' && !EVENT_TYPE_OPTIONS.slice(0, -1).some((t) => event.tags?.includes(t)));
    return matchesTab && matchesEventType;
  });

  const upcomingEvents = filteredEvents.filter((e) => !e.isPast);
  const pastEvents = filteredEvents.filter((e) => e.isPast);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a] border-b border-white/15">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 220"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full opacity-[0.24]"
        >
          <defs>
            <linearGradient id="eventsHeaderMesh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#eventsHeaderMesh)" strokeWidth="1.1">
            <path d="M0 170 L120 130 L240 160 L350 118 L470 146 L590 108 L720 136 L860 96 L980 130 L1200 84" />
            <path d="M0 210 L130 176 L250 204 L375 166 L505 194 L635 158 L770 188 L900 152 L1040 178 L1200 138" />
            <path d="M120 130 L130 176 M240 160 L250 204 M350 118 L375 166 M470 146 L505 194 M590 108 L635 158 M720 136 L770 188 M860 96 L900 152 M980 130 L1040 178" />
          </g>
        </svg>
        <div className="relative max-w-6xl mx-auto px-6 py-14">
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-yellow-300" />
            Community Events
          </h1>
          <p className="text-yellow-100/80 mt-2">
            Workshops, town halls, and gatherings about algorithms and public services
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 -mt-8 relative z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/80 space-y-6">
          {/* Filter Tabs */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Filter</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All Events' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'past', label: 'Past' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    filterTab === tab.id
                      ? 'bg-yellow-500 text-gray-900 shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event Type */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t border-gray-200 pt-6">
            <label className="text-sm font-semibold text-gray-700 sm:w-28 shrink-0">Event Type</label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-full sm:w-[220px] !border-gray-200 focus:!border-gray-300 focus:!ring-1 focus:!ring-gray-300/70">
                <SelectValue placeholder="All event types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {EVENT_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-16 space-y-12">
        {filteredEvents.length > 0 ? (
          <>
            {/* Upcoming Events - show when All or Upcoming */}
            {(filterTab === 'all' || filterTab === 'upcoming') && (
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-white/70">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                    Upcoming Events
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {upcomingEvents.length} {upcomingEvents.length === 1 ? 'event' : 'events'} coming up
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event) => (
                      <EventListItem
                        key={event.id}
                        event={event}
                        onClick={setSelectedEvent}
                      />
                    ))
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      No upcoming events match your filters
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Past Events - show when All or Past */}
            {(filterTab === 'all' || filterTab === 'past') && (
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-white/70">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    Past Events
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {pastEvents.length} past {pastEvents.length === 1 ? 'event' : 'events'}
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {pastEvents.length > 0 ? (
                    pastEvents.map((event) => (
                      <EventListItem
                        key={event.id}
                        event={event}
                        onClick={setSelectedEvent}
                      />
                    ))
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      No past events match your filters
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500">Try adjusting your filters</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && <EventDetailView event={selectedEvent} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
