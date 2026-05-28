'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Briefcase, Bus, GraduationCap, Heart, Home as HomeIcon, MapPin, Shield, Zap } from 'lucide-react';
import { formatStatus } from './Formatters';

const useCases = [
  { id: 'fraud', label: 'Fraud Detection', icon: Shield, useCase: 'Fraud Detection' },
  { id: 'traffic', label: 'Traffic Management', icon: Bus, useCase: 'Traffic Management' },
  { id: 'student', label: 'Student Support', icon: GraduationCap, useCase: 'Student Support' },
  { id: 'job', label: 'Job Matching', icon: Briefcase, useCase: 'Job Matching' },
  { id: 'energy', label: 'Energy Forecasting', icon: Zap, useCase: 'Energy Forecasting' },
  { id: 'childwelfare', label: 'Child Welfare', icon: Heart, useCase: 'Child Welfare' },
  { id: 'housing', label: 'Housing Prioritization', icon: HomeIcon, useCase: 'Housing Prioritization' },
];

export function HomeUseCaseExplorer({ algorithms }) {
  const [activeService, setActiveService] = useState('student');

  const services = useMemo(() => useCases.map((item) => {
    const related = algorithms.filter((algorithm) => algorithm.useCase === item.useCase);
    return {
      ...item,
      algorithmCount: related.length,
      storyCount: related.reduce((sum, algorithm) => sum + algorithm.storyCount, 0),
    };
  }), [algorithms]);

  const activeData = services.find((item) => item.id === activeService);
  const activeAlgorithms = algorithms.filter((algorithm) => algorithm.useCase === activeData?.useCase);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
          Algorithms Used in Public Services
        </h2>
        <p className="text-gray-600">
          Browse the algorithms powering public services in your city.
        </p>
      </div>

      <div className="mb-12 flex w-full flex-wrap items-start justify-center gap-8 md:gap-12 lg:gap-16">
        {services.map((service) => {
          const Icon = service.icon;
          const isActive = activeService === service.id;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => setActiveService(service.id)}
              className="group flex flex-col items-center outline-none"
              aria-pressed={isActive}
            >
              <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-yellow-500 transition-all duration-300 md:h-20 md:w-20 ${isActive ? 'scale-110 bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-white hover:scale-105 hover:shadow-[0_0_12px_rgba(234,179,8,0.2)]'}`}>
                <Icon
                  strokeWidth={isActive ? 2 : 1.25}
                  className={`h-7 w-7 transition-all duration-300 md:h-8 md:w-8 ${isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'}`}
                />
              </div>
              <span className={`h-10 max-w-[120px] text-center text-xs font-medium uppercase leading-snug tracking-wide transition-all duration-300 md:h-12 md:text-sm ${isActive ? 'font-bold text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>
                {service.label.split(' ').map((word, index) => (
                  <span key={word}>
                    {word}
                    {index !== service.label.split(' ').length - 1 ? <br /> : null}
                  </span>
                ))}
              </span>
              <div className={`mt-2 h-1.5 w-1.5 rounded-full bg-yellow-500 transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activeAlgorithms.map((algorithm) => (
          <Link
            key={algorithm.id}
            href={`/algorithms/${algorithm.slug}`}
            className="group flex h-full flex-col rounded-lg border border-gray-200 border-l-4 border-l-yellow-500 bg-white p-6 shadow-sm transition-all hover:shadow-lg"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold leading-tight text-gray-900 transition-colors group-hover:text-yellow-600">
                {algorithm.name}
              </h3>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                {formatStatus(algorithm.status)}
              </span>
            </div>
            <span className="mb-4 w-fit rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700">
              {algorithm.useCase}
            </span>
            <p className="line-clamp-3 flex-1 text-sm leading-6 text-gray-600">
              {algorithm.description}
            </p>
            <div className="mt-5 flex items-center justify-between text-sm text-gray-600">
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{algorithm.location}</span>
              </span>
              <span className="shrink-0">{algorithm.storyCount} stories</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
