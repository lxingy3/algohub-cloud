import {
  BadgeAlert,
  Briefcase,
  BusFront,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  House,
  Languages,
  School,
  ShieldCheck,
  Siren,
  TrafficCone,
  UsersRound,
  Zap,
} from 'lucide-react';

export const useCases = [
  { id: 'fraud', label: 'Fraud Detection', icon: BadgeAlert, useCase: 'Fraud Detection' },
  { id: 'traffic', label: 'Traffic Management', icon: TrafficCone, useCase: 'Traffic Management' },
  { id: 'student', label: 'Student Support', icon: GraduationCap, useCase: 'Student Support' },
  { id: 'job', label: 'Job Matching', icon: Briefcase, useCase: 'Job Matching' },
  { id: 'energy', label: 'Energy Forecasting', icon: Zap, useCase: 'Energy Forecasting' },
  { id: 'childwelfare', label: 'Child Welfare', icon: HeartHandshake, useCase: 'Child Welfare' },
  { id: 'housing', label: 'Housing Prioritization', icon: House, useCase: 'Housing Prioritization' },
  { id: 'benefits-admin', label: 'Benefits Administration', icon: HandCoins, useCase: 'Benefits Administration' },
  { id: 'community-services', label: 'Community Services', icon: UsersRound, useCase: 'Community Services' },
  { id: 'emergency-services', label: 'Emergency Services', icon: Siren, useCase: 'Emergency Services' },
  { id: 'housing-inspections', label: 'Housing Inspections', icon: ClipboardCheck, useCase: 'Housing Inspections' },
  { id: 'language-access', label: 'Language Access', icon: Languages, useCase: 'Language Access' },
  { id: 'student-award', label: 'Student Award', icon: School, useCase: 'Student Award' },
  { id: 'transit-safety', label: 'Transit Safety', icon: BusFront, useCase: 'Transit Safety' },
  { id: 'employment-general', label: 'Employment', icon: Briefcase, useCase: 'Employment' },
  { id: 'public-safety-general', label: 'Public Safety', icon: ShieldCheck, useCase: 'Public Safety' },
  { id: 'housing-general', label: 'Housing', icon: House, useCase: 'Housing' },
  { id: 'benefits-general', label: 'Benefits', icon: HandCoins, useCase: 'Benefits' },
  { id: 'education-general', label: 'Education', icon: GraduationCap, useCase: 'Education' },
  { id: 'other', label: 'Other', icon: CircleHelp, useCase: 'Other' },
];

const iconRules = [
  { terms: ['fraud'], icon: BadgeAlert, tone: 'border-red-200 bg-red-50 text-red-700' },
  { terms: ['traffic'], icon: TrafficCone, tone: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
  { terms: ['transit', 'bus'], icon: BusFront, tone: 'border-sky-200 bg-sky-50 text-sky-700' },
  { terms: ['student support'], icon: GraduationCap, tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { terms: ['student award', 'school lunch'], icon: School, tone: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  { terms: ['education', 'school', 'student'], icon: GraduationCap, tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { terms: ['job', 'employment', 'workforce'], icon: Briefcase, tone: 'border-violet-200 bg-violet-50 text-violet-700' },
  { terms: ['energy', 'utility'], icon: Zap, tone: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
  { terms: ['child welfare', 'child'], icon: HeartHandshake, tone: 'border-rose-200 bg-rose-50 text-rose-700' },
  { terms: ['housing inspection', 'inspection'], icon: ClipboardCheck, tone: 'border-orange-200 bg-orange-50 text-orange-700' },
  { terms: ['housing priority', 'housing prioritization', 'housing', 'homeless'], icon: House, tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { terms: ['benefits', 'rental aid', 'assistance'], icon: HandCoins, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { terms: ['language', 'interpreter'], icon: Languages, tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' },
  { terms: ['emergency', 'dispatch'], icon: Siren, tone: 'border-red-200 bg-red-50 text-red-700' },
  { terms: ['community services', 'community'], icon: UsersRound, tone: 'border-teal-200 bg-teal-50 text-teal-700' },
  { terms: ['public safety', 'safety'], icon: ShieldCheck, tone: 'border-slate-300 bg-slate-50 text-slate-700' },
];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export function getUseCaseIconMeta(useCase) {
  const normalized = normalize(useCase);
  const exact = useCases.find((item) => normalize(item.useCase) === normalized);
  if (exact) {
    const rule = iconRules.find((item) => item.terms.some((term) => normalized.includes(term)));
    return {
      icon: exact.icon,
      tone: rule?.tone || 'border-slate-200 bg-slate-50 text-slate-600',
      label: exact.label,
    };
  }

  const rule = iconRules.find((item) => item.terms.some((term) => normalized.includes(term)));
  if (rule) {
    return { icon: rule.icon, tone: rule.tone, label: useCase || 'Other' };
  }

  if (normalized === 'other' || normalized === 'n/a' || normalized === 'not sure') {
    return { icon: CircleHelp, tone: 'border-slate-200 bg-slate-50 text-slate-600', label: useCase || 'Other' };
  }

  return { icon: CircleHelp, tone: 'border-slate-200 bg-slate-50 text-slate-600', label: useCase || 'Other' };
}

export function getUseCaseIcon(useCase) {
  return getUseCaseIconMeta(useCase).icon;
}

export function getUseCaseIconTone(useCase) {
  return getUseCaseIconMeta(useCase).tone;
}
