'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlgorithmsRegistry } from './AlgorithmsRegistry';
import { useCases } from './useCaseIcons';

export function HomeUseCaseExplorer({ algorithms }) {
  const { i18n } = useTranslation();
  const initialService = useCases.find((item) => algorithms.some((algorithm) => algorithm.useCase === item.useCase))?.id || 'student';
  const [activeService, setActiveService] = useState(initialService);
  const staticText = i18n.getResourceBundle(i18n.resolvedLanguage || i18n.language || 'en', 'translation')?.staticText || {};

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
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
          Algorithms Used in Public Services
        </h2>
        <p className="text-gray-600">
          Browse the algorithms powering public services in your city.
        </p>
      </div>

      <div className="mb-12 grid w-full grid-cols-2 gap-x-4 gap-y-8 sm:flex sm:flex-wrap sm:items-start sm:justify-center sm:gap-8 md:gap-12 lg:gap-16">
        {services.map((service) => {
          const Icon = service.icon;
          const isActive = activeService === service.id;
          const translatedLabel = staticText[service.label] || service.label;
          const labelParts = translatedLabel.includes(' ') ? translatedLabel.split(' ') : [translatedLabel];
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => setActiveService(service.id)}
              className="group flex min-h-[132px] w-full flex-col items-center justify-start outline-none sm:w-auto"
              aria-pressed={isActive}
            >
              <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-yellow-500 transition-all duration-300 md:h-20 md:w-20 ${isActive ? 'scale-110 bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-white hover:scale-105 hover:shadow-[0_0_12px_rgba(234,179,8,0.2)]'}`}>
                <Icon
                  strokeWidth={isActive ? 2 : 1.25}
                  className={`h-7 w-7 transition-all duration-300 md:h-8 md:w-8 ${isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'}`}
                />
              </div>
              <span className={`min-h-10 max-w-[120px] text-center text-xs font-medium uppercase leading-snug tracking-wide transition-all duration-300 md:h-12 md:text-sm ${isActive ? 'font-bold text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>
                {labelParts.map((word, index) => (
                  <span key={`${service.id}-${word}-${index}`}>
                    {word}
                    {index !== labelParts.length - 1 ? <br /> : null}
                  </span>
                ))}
              </span>
              <div className={`mt-2 h-1.5 w-1.5 rounded-full bg-yellow-500 transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
            </button>
          );
        })}
      </div>

      <AlgorithmsRegistry algorithms={activeAlgorithms} />
    </section>
  );
}
