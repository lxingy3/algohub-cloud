import React, { useState, useEffect } from 'react';
import { BarChart3 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const PIE_COLORS = ['#facc15', '#eab308', '#f59e0b', '#d4a017', '#fde68a', '#fef3c7'];

const METRICS = [
  { key: 'storiesShared', label: 'Stories Shared', tooltip: 'Total number of community stories submitted' },
  { key: 'algorithmsAffected', label: 'Algorithms Affected', tooltip: 'Stories by use case / algorithm type' },
  { key: 'statesRepresented', label: 'States Represented', tooltip: 'Geographic diversity: unique locations across the country' },
  { key: 'voicesUnited', label: 'Voices United', tooltip: 'Total Eye-Opening and Support reactions showing solidarity' },
];

function AnimatedNumber({ value, duration = 1200 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (end - start) * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

function MetricCard({ label, tooltip, children, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.12)] min-h-[210px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.16)] ${className}`}
    >
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm font-medium text-gray-600 mb-3 block cursor-help">
              {label}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px]">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {children}
    </div>
  );
}

export default function ImpactSnapshot({ metrics }) {
  const { storiesShared, algorithmsAffected, storiesByUseCase = {}, statesRepresented, voicesUnited } = metrics;
  const values = { storiesShared, algorithmsAffected, statesRepresented, voicesUnited };

  const pieData = Object.entries(storiesByUseCase).map(([name, value]) => ({ name, value }));

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-slate-100 border-y border-slate-200/80"
      aria-labelledby="impact-heading"
    >
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(51,65,85,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(51,65,85,0.14)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-white/35 blur-3xl" />
      <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-amber-200/25 blur-3xl" />
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-14">
        <div className="inline-flex items-center gap-2 mb-4 rounded-full border border-amber-200 bg-white/80 px-4 py-2 shadow-sm">
          <BarChart3 className="w-4 h-4 text-amber-700" aria-hidden />
          <span className="text-amber-800 text-sm font-medium">Community Metrics</span>
        </div>
        <h2
          id="impact-heading"
          className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 mb-8"
        >
          <BarChart3 className="w-6 h-6 text-amber-700" aria-hidden />
          Community Impact
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Stories Shared */}
          <MetricCard label={METRICS[0].label} tooltip={METRICS[0].tooltip}>
            <span className="text-4xl md:text-5xl font-bold text-gray-900 tabular-nums" aria-label={`${METRICS[0].label}: ${values.storiesShared}`}>
              <AnimatedNumber value={values.storiesShared} />
            </span>
          </MetricCard>

          {/* Algorithms Affected - Pie Chart */}
          <MetricCard label={METRICS[1].label} tooltip={METRICS[1].tooltip}>
            {pieData.length > 0 ? (
              <div className="w-full flex flex-col items-center">
                <div className="w-full h-[120px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={48}
                        innerRadius={24}
                        paddingAngle={2}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={pieData[index].name} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [`${value} ${value === 1 ? 'story' : 'stories'}`, name]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(12,12,12,0.92)', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1 w-full max-w-[180px]" role="list">
                  {pieData.map((item, index) => (
                    <li key={item.name} className="flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          aria-hidden
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="font-medium text-gray-900 ml-2 shrink-0">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <span className="text-4xl md:text-5xl font-bold text-gray-900 tabular-nums">
                <AnimatedNumber value={values.algorithmsAffected} />
              </span>
            )}
          </MetricCard>

          {/* States Represented */}
          <MetricCard label={METRICS[2].label} tooltip={METRICS[2].tooltip}>
            <span className="text-4xl md:text-5xl font-bold text-gray-900 tabular-nums" aria-label={`${METRICS[2].label}: ${values.statesRepresented}`}>
              <AnimatedNumber value={values.statesRepresented} />
            </span>
          </MetricCard>

          {/* Voices United */}
          <MetricCard label={METRICS[3].label} tooltip={METRICS[3].tooltip}>
            <span className="text-4xl md:text-5xl font-bold text-gray-900 tabular-nums" aria-label={`${METRICS[3].label}: ${values.voicesUnited}`}>
              <AnimatedNumber value={values.voicesUnited} />
            </span>
          </MetricCard>
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center sm:text-left">
          Last updated: {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </section>
  );
}
