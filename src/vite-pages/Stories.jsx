import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, PenLine } from "lucide-react";
import StoryListItem from "@/components/StoryListItem";
import ImpactSnapshot from "@/components/ImpactSnapshot";
import { storiesData } from "../components/data/storiesData";
import { createPageUrl } from "@/utils";
import { getStories, getComments, getImpactMetrics } from "@/lib/localData";

export default function Stories() {
  const [searchParams] = useSearchParams();
  const initialUseCase = searchParams.get('useCase') || 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState(initialUseCase);
  const [selectedCity, setSelectedCity] = useState('all');

  const allStories = getStories(storiesData);
  const stories = allStories.filter(story => story.page_type === 'Stories');
  const allUseCases = ['all', ...new Set(stories.map(story => story.use_case).filter(Boolean))];
  const allCities = ['all', ...new Set(stories.map(story => story.city).filter(Boolean))];
  const impactMetrics = getImpactMetrics(stories);
  const isLoading = false;

  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          story.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUseCase = selectedUseCase === 'all' || story.use_case === selectedUseCase;
    const matchesCity = selectedCity === 'all' || story.city === selectedCity;
    return matchesSearch && matchesUseCase && matchesCity;
  });

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
            <linearGradient id="storiesHeaderMesh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#storiesHeaderMesh)" strokeWidth="1.1">
            <path d="M0 170 L120 130 L240 160 L350 118 L470 146 L590 108 L720 136 L860 96 L980 130 L1200 84" />
            <path d="M0 210 L130 176 L250 204 L375 166 L505 194 L635 158 L770 188 L900 152 L1040 178 L1200 138" />
            <path d="M120 130 L130 176 M240 160 L250 204 M350 118 L375 166 M470 146 L505 194 M590 108 L635 158 M720 136 L770 188 M860 96 L900 152 M980 130 L1040 178" />
          </g>
        </svg>
        <div className="relative max-w-6xl mx-auto px-6 py-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-yellow-300" />
              Stories
            </h1>
            <p className="text-yellow-100/80 mt-2">
              Community's stories and perspectives on public algorithms
            </p>
          </div>
          <Link
            to={createPageUrl('ShareStory')}
            className="shrink-0 inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-semibold px-5 py-2.5 rounded-lg hover:bg-yellow-100 transition-colors shadow-sm"
          >
            <PenLine className="w-4 h-4" />
            Share Your Story
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 -mt-8 relative z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/80 shadow-xl space-y-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input 
              placeholder="Search stories..." 
              className="pl-10 !border-gray-200 !focus-visible:border-gray-300 !focus-visible:ring-1 !focus-visible:ring-gray-300/70"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">Use Case</label>
                <Select value={selectedUseCase} onValueChange={setSelectedUseCase}>
                  <SelectTrigger className="w-full !border-gray-200 focus:!border-gray-300 focus:!ring-1 focus:!ring-gray-300/70">
                    <SelectValue placeholder="All Use Cases" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUseCases.map((useCase) => (
                      <SelectItem key={useCase} value={useCase}>
                        {useCase === 'all' ? 'All Use Cases' : useCase}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">City</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="w-full !border-gray-200 focus:!border-gray-300 focus:!ring-1 focus:!ring-gray-300/70">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city === 'all' ? 'All Cities' : city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="flex gap-3 py-3 px-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredStories.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col divide-y divide-gray-100 shadow-sm">
            {filteredStories.map(story => (
              <StoryListItem 
                key={story.id} 
                story={story} 
                commentCount={getComments(story.id).length}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stories found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Community Impact - bottom of page */}
      <ImpactSnapshot metrics={impactMetrics} />
    </div>
  );
}
