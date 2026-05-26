import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, Brain, MessageSquare, Handshake, ArrowRight
} from "lucide-react";

export default function About() {
  const principles = [
    {
      icon: FileText,
      title: "Algorithm Profiles",
      description: "We create plain-language profiles that explain how automated systems work—no technical jargon allowed."
    },
    {
      icon: Brain,
      title: "Public Learning",
      description: "A resource designed to help residents understand decision-making tools and how they affect daily life."
    },
    {
      icon: MessageSquare,
      title: "Community Stories",
      description: "A dedicated space for residents, service providers, and agencies to share their real-world experiences."
    },
    {
      icon: Handshake,
      title: "Neutral Resource",
      description: "We are not a watchdog or an audit tool. We exist to support clarity, communication, and trust."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a] border-b border-white/15">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 260"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full opacity-[0.24]"
        >
          <defs>
            <linearGradient id="aboutHeaderMesh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#aboutHeaderMesh)" strokeWidth="1.1">
            <path d="M0 200 L120 160 L240 190 L350 148 L470 176 L590 138 L720 166 L860 126 L980 160 L1200 112" />
            <path d="M0 240 L130 206 L250 234 L375 196 L505 224 L635 188 L770 218 L900 182 L1040 208 L1200 168" />
            <path d="M120 160 L130 206 M240 190 L250 234 M350 148 L375 196 M470 176 L505 224 M590 138 L635 188 M720 166 L770 218 M860 126 L900 182 M980 160 L1040 208" />
          </g>
        </svg>
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Understanding the tools behind<br />Pittsburgh's public services.
          </h1>
          <p className="text-xl text-yellow-100/85 max-w-2xl mx-auto">
            AlgoStories creates plain-language profiles of the algorithms used by our 
            city to ensure every resident understands how decisions are made.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            How AlgoStories Works
          </h2>
          <p className="text-gray-600">
            Building a shared understanding of Pittsburgh's public services.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {principles.map((principle, index) => (
            <Card key={index} className="text-center border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-yellow-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <principle.icon className="w-7 h-7 text-amber-700" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{principle.title}</h3>
                <p className="text-sm text-gray-600">{principle.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a] text-white py-16">
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Algorithms are just code until they affect you.
          </h2>
          <p className="text-yellow-100/75 mb-8 max-w-2xl mx-auto">
            We can't see the full picture without your help. If you have an 
            experience with a public service decision that didn't make sense, 
            let us know.
          </p>
          <Link to={createPageUrl('Stories')}>
            <Button size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_24px_rgba(250,204,21,0.22)]">
              Share Your Story Safely
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}