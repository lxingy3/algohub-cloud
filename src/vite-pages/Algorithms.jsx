import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Database, Image, BookOpen, ArrowRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AlgorithmCard from "@/components/AlgorithmCard";
import { algorithmsData } from "../components/data/algorithmsData";
import { storiesData } from "../components/data/storiesData";
import { getAlgorithms } from "@/lib/localData";
import { createStoryDetailUrl } from "@/utils";

export default function Algorithms() {
  const [searchParams] = useSearchParams();
  const initialUseCase = searchParams.get('useCase') || 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState(initialUseCase);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);

  const algorithms = getAlgorithms(algorithmsData);
  const isLoading = false;

  // Get unique use cases and locations
  const allUseCases = ['all', ...new Set(algorithms.map(algo => algo.use_case).filter(Boolean))];
  const allLocations = ['all', ...new Set(algorithms.map(algo => algo.location).filter(Boolean))];

  const filteredAlgorithms = algorithms.filter(algo => {
    const matchesSearch = algo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          algo.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUseCase = selectedUseCase === 'all' || algo.use_case === selectedUseCase;
    const matchesLocation = selectedLocation === 'all' || algo.location === selectedLocation;
    return matchesSearch && matchesUseCase && matchesLocation;
  });

  // Get use case brief for selected use case
  const selectedUseCaseBrief = selectedUseCase !== 'all' 
    ? filteredAlgorithms.find(algo => algo.use_case === selectedUseCase)?.use_case_brief 
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a] border-b border-white/15">
        <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 220"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full opacity-[0.28]"
        >
          <defs>
            <linearGradient id="algorithmsHeaderMesh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#algorithmsHeaderMesh)" strokeWidth="1.1">
            <path d="M0 170 L120 130 L240 160 L350 118 L470 146 L590 108 L720 136 L860 96 L980 130 L1200 84" />
            <path d="M0 210 L130 176 L250 204 L375 166 L505 194 L635 158 L770 188 L900 152 L1040 178 L1200 138" />
            <path d="M120 130 L130 176 M240 160 L250 204 M350 118 L375 166 M470 146 L505 194 M590 108 L635 158 M720 136 L770 188 M860 96 L900 152 M980 130 L1040 178" />
            <path d="M120 130 L220 88 L330 112 L450 74 L570 104 L700 70 L840 100 L970 66 L1120 92" />
          </g>
        </svg>
        <div className="relative max-w-6xl mx-auto px-6 py-14">
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <Database className="w-8 h-8 text-yellow-300" />
            Algorithm Registry
          </h1>
          <p className="text-yellow-100/80 mt-2">
            Browse and explore all registered public algorithms
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="max-w-6xl mx-auto px-6 py-6 -mt-8 relative z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/80 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input 
              placeholder="Search algorithms..." 
              className="pl-10 !border-gray-200 !focus-visible:border-gray-300 !focus-visible:ring-1 !focus-visible:ring-gray-300/70"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Filters</p>
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm font-medium text-gray-600 sm:w-28 shrink-0">Location</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-full sm:w-[220px] !border-gray-200 focus:!border-gray-300 focus:!ring-1 focus:!ring-gray-300/70">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLocations.map(loc => (
                      <SelectItem key={loc} value={loc}>
                        {loc === 'all' ? 'All Locations' : loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                <label className="text-sm font-medium text-gray-600 sm:w-28 shrink-0 pt-1">Use Case</label>
                <div className="flex flex-wrap gap-2">
                  {allUseCases.map(useCase => (
                    <button
                      key={useCase}
                      onClick={() => setSelectedUseCase(useCase)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedUseCase === useCase
                          ? 'bg-yellow-500 text-gray-900 shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {useCase === 'all' ? 'All Use Cases' : useCase}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Algorithms Section */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Algorithm Profiles</h2>
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredAlgorithms.length}</span> of {algorithms.length}
          </p>
        </div>

        {/* Use Case Brief Banner */}
        {selectedUseCaseBrief && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 mb-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{selectedUseCase}</h3>
            <p className="text-gray-700">{selectedUseCaseBrief}</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 bg-white rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredAlgorithms.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlgorithms.map(algorithm => (
              <AlgorithmCard 
                key={algorithm.id} 
                algorithm={algorithm} 
                onClick={setSelectedAlgorithm}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No algorithms found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Algorithm Detail Dialog */}
      <Dialog open={!!selectedAlgorithm} onOpenChange={() => setSelectedAlgorithm(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedAlgorithm && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{selectedAlgorithm.name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-8 py-4">
                {/* Overview Section */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-6 border border-yellow-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-yellow-600" />
                    Overview
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Algorithm Name</p>
                      <p className="font-semibold text-gray-900">{selectedAlgorithm.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Used By</p>
                      <p className="font-semibold text-gray-900">{selectedAlgorithm.used_by || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Year Introduced/Updated</p>
                      <p className="font-semibold text-gray-900">{selectedAlgorithm.year_introduced || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Use Case</p>
                      <p className="font-semibold text-gray-900">{selectedAlgorithm.use_case || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Location</p>
                      <p className="font-semibold text-gray-900">{selectedAlgorithm.location || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Impact Level</p>
                      {selectedAlgorithm.impact_level ? (
                        <div className="flex items-center gap-1">
                          <Badge className={
                            selectedAlgorithm.impact_level === 'Low' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                            selectedAlgorithm.impact_level === 'Medium' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                            'bg-red-100 text-red-800 hover:bg-red-100'
                          }>
                            {selectedAlgorithm.impact_level} Impact
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
                      ) : (
                        <p className="font-semibold text-gray-900">N/A</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-yellow-600" />
                    Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Purpose</p>
                      <p className="text-gray-900">{selectedAlgorithm.purpose || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Data Used</p>
                      <p className="text-gray-900">{selectedAlgorithm.data_used || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Decision Type</p>
                      <p className="text-gray-900">{selectedAlgorithm.decision_type || 'N/A'}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 pt-2">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Year Deployed</p>
                        <p className="text-gray-900">{selectedAlgorithm.year_deployed || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
                        <Badge className={`whitespace-nowrap ${
                          selectedAlgorithm.status === 'Active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                          selectedAlgorithm.status === 'In Development' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                          selectedAlgorithm.status === 'Deprecated' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' :
                          'bg-orange-100 text-orange-800 hover:bg-orange-100'
                        }`}>
                          {selectedAlgorithm.status || 'N/A'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Current Version</p>
                        <p className="text-gray-900">{selectedAlgorithm.current_version || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* StoryBoard Section */}
                {selectedAlgorithm.storyboard_images && selectedAlgorithm.storyboard_images.length > 0 && (
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-6 border border-yellow-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Image className="w-5 h-5 text-yellow-600" />
                      StoryBoard
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      A visual narrative of the algorithm's real-world application and function
                    </p>
                    <div className="flex justify-center">
                      {selectedAlgorithm.storyboard_images.map((imageUrl, index) => (
                        <div key={index} className="bg-white rounded-lg p-2 border border-gray-200 w-full">
                          <img 
                            src={imageUrl} 
                            alt={`Storyboard ${index + 1}`}
                            className="w-full object-contain rounded mx-auto"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Stories Section */}
                {(() => {
                  const relatedStories = storiesData.filter(
                    (story) => story.use_case === selectedAlgorithm.use_case
                  );
                  return relatedStories.length > 0 ? (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-yellow-600" />
                        Related Stories
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Stories about {selectedAlgorithm.use_case}
                      </p>
                      <div className="space-y-3">
                        {relatedStories.map((story) => (
                          <Link
                            key={story.id}
                            to={createStoryDetailUrl(story.id)}
                            className="block p-4 bg-yellow-50/50 rounded-lg border border-yellow-200 hover:border-yellow-400 hover:shadow-md transition-all group"
                          >
                            <h4 className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors mb-1">
                              {story.title}
                            </h4>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {story.summary}
                            </p>
                            <span className="text-sm text-yellow-600 font-medium flex items-center gap-1">
                              Read story
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
