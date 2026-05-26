import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Database, Eye, ExternalLink, Quote, Users, Bus, GraduationCap, Briefcase, Zap, Shield, Heart, Home as HomeIcon, Landmark, Code2, Settings, Bot, TerminalSquare, User, MousePointer2, AppWindow } from "lucide-react";
import { algorithmsData } from "../components/data/algorithmsData";
import { storiesData } from "../components/data/storiesData";
import { getAlgorithms } from "@/lib/localData";
import AlgorithmCard from "@/components/AlgorithmCard";

export default function Home() {
  const [activeService, setActiveService] = useState('student');
  const [step, setStep] = useState(1);

  const stepContent = [
    {
      title: "1. AI Development",
      text: "The Development Team builds the AI model. The AI Tool begins its journey to the public agency."
    },
    {
      title: "2. AI Procurement",
      text: "The Public Agency procures the AI tool from the development team with contract conditions."
    },
    {
      title: "3. Deployment & Integration",
      text: "Agency Staff is trained to use the AI Tool for augmented workflows."
    },
    {
      title: "4. Adoption in Public Service",
      text: "Agency staff starts using the AI tool in decision making for the community contexts."
    },
    {
      title: "5. The Missing Piece",
      text: "AlgoStories gives the community a space to share how these systems affect real lives."
    }
  ];

  const getToolPosition = () => {
    switch (step) {
      case 1: return 'left-[16.66%] opacity-100 scale-100';
      case 2: return 'left-[50%] opacity-100 scale-100';
      case 3: return 'left-[66.66%] opacity-100 scale-100';
      case 4:
      case 5: return 'left-[83.33%] opacity-100 scale-100';
      default: return 'left-[16.66%] opacity-100 scale-100';
    }
  };

  const getStaffPosition = () => {
    switch (step) {
      case 1:
      case 2: return 'left-[50%] opacity-100 scale-100';
      case 3: return 'left-[66.66%] opacity-100 scale-100';
      case 4:
      case 5: return 'left-[83.33%] opacity-100 scale-100';
      default: return 'left-[50%] opacity-0';
    }
  };

  const allAlgorithms = getAlgorithms(algorithmsData);

  const useCases = [
    { id: 'fraud', label: 'Fraud Detection', icon: Shield, useCase: 'Fraud Detection' },
    { id: 'traffic', label: 'Traffic Management', icon: Bus, useCase: 'Traffic Management' },
    { id: 'student', label: 'Student Support', icon: GraduationCap, useCase: 'Student Support' },
    { id: 'job', label: 'Job Matching', icon: Briefcase, useCase: 'Job Matching' },
    { id: 'energy', label: 'Energy Forecasting', icon: Zap, useCase: 'Energy Forecasting' },
    { id: 'childwelfare', label: 'Child Welfare', icon: Heart, useCase: 'Child Welfare' },
    { id: 'housing', label: 'Housing Prioritization', icon: HomeIcon, useCase: 'Housing Prioritization' },
  ];

  const services = useCases.map(uc => {
    const algoCount = allAlgorithms.filter(a => a.use_case === uc.useCase).length;
    const relatedStories = storiesData.filter(s => s.use_case === uc.useCase && s.page_type === 'Stories');
    const description = allAlgorithms.find(a => a.use_case === uc.useCase)?.use_case_brief || '';
    return {
      ...uc,
      description,
      algoCount,
      storyCount: relatedStories.length,
    };
  });

  const activeData = services.find(s => s.id === activeService);

  const events = [
    {
      tag: "New Card",
      title: "Bob.AI Profile Added",
      description: "See how the new housing voucher allocation system works."
    },
    {
      tag: "Event",
      title: "Community Data Rights 101",
      description: "Join us March 12th for a workshop on digital privacy."
    },
    {
      tag: "News",
      title: "AlgoStories in the City Paper",
      description: "Read our interview about transparency in local government."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#e0ac19] via-[#8e690f] to-[#050505] text-white">
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 560"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full opacity-[0.36]"
        >
          <defs>
            <linearGradient id="heroMeshStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#heroMeshStroke)" strokeWidth="1.15">
            <path d="M0 420 L110 360 L235 405 L360 338 L490 382 L620 318 L760 360 L900 300 L1020 345 L1200 280" />
            <path d="M0 500 L135 438 L250 482 L382 420 L510 462 L645 400 L785 445 L915 382 L1060 420 L1200 360" />
            <path d="M0 360 L130 300 L245 340 L365 280 L505 332 L630 270 L770 315 L905 252 L1030 300 L1200 240" />
            <path d="M110 360 L135 438 M235 405 L250 482 M360 338 L382 420 M490 382 L510 462 M620 318 L645 400 M760 360 L785 445 M900 300 L915 382 M1020 345 L1060 420" />
            <path d="M110 360 L130 300 M235 405 L245 340 M360 338 L365 280 M490 382 L505 332 M620 318 L630 270 M760 360 L770 315 M900 300 L905 252 M1020 345 L1030 300" />
            <path d="M135 438 L250 482 L365 430 L510 462 L645 412 L785 445 L915 392 L1060 420" />
            <path d="M130 300 L245 340 L365 288 L505 332 L630 278 L770 315 L905 260 L1030 300" />
          </g>
          <g fill="rgba(255,255,255,0.24)">
            <circle cx="235" cy="405" r="1.6" />
            <circle cx="360" cy="338" r="1.6" />
            <circle cx="490" cy="382" r="1.6" />
            <circle cx="620" cy="318" r="1.6" />
            <circle cx="760" cy="360" r="1.6" />
            <circle cx="900" cy="300" r="1.6" />
            <circle cx="250" cy="482" r="1.6" />
            <circle cx="382" cy="420" r="1.6" />
            <circle cx="510" cy="462" r="1.6" />
            <circle cx="645" cy="400" r="1.6" />
            <circle cx="785" cy="445" r="1.6" />
            <circle cx="915" cy="382" r="1.6" />
          </g>
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 560"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full opacity-[0.2]"
        >
          <defs>
            <linearGradient id="dataFlowStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="45%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#dataFlowStroke)" strokeWidth="1">
            <path d="M90 120 H260 L315 178 H470 L540 130 H690 L760 188 H930 L1005 145 H1135" />
            <path d="M70 210 H210 L280 258 H405 L470 218 H635 L700 270 H840 L915 230 H1090" />
            <path d="M110 300 H250 L330 352 H475 L550 308 H705 L780 360 H925 L990 320 H1140" />
            <path d="M80 390 H230 L300 440 H445 L520 402 H680 L755 450 H910 L980 412 H1120" />
          </g>
          <g fill="rgba(255,255,255,0.18)">
            <circle cx="90" cy="120" r="2.2" />
            <circle cx="315" cy="178" r="2.2" />
            <circle cx="540" cy="130" r="2.2" />
            <circle cx="760" cy="188" r="2.2" />
            <circle cx="1005" cy="145" r="2.2" />

            <circle cx="70" cy="210" r="2.2" />
            <circle cx="280" cy="258" r="2.2" />
            <circle cx="470" cy="218" r="2.2" />
            <circle cx="700" cy="270" r="2.2" />
            <circle cx="915" cy="230" r="2.2" />

            <circle cx="110" cy="300" r="2.2" />
            <circle cx="330" cy="352" r="2.2" />
            <circle cx="550" cy="308" r="2.2" />
            <circle cx="780" cy="360" r="2.2" />
            <circle cx="990" cy="320" r="2.2" />

            <circle cx="80" cy="390" r="2.2" />
            <circle cx="300" cy="440" r="2.2" />
            <circle cx="520" cy="402" r="2.2" />
            <circle cx="755" cy="450" r="2.2" />
            <circle cx="980" cy="412" r="2.2" />
          </g>
          <g fill="rgba(255,255,255,0.13)">
            <rect x="250" y="113" width="10" height="10" rx="2" />
            <rect x="690" y="123" width="10" height="10" rx="2" />
            <rect x="405" y="203" width="10" height="10" rx="2" />
            <rect x="840" y="263" width="10" height="10" rx="2" />
            <rect x="475" y="292" width="10" height="10" rx="2" />
            <rect x="925" y="350" width="10" height="10" rx="2" />
          </g>
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 620 560"
          preserveAspectRatio="none"
          className="absolute inset-y-0 right-0 h-full w-[52%] opacity-[0.3]"
        >
          <defs>
            <linearGradient id="ctaClusterStroke" x1="100%" y1="0%" x2="0%" y2="40%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#ctaClusterStroke)" strokeWidth="1.2">
            <path d="M560 90 L455 160 L355 140 L248 205 L172 280" />
            <path d="M592 165 L492 205 L380 230 L276 252 L172 280" />
            <path d="M575 255 L488 285 L395 318 L292 305 L172 280" />
            <path d="M598 355 L505 382 L410 372 L306 334 L172 280" />
            <path d="M562 460 L468 432 L365 396 L265 346 L172 280" />
            <path d="M455 160 L492 205 L488 285 L505 382 L468 432" />
            <path d="M355 140 L380 230 L395 318 L410 372 L365 396" />
          </g>
          <g fill="rgba(255,255,255,0.26)">
            <circle cx="560" cy="90" r="3" />
            <circle cx="592" cy="165" r="3" />
            <circle cx="575" cy="255" r="3" />
            <circle cx="598" cy="355" r="3" />
            <circle cx="562" cy="460" r="3" />
            <circle cx="455" cy="160" r="2.6" />
            <circle cx="492" cy="205" r="2.6" />
            <circle cx="488" cy="285" r="2.6" />
            <circle cx="505" cy="382" r="2.6" />
            <circle cx="468" cy="432" r="2.6" />
            <circle cx="172" cy="280" r="3.6" />
          </g>
        </svg>
        {/* <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28"> */}
        <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-20 md:pt-16 md:pb-28">
          <div className="grid lg:grid-cols-2 items-center gap-12 lg:gap-20">
            {/* Left: Text */}
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.12] tracking-tight mb-5">
                Stories of Automated Systems{" "}
                <span className="text-yellow-100">Shaping Our Daily Lives</span>
              </h1>
              <p className="text-base md:text-lg text-yellow-50/85 leading-relaxed mb-8">
                Explore how these systems function in our community through clear overviews and shared stories of their real-world impact.
              </p>
              <div className="flex flex-wrap gap-4 mb-4">
                <Link to={createPageUrl('Algorithms')}>
                  <Button
                    size="lg"
                    className="h-12 px-7 text-base bg-gray-900 text-yellow-200 hover:bg-gray-800 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_24px_rgba(250,204,21,0.22)]"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Browse Algorithms
                  </Button>
                </Link>
                <Link to={createPageUrl('About')}>
                  <Button size="lg" variant="outline" className="h-12 px-7 text-base border-white/70 bg-white/10 text-white hover:bg-white/20">
                    Learn More
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="flex gap-6 text-base text-yellow-50/80 pl-1">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-yellow-100" />
                  Transparent profiles
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-yellow-100" />
                  Community stories
                </div>
              </div>
            </div>
            {/* Right: Image */}
            <div className="hidden lg:flex justify-center items-center">
              <img
                src="/hero2.png"
                alt="Policy, algorithms, public service, and community relationship diagram"
                className="w-full max-w-[400px] h-auto object-contain mix-blend-screen"
              />
            </div>
          </div>
        </div>
      </section>

      {/* AI Systems Diagram Section */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              A.I. Systems in Local Government
            </h2>
            <div className="flex items-center justify-center gap-2 text-gray-500 font-medium bg-amber-50 px-4 py-2 rounded-full w-fit mx-auto">
              <MousePointer2 className="w-4 h-4 animate-bounce" />
              <span>Tap a step below to see how AI moves through government</span>
            </div>
          </div>

          <div className="w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg p-6 pb-8 overflow-x-auto relative">

            <div className="min-w-[900px] relative pt-4">
              <div className="relative w-full h-44 mb-4">
                {/* Top Line (AI Tool Track) */}
                <div className="absolute top-[25%] left-[16.66%] w-[66.66%] h-0 border-t-2 border-dashed border-gray-400"></div>
                <div className={`absolute top-[25%] left-[16.66%] w-2 h-2 -mt-1 -translate-x-1/2 rounded-full transition-colors duration-500 ${step >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`absolute top-[25%] left-[50%] w-2 h-2 -mt-1 -translate-x-1/2 rounded-full transition-colors duration-500 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`absolute top-[25%] left-[83.33%] w-2 h-2 -mt-1 -translate-x-1/2 rounded-full transition-colors duration-500 ${step === 5 ? 'bg-gray-300' : step >= 4 ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>

                {/* AI Tool Moving Packet */}
                <div className={`absolute top-[25%] -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-700 ease-in-out flex flex-col items-center ${getToolPosition()}`}>
                  <div className={`mb-2 border text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase transition-colors duration-500 ${step === 5 ? 'border-gray-300 bg-gray-50 text-gray-400 shadow-none' : 'border-gray-800 bg-white shadow-sm'}`}>
                    AI TOOL
                  </div>
                  <div className={`border-2 rounded-md p-2 relative transition-colors duration-500 ${step === 5 ? 'border-gray-300 bg-gray-50 shadow-none' : step === 4 ? 'border-yellow-500 shadow-md shadow-yellow-200/50 bg-white' : step >= 1 ? 'border-amber-500 shadow-md bg-white' : 'border-gray-800 shadow-md bg-white'}`}>
                    {step >= 4 ? <Bot className={`w-6 h-6 transition-colors duration-500 ${step === 5 ? 'text-gray-400' : 'text-yellow-600'}`} /> : <Code2 className="w-6 h-6 text-gray-800" />}
                    {step < 4 && <Settings className="w-4 h-4 text-gray-800 absolute -bottom-2 -right-2 bg-white rounded-full animate-[spin_4s_linear_infinite]" />}
                  </div>
                </div>

                {/* Bottom Line (Agency Staff Track) */}
                <div className="absolute top-[75%] left-[50%] w-[33.33%] h-0 border-t-2 border-dashed border-gray-300"></div>
                <div className={`absolute top-[75%] left-[50%] w-2 h-2 -mt-1 -translate-x-1/2 rounded-full transition-colors duration-500 ${step >= 3 ? 'bg-indigo-500' : 'bg-gray-200'}`}></div>
                <div className={`absolute top-[75%] left-[83.33%] w-2 h-2 -mt-1 -translate-x-1/2 rounded-full transition-colors duration-500 ${step === 5 ? 'bg-gray-300' : step >= 4 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>

                {/* Agency Staff Moving Packet */}
                <div className={`absolute top-[75%] -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-700 ease-in-out flex flex-col items-center ${getStaffPosition()}`}>
                  <div className="relative flex flex-col items-center mb-2">
                    <User className={`w-10 h-10 transition-colors duration-500 ${step <= 2 ? 'text-gray-300' : step === 5 ? 'text-gray-300' : 'text-gray-800'}`} />
                  </div>
                  <div className={`border-2 px-3 py-1 text-xs font-bold tracking-wider whitespace-nowrap transition-colors duration-500 ${step <= 2 ? 'border-gray-300 text-gray-400 bg-gray-50 shadow-none' : step === 5 ? 'border-gray-300 text-gray-400 bg-gray-50 shadow-none' : 'border-gray-800 text-gray-800 bg-white shadow-md'}`}>
                    AGENCY STAFF
                  </div>
                </div>
              </div>

              {/* 3 Main Entity Pillars */}
              <div className="flex w-full relative z-10 border-t border-gray-100 pt-6">
                <div className="w-1/3 flex flex-col items-center">
                  <div className={`relative transition-all duration-500 flex h-20 items-center justify-center ${step === 1 ? 'scale-110 drop-shadow-md' : 'opacity-70'}`}>
                    <Users className="w-20 h-20 text-blue-700" />
                    <TerminalSquare className="w-11 h-11 text-blue-700 absolute -bottom-3 -right-5 bg-white rounded-full p-1.5 border-2 border-blue-600" />
                  </div>
                  <div className={`mt-6 border-2 px-3 py-1.5 text-xs font-bold tracking-wider transition-colors duration-500 ${step === 1 ? 'border-blue-600 text-blue-700 bg-blue-50 shadow-md' : 'border-blue-300 text-blue-600 bg-blue-50/50'}`}>
                    DEVELOPMENT TEAM
                  </div>
                </div>
                <div className="w-1/3 flex flex-col items-center">
                  <div className={`relative transition-all duration-500 flex h-20 items-center justify-center ${step === 2 || step === 3 ? 'scale-110 drop-shadow-md' : 'opacity-70'}`}>
                    <Landmark className="w-20 h-20 text-indigo-700" />
                  </div>
                  <div className={`mt-6 border-2 px-3 py-1.5 text-xs font-bold tracking-wider transition-colors duration-500 ${step === 2 || step === 3 ? 'border-indigo-600 text-indigo-700 bg-indigo-50 shadow-md' : 'border-indigo-300 text-indigo-600 bg-indigo-50/50'}`}>
                    PUBLIC AGENCY
                  </div>
                </div>
                <div className="w-1/3 flex flex-col items-center">
                  <div className={`relative transition-all duration-500 flex items-end justify-center h-20 ${step >= 4 ? 'scale-110 drop-shadow-md' : 'opacity-70'}`}>
                    {step >= 4 && (
                      <div className={`absolute -bottom-2 w-32 h-8 rounded-full blur-md opacity-60 transition-colors duration-500 ${step === 5 ? 'bg-emerald-200' : 'bg-emerald-100'}`}></div>
                    )}
                    <User className="w-12 h-12 text-emerald-700 mb-1 -mr-3 z-10" />
                    <User className="w-16 h-16 text-emerald-700 z-20 bg-white rounded-full" />
                    <User className="w-12 h-12 text-emerald-700 mb-1 -ml-3 z-10" />
                    <div className={`absolute -top-8 bg-white border-2 border-amber-600 text-amber-800 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xl transition-all duration-500 z-30 ${step === 5 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90 pointer-events-none'}`}>
                      <AppWindow className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-bold tracking-wide">AlgoStories</span>
                    </div>
                  </div>
                  <div className={`mt-6 border-2 px-6 py-1.5 text-xs font-bold tracking-wider transition-colors duration-500 z-20 ${step === 5 ? 'border-emerald-600 text-emerald-700 bg-emerald-50 shadow-md' : step === 4 ? 'border-emerald-600 text-emerald-700 bg-emerald-50 shadow-md' : 'border-emerald-300 text-emerald-600 bg-emerald-50/50'}`}>
                    COMMUNITY
                  </div>
                </div>
              </div>

              {/* Storyboard Cards */}
              <div className="grid grid-cols-5 gap-3 mt-8 pt-6 border-t border-gray-100 relative z-50">
                {stepContent.map((content, index) => {
                  const stepNum = index + 1;
                  const isActive = step === stepNum;
                  const isAlgoStories = stepNum === 5;

                  let activeBg, activeTitle, activeText;

                  if (isAlgoStories) {
                    activeBg = isActive
                      ? 'bg-gray-900 border-amber-400 shadow-lg shadow-amber-200/40'
                      : 'bg-gray-800 border-gray-700 opacity-80 hover:opacity-100 hover:border-amber-400/60';
                    activeTitle = isActive ? 'text-amber-300' : 'text-gray-300';
                    activeText = isActive ? 'text-amber-100' : 'text-gray-400';
                  } else {
                    activeBg = 'bg-white border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-300';
                    activeTitle = 'text-gray-600';
                    activeText = 'text-gray-500';
                    if (isActive) {
                      if (stepNum === 1) { activeBg = 'bg-blue-50 border-blue-400 shadow-lg shadow-blue-100'; activeTitle = 'text-blue-900'; activeText = 'text-blue-800'; }
                      if (stepNum === 2) { activeBg = 'bg-indigo-50 border-indigo-400 shadow-lg shadow-indigo-100'; activeTitle = 'text-indigo-900'; activeText = 'text-indigo-800'; }
                      if (stepNum === 3) { activeBg = 'bg-indigo-50 border-indigo-400 shadow-lg shadow-indigo-100'; activeTitle = 'text-indigo-900'; activeText = 'text-indigo-800'; }
                      if (stepNum === 4) { activeBg = 'bg-emerald-50 border-emerald-400 shadow-lg shadow-emerald-100'; activeTitle = 'text-emerald-900'; activeText = 'text-emerald-800'; }
                    }
                  }

                  return (
                    <div
                      key={stepNum}
                      onClick={() => setStep(stepNum)}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 transform ${isActive ? `-translate-y-2 scale-105 ring-2 ring-offset-2 ${stepNum === 1 ? 'ring-blue-200' : stepNum === 2 || stepNum === 3 ? 'ring-indigo-200' : stepNum === 4 ? 'ring-emerald-200' : 'ring-amber-200'}` : 'translate-y-0'} ${activeBg}`}
                    >
                      {isAlgoStories && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 text-[9px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full whitespace-nowrap">
                          What We Do
                        </span>
                      )}
                      <h3 className={`font-bold text-[13px] mb-2 leading-tight transition-colors duration-300 ${activeTitle}`}>
                        {content.title}
                      </h3>
                      <p className={`text-[11px] leading-relaxed transition-colors duration-300 ${activeText}`}>
                        {content.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Algorithms Used in Public Services
          </h2>
          <p className="text-gray-600">
            Browse the algorithms powering public services in your city.
          </p>
        </div>

        <div className="w-full flex flex-wrap justify-center items-start gap-8 md:gap-12 lg:gap-16 mb-12">
          {services.map((service) => {
            const Icon = service.icon;
            const isActive = activeService === service.id;
            return (
              <button
                key={service.id}
                onClick={() => setActiveService(service.id)}
                className="group flex flex-col items-center outline-none"
                aria-pressed={isActive}
              >
                <div
                  className={`
                    flex items-center justify-center
                    w-16 h-16 md:w-20 md:h-20 rounded-full 
                    border-[1.5px] border-yellow-500
                    transition-all duration-300 mb-4
                    ${isActive 
                      ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)] scale-110' 
                      : 'bg-white hover:shadow-[0_0_12px_rgba(234,179,8,0.2)] hover:scale-105'
                    }
                  `}
                >
                  <Icon 
                    strokeWidth={isActive ? 2 : 1.25} 
                    className={`
                      w-7 h-7 md:w-8 md:h-8 transition-all duration-300
                      ${isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'}
                    `}
                  />
                </div>
                <span 
                  className={`
                    text-xs md:text-sm font-medium tracking-wide uppercase text-center 
                    max-w-[120px] h-10 md:h-12 leading-snug transition-all duration-300
                    ${isActive ? 'text-gray-900 font-bold' : 'text-gray-500 group-hover:text-gray-700'}
                  `}
                >
                  {service.label.split(' ').map((word, i) => (
                    <React.Fragment key={i}>
                      {word}
                      {i !== service.label.split(' ').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </span>
                <div 
                  className={`
                    mt-2 w-1.5 h-1.5 rounded-full bg-yellow-500 transition-all duration-300
                    ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
                  `}
                />
              </button>
            );
          })}
        </div>
        
        {activeData && (
          <div 
            key={activeService}
            className="animate-[fadeIn_0.4s_ease-out]"
          >
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allAlgorithms
                .filter(a => a.use_case === activeData.useCase)
                .map(algo => (
                  <Link
                    key={algo.id}
                    to={`${createPageUrl('Algorithms')}?useCase=${encodeURIComponent(activeData.useCase)}`}
                  >
                    <AlgorithmCard algorithm={algo} onClick={() => {}} />
                  </Link>
                ))
              }
            </div>
          </div>
        )}
      </section>

      {/* Community Voices & Updates */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-yellow-600" />
              Community Voices & Updates
            </h2>
            <p className="text-gray-600 mt-1">Real stories and latest news</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-8 border-l-4 border-yellow-500">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Community Voices from Pittsburgh
              </h3>
              <div className="relative">
                <Quote className="w-10 h-10 text-yellow-400 mb-4" />
                <blockquote className="text-lg text-gray-700 italic mb-6">
                  "I didn't realize an algorithm helped determine my application priority 
                  until I noticed the decision didn't match my caseworker's expectations."
                </blockquote>
                <p className="text-gray-600 font-medium mb-6">
                  — Anonymous Housing Applicant
                </p>
                <Link to={createPageUrl('Stories')}>
                  <Button className="bg-gray-900 hover:bg-gray-800">
                    Read More Stories
                  </Button>
                </Link>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">
                What's Happening?
              </h3>
              <ul className="space-y-6">
                {events.map((event, index) => (
                  <li key={index} className="border-l-2 border-yellow-200 pl-4">
                    <div className="text-xs font-semibold text-yellow-100 uppercase tracking-wide mb-1">
                      [{event.tag}]
                    </div>
                    <div className="font-semibold text-white mb-1">
                      {event.title}
                    </div>
                    <p className="text-sm text-yellow-50">
                      {event.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
