import { Briefcase, Bus, FileText, GraduationCap, Heart, Home as HomeIcon, Shield, Zap } from 'lucide-react';

export const useCases = [
  { id: 'fraud', label: 'Fraud Detection', icon: Shield, useCase: 'Fraud Detection' },
  { id: 'traffic', label: 'Traffic Management', icon: Bus, useCase: 'Traffic Management' },
  { id: 'student', label: 'Student Support', icon: GraduationCap, useCase: 'Student Support' },
  { id: 'job', label: 'Job Matching', icon: Briefcase, useCase: 'Job Matching' },
  { id: 'energy', label: 'Energy Forecasting', icon: Zap, useCase: 'Energy Forecasting' },
  { id: 'childwelfare', label: 'Child Welfare', icon: Heart, useCase: 'Child Welfare' },
  { id: 'housing', label: 'Housing Prioritization', icon: HomeIcon, useCase: 'Housing Prioritization' },
  { id: 'housing-general', label: 'Housing', icon: HomeIcon, useCase: 'Housing' },
  { id: 'child-welfare-general', label: 'Child Welfare', icon: Heart, useCase: 'Child Welfare' },
  { id: 'education-general', label: 'Education', icon: GraduationCap, useCase: 'Education' },
  { id: 'employment-general', label: 'Employment', icon: Briefcase, useCase: 'Employment' },
  { id: 'public-safety-general', label: 'Public Safety', icon: Shield, useCase: 'Public Safety' },
  { id: 'benefits-general', label: 'Benefits', icon: Shield, useCase: 'Benefits' },
];

export function getUseCaseIcon(useCase) {
  const normalized = String(useCase || '').trim().toLowerCase();
  return useCases.find((item) => item.useCase.toLowerCase() === normalized)?.icon || FileText;
}

export function getUseCaseIconTone(useCase) {
  const normalized = String(useCase || '').trim().toLowerCase();
  if (normalized.includes('housing')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized.includes('student') || normalized.includes('education')) return 'border-blue-200 bg-blue-50 text-blue-700';
  if (normalized.includes('traffic')) return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (normalized.includes('job') || normalized.includes('employment')) return 'border-violet-200 bg-violet-50 text-violet-700';
  if (normalized.includes('energy')) return 'border-yellow-200 bg-yellow-50 text-yellow-700';
  if (normalized.includes('child')) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (normalized.includes('fraud') || normalized.includes('safety') || normalized.includes('benefits')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}
