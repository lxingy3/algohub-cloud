'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Database, ExternalLink, FileText, Filter, Landmark, Maximize2, MessageSquare, Search, Users, X } from 'lucide-react';
import { AlgorithmModal } from '../components/AlgorithmsRegistry';
import { InfoTooltip } from '../components/InfoTooltip';
import { EventModal } from '../events/EventsClient';

const lenses = [
  { id: 'community', label: 'Community', short: 'Community Members', icon: Users },
  { id: 'intermediary', label: 'Library', short: 'Libraries / Intermediaries', icon: BookOpen },
  { id: 'government', label: 'Government', short: 'Local Government', icon: Landmark },
];

const scopes = [
  { id: 'overview', label: 'Overview' },
  { id: 'algorithm', label: 'Filter by Algorithm' },
];

const fallbackAlgorithms = [
  { slug: 'allegheny-family-screening-tool', name: 'Allegheny Family Screening Tool', domain: 'Child Welfare' },
  { slug: 'housing-allocation-algorithm', name: 'Housing Allocation Algorithm', domain: 'Housing Services' },
  { slug: 'job-matching-algorithm', name: 'Job Matching Algorithm', domain: 'Jobs & Employment' },
  { slug: 'student-risk-assessment', name: 'Student Risk Assessment', domain: 'Student Services' },
];

const languageModes = [
  { id: 'en', label: 'English' },
  { id: 'original', label: 'Original' },
];

const briefingViews = {
  overview: {
    community: {
      code: 'CC',
      route: '/explore?lens=community',
      title: 'Community - all systems at once',
      subtitle: 'All algorithms and stories, shown for community readers.',
      blocks: [
        b('CC1', 'Landscape overview', 'treemap / cards by domain', 'REVEALS INVISIBLE PORTFOLIO', 'algorithms.use_case, agency_name, status, impact_level; counts', 'GET /api/explore/landscape', 'none (aggregation)', 'treemap'),
        b('CC2', 'Find systems relevant to you', 'domain filter + cards', 'RECOGNITION', 'algorithms.use_case, location; shared_taxonomy', 'GET /api/explore/landscape?domain=', 'optional sentence-transformers similar systems', 'cards'),
        b('CC3', 'Cross-cutting patterns', 'theme bars / chips', 'SUGGESTED', 'testimonies.ai_themes (corpus)', 'GET /api/explore/cross-cutting-themes', 'multi-label BART-MNLI aggregation; optional BERTopic', 'bars'),
        b('CC4', 'Where harms concentrate', 'domain x theme heatmap', 'INTERPRETATION', 'testimonies.affected_domain, ai_themes; algorithms.use_case', 'GET /api/explore/theme-matrix', 'aggregation of stored themes', 'heatmap'),
        b('CC5', 'Over time', 'monthly trend', 'INTERPRETATION', 'testimonies.submitted_at, ai_themes, ai_impact_classification', 'GET /api/explore/trend?scope=corpus', 'time aggregation', 'trend'),
        b('CC6', "In people's words across systems", 'excerpts', 'ARTICULATION', 'testimonies.narrative_text, ai_summary, cluster_id, is_outlier', 'GET /api/testimonies?scope=corpus', 'spaCy NER; sentence-transformers + HDBSCAN; KeyBERT', 'excerpt'),
        b('CC7', "How this was made / what's missing", 'coverage panel', 'PARADATA', 'testimonies.submission_method, original_language, moderation_status', 'GET /api/explore/coverage?scope=corpus', 'none (metadata)', 'coverage'),
        b('CC8', 'Where to learn more / who can help', 'links', 'READ-ONLY INFO', 'organizations(role=library), community_events', 'GET /api/organizations, GET /api/events', 'none', 'links'),
      ],
    },
    intermediary: {
      code: 'IC',
      route: '/explore?lens=intermediary',
      title: 'Libraries / Intermediaries - all systems at once',
      subtitle: 'All algorithms and stories, shown for library and intermediary review.',
      blocks: [
        b('IC1', 'Portfolio overview', 'sortable table / treemap', 'REFERENCE', 'algorithms.*; counts; ai_confidence_score', 'GET /api/explore/landscape', 'derived stats', 'table'),
        b('IC2', 'Cross-cutting themes + co-occurrence', 'bars + network', 'SUGGESTED', 'testimonies.ai_themes', 'GET /api/explore/cross-cutting-themes', 'multi-label BART-MNLI aggregation; optional BERTopic', 'network'),
        b('IC3', 'Silence & coverage map (corpus)', 'silence matrix + coverage', 'PARADATA + ABSENCE', 'algorithms.impact_level, use_case; testimonies.affected_domain, original_language', 'GET /api/explore/silence-map + /coverage', 'rule-based + sentence-transformers four-factor silence detector', 'heatmap'),
        b('IC4', 'Corpus story map / emergent topics', 'UMAP scatter + topic labels', 'INTERPRETATION', 'testimonies.topic_id, umap_x, umap_y, cluster_id; corpus_topics', 'GET /api/explore/patterns', 'BERTopic + UMAP + HDBSCAN over corpus embeddings; KeyBERT labels', 'scatter'),
        b('IC5', 'Compare across domains / agencies', 'small multiples', 'INTERPRETATION', 'algorithms.use_case, agency_name; testimonies.ai_themes, ai_impact_classification', 'GET /api/explore/compare?dimension=', 'aggregation', 'multiples'),
        b('IC6', 'Evidence strength + representation', 'strength bars + distribution', 'HUMILITY', 'testimony counts, ai_confidence_score, ai_themes distribution, is_outlier', 'GET /api/explore/evidence-strength?scope=corpus', 'derived stats; sentence-transformers / HDBSCAN outliers', 'bars'),
        b('IC7', 'Systemic claim-vs-experience', 'table / scatter', 'NOT ADJUDICATED', 'algorithm_claims.*; briefings.claim_vs_experience', 'GET /api/explore/claim-vs-experience?scope=corpus', 'Claude API synthesis', 'table'),
        b('IC8', "In people's words across systems", 'excerpts', 'ARTICULATION', 'testimonies.narrative_text, ai_summary, cluster_id, is_outlier', 'GET /api/testimonies?scope=corpus', 'spaCy NER; sentence-transformers + HDBSCAN; KeyBERT', 'excerpt'),
        b('IC9', 'Provenance / custody (corpus) + notes', 'panel + private notes', 'PARADATA; NOTES PRIVATE', 'testimonies.* (paradata); briefings.review_status, reviewed_by', 'GET /api/explore/coverage?scope=corpus', 'none', 'coverage'),
      ],
    },
    government: {
      code: 'GC',
      route: '/explore?lens=government',
      title: 'Local Government - portfolio governance',
      subtitle: 'All algorithms and stories, shown as aggregate portfolio information.',
      blocks: [
        b('GC1', 'Portfolio dashboard', 'treemap + bars + counts', 'PORTFOLIO / GLOBAL', 'algorithms.status, use_case, agency_name, impact_level; testimony aggregates', 'GET /api/explore/landscape', 'aggregation', 'treemap'),
        b('GC2', 'Cross-cutting theme profile', 'bars + matrix', 'SUGGESTED', 'testimonies.ai_themes', 'GET /api/explore/cross-cutting-themes', 'multi-label BART-MNLI aggregation; BERTopic', 'bars'),
        b('GC3', 'Intent vs. reality across systems', 'ranked divergence + table', 'SDM/PDM GAP', 'algorithm_claims.*; briefings.claim_vs_experience; testimonies.ai_extracted_experiences', 'GET /api/explore/claim-vs-experience?scope=corpus', 'Claude API synthesis; sentence-transformers candidate retrieval', 'table'),
        b('GC4', 'Silence map = accountability gaps', 'ranked silence matrix', 'ABSENCE != SAFETY', 'algorithms.impact_level, use_case; testimonies.affected_domain; briefings.silence_gaps', 'GET /api/explore/silence-map', 'rule-based + sentence-transformers four-factor silence detector', 'heatmap'),
        b('GC5', 'Compare agencies / domains', 'small multiples / ranked', 'INTERPRETATION', 'algorithms.agency_name, agency_type, use_case; testimonies.ai_themes', 'GET /api/explore/compare?dimension=', 'aggregation', 'multiples'),
        b('GC6', 'Systemic improvement & policy directions', 'theme -> policy table', 'REFERENCE', 'testimonies.ai_themes aggregation + theme_improvement_map.policy_direction', 'GET /api/explore/cross-cutting-themes + map', 'none (reference map)', 'table'),
        b('GC7', 'Procurement policy (all Proposed)', 'proposed list + evidence + terms', 'READ BEFORE PURCHASE', 'algorithms.status, use_case; cross_jurisdiction_insights; shared_taxonomy', 'GET /api/algorithms?status=Proposed + /cross-jurisdiction', 'sentence-transformers similarity for comparable systems; aggregation', 'cards'),
        b('GC8', 'Peer-jurisdiction portfolio benchmark', 'benchmark bars', 'AGGREGATE ONLY', 'cross_jurisdiction_insights (approved)', 'GET /api/explore/cross-jurisdiction?scope=portfolio', 'none (pre-aggregated)', 'bars'),
        b('GC9', 'Provenance & paradata (corpus)', 'aggregate-only panel', 'PARADATA', 'testimonies.* (paradata); briefings.review_status, reviewed_by, generated_by', 'GET /api/explore/coverage?scope=corpus', 'none', 'coverage'),
      ],
    },
  },
  algorithm: {
    community: {
      code: 'C',
      route: '/briefings/[slug]?lens=community',
      title: 'Community Members',
      subtitle: 'One algorithm, shown for community readers.',
      blocks: [
        b('C1', 'System explainer - context first', '4-category, 3 levels', 'NORMATIVE', 'algorithms.* + algorithm_claims.*', 'GET /api/algorithms/:slug', 'none; optional Claude reading-level simplification', 'cards'),
        b('C2', 'What it decides about you', 'data / system / usage', 'NOVICE-NEED', 'algorithms.data_used, decision_type, use_case', 'GET /api/algorithms/:slug', 'optional KeyBERT tag suggestions', 'table'),
        b('C3', 'Impact overview', 'segmented bar', 'INTERPRETATION', 'testimonies.ai_impact_classification, self_reported_impact, ai_confidence_score', 'GET /api/explore/impact', 'zero-shot BART-large-MNLI impact classifier', 'bars'),
        b('C4', 'Theme profile + co-occurrence', 'chips + matrix', 'SUGGESTED', 'testimonies.ai_themes (JSONB)', 'GET /api/explore/themes', 'multi-label BART-MNLI; optional BERTopic', 'heatmap'),
        b('C5', "In people's words", 'excerpts', 'ARTICULATION', 'testimonies.narrative_text, ai_summary, cluster_id, is_outlier', 'GET /api/testimonies?fields=excerpt', 'spaCy NER; sentence-transformers + HDBSCAN; KeyBERT', 'excerpt'),
        b('C6', 'Recognition - others like me?', 'prevalence + similar stories', 'RECOGNITION', 'testimonies.ai_themes + embeddings', 'GET /api/explore/recognition', 'sentence-transformers nearest-neighbour', 'network'),
        b('C7', 'Promised vs. reported', 'side-by-side table', 'NOT ADJUDICATED', 'algorithm_claims.*; briefings.claim_vs_experience', 'GET /api/explore/claim-vs-experience', 'Claude API synthesis; sentence-transformers candidate retrieval', 'table'),
        b('C8', 'How this was made', 'provenance panel', 'PARADATA', 'testimonies.submission_method, original_language, moderation_status, submitted_at', 'GET /api/explore/coverage + /api/briefings/:slug', 'none (metadata)', 'coverage'),
        b('C9', 'Where to learn more / who can help', 'links', 'READ-ONLY INFO', 'organizations(role=library), community_events', 'GET /api/organizations, GET /api/events', 'none', 'links'),
      ],
    },
    intermediary: {
      code: 'L',
      route: '/briefings/[slug]?lens=intermediary',
      title: 'Libraries / Intermediaries',
      subtitle: 'One algorithm, shown for library and intermediary review.',
      blocks: [
        b('L1', 'System explainer (reference)', '4-category', 'REFERENCE', 'algorithms.* + algorithm_claims.*', 'GET /api/algorithms/:slug', 'none', 'cards'),
        b('L2', 'Impact overview', 'segmented bar', 'INTERPRETATION', 'testimonies.ai_impact_classification, self_reported_impact, ai_confidence_score', 'GET /api/explore/impact', 'zero-shot BART-MNLI impact classifier', 'bars'),
        b('L3', 'Theme profile + co-occurrence', 'chips + matrix', 'SUGGESTED', 'testimonies.ai_themes', 'GET /api/explore/themes', 'multi-label BART-MNLI; optional BERTopic', 'heatmap'),
        b('L4', "In people's words", 'representative + minority excerpts', 'ARTICULATION', 'testimonies.narrative_text, ai_summary, cluster_id, is_outlier', 'GET /api/testimonies?fields=excerpt', 'spaCy NER; sentence-transformers + HDBSCAN; KeyBERT', 'excerpt'),
        b('L5', 'Coverage & silence (prominent)', "ranked + who's missing", 'PARADATA + ABSENCE', 'algorithms.impact_level, use_case; testimonies.affected_domain, original_language, submission_method', 'GET /api/explore/silence + /coverage', 'rule-based + sentence-transformers four-factor silence detector', 'heatmap'),
        b('L6', 'Evidence strength + representation', 'thin to robust; minority / positive / dissent', 'HUMILITY', 'testimony counts, ai_confidence_score, ai_themes distribution, is_outlier', 'GET /api/explore/evidence-strength', 'derived stats; sentence-transformers / HDBSCAN outliers', 'bars'),
        b('L7', 'Claim vs. experience', 'table', 'NOT ADJUDICATED', 'algorithm_claims.*; briefings.claim_vs_experience', 'GET /api/explore/claim-vs-experience', 'Claude API synthesis', 'table'),
        b('L8', 'Provenance + custody + notes', 'panel + notes', 'PARADATA; NOTES PRIVATE', 'testimonies.* (paradata); briefings.review_status, reviewed_by', 'GET /api/explore/coverage + /api/briefings/:slug', 'none', 'coverage'),
      ],
    },
    government: {
      code: 'G',
      route: '/briefings/[slug]?lens=government',
      title: 'Local Government',
      subtitle: 'One algorithm, shown for government review.',
      blocks: [
        b('G1', 'Justifiability / global explanation', 'rationale + claims', 'GLOBAL EXPLANATION', 'algorithms.* (purpose, decision_type, data_used, agency_*, status); algorithm_claims.*', 'GET /api/algorithms/:slug', 'optional Claude summary', 'cards'),
        b('G2', 'Impact dashboard', 'split + trend', 'INTERPRETATION', 'testimonies.ai_impact_classification, submitted_at; algorithms.current_version, year_deployed', 'GET /api/explore/impact + /trend', 'zero-shot BART-MNLI impact classifier; time aggregation', 'trend'),
        b('G3', 'Theme profile + co-occurrence', 'chips + matrix', 'SUGGESTED', 'testimonies.ai_themes', 'GET /api/explore/themes', 'multi-label BART-MNLI; optional BERTopic', 'heatmap'),
        b('G4', 'Intent vs. reality (SDM vs PDM)', 'table + flag', 'SDM/PDM GAP', 'algorithm_claims.*; briefings.claim_vs_experience; testimonies.ai_extracted_experiences', 'GET /api/explore/claim-vs-experience', 'Claude API synthesis; sentence-transformers candidate retrieval', 'table'),
        b('G5', 'Coverage & silence = accountability gap', 'ranked flags', 'ABSENCE != SAFETY', 'algorithms.impact_level, use_case; testimonies.affected_domain; briefings.silence_gaps', 'GET /api/explore/silence', 'rule-based + sentence-transformers four-factor silence detector', 'heatmap'),
        b('G6', 'Improvement directions', 'theme -> direction table', 'REFERENCE', 'testimonies.ai_themes aggregation + theme_improvement_map', 'GET /api/explore/themes + static map', 'none (reference map)', 'table'),
        b('G7', 'Procurement / future systems', 'filter Proposed; comparables', 'READ BEFORE PURCHASE', 'algorithms.status, use_case; cross_jurisdiction_insights; shared_taxonomy', 'GET /api/algorithms?status=Proposed + /cross-jurisdiction', 'sentence-transformers similarity for comparable systems; aggregation', 'cards'),
        b('G8', 'Peer-jurisdiction benchmark', 'aggregate compare', 'AGGREGATE ONLY', 'cross_jurisdiction_insights (approved)', 'GET /api/explore/cross-jurisdiction', 'none (pre-aggregated)', 'bars'),
        b('G9', 'Provenance & paradata', 'aggregate-only panel', 'PARADATA', 'testimonies.* (paradata); briefings.review_status, reviewed_by, generated_by', 'GET /api/explore/coverage + /api/briefings/:slug', 'none', 'coverage'),
      ],
    },
  },
};

function b(code, title, visual, framing, db, api, ml, visualType) {
  return { code, title, visual, framing, db, api, ml, visualType };
}

export function BriefingsClient() {
  const [lens, setLens] = useState('community');
  const [scope, setScope] = useState('overview');
  const [domain, setDomain] = useState('All domains');
  const [algorithm, setAlgorithm] = useState(fallbackAlgorithms[0].slug);
  const [algorithms, setAlgorithms] = useState(fallbackAlgorithms);
  const [languageMode, setLanguageMode] = useState('en');
  const [paramsReady, setParamsReady] = useState(false);
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const [activeEvidenceBlock, setActiveEvidenceBlock] = useState(null);
  const view = briefingViews[scope][lens];
  const domains = useMemo(() => ['All domains', ...new Set(algorithms.map((item) => item.domain))], [algorithms]);
  const visibleAlgorithms = domain === 'All domains' ? algorithms : algorithms.filter((item) => item.domain === domain);
  const selectedVisibleAlgorithm = visibleAlgorithms.some((item) => item.slug === algorithm)
    ? algorithm
    : visibleAlgorithms[0]?.slug || algorithms[0].slug;
  const selectedAlgorithm = algorithms.find((item) => item.slug === selectedVisibleAlgorithm) || algorithms[0];
  const privateNotesKey = `briefings-private-note:${scope}:${lens}:${scope === 'algorithm' ? selectedVisibleAlgorithm : 'corpus'}`;
  const [privateNote, setPrivateNote] = useState('');
  const liveQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('lens', lens);
    params.set('scope', scope === 'algorithm' ? 'algorithm' : 'corpus');
    if (scope === 'algorithm') params.set('algorithm', selectedVisibleAlgorithm);
    if (domain !== 'All domains') params.set('domain', domain);
    if (languageMode === 'en') params.set('language', 'en');
    return `?${params.toString()}`;
  }, [domain, languageMode, lens, scope, selectedVisibleAlgorithm]);
  const excerptQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('fields', 'excerpt');
    params.set('limit', '200');
    params.set('lens', lens);
    params.set('scope', scope === 'algorithm' ? 'algorithm' : 'corpus');
    if (scope === 'algorithm') params.set('algorithm', selectedVisibleAlgorithm);
    if (domain !== 'All domains') params.set('domain', domain);
    if (languageMode === 'en') params.set('language', 'en');
    return `?${params.toString()}`;
  }, [domain, languageMode, lens, scope, selectedVisibleAlgorithm]);
  const briefingQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('type', scope === 'algorithm' ? 'ALGORITHM_SPECIFIC' : 'CROSS_CUTTING');
    if (scope === 'algorithm') params.set('algorithm', selectedVisibleAlgorithm);
    return `?${params.toString()}`;
  }, [scope, selectedVisibleAlgorithm]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextLens = params.get('lens');
    const nextScope = params.get('scope');
    const nextDomain = params.get('domain');
    const nextAlgorithm = params.get('algorithm');
    const nextLanguage = params.get('language');

    if (lenses.some((item) => item.id === nextLens)) setLens(nextLens);
    if (scopes.some((item) => item.id === nextScope)) setScope(nextScope);
    if (domains.includes(nextDomain)) setDomain(nextDomain);
    if (algorithms.some((item) => item.slug === nextAlgorithm)) setAlgorithm(nextAlgorithm);
    if (languageModes.some((item) => item.id === nextLanguage)) setLanguageMode(nextLanguage);
    setParamsReady(true);
  }, [domains]);

  useEffect(() => {
    if (!paramsReady || activeEvidenceBlock) return;
    const evidenceCode = new URLSearchParams(window.location.search).get('evidence');
    if (!evidenceCode) return;
    const nextBlock = view.blocks.find((block) => block.code === evidenceCode);
    if (nextBlock) setActiveEvidenceBlock(nextBlock);
  }, [activeEvidenceBlock, paramsReady, view]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/algorithms?limit=50')
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled || !Array.isArray(payload.items) || !payload.items.length) return;
        const nextAlgorithms = payload.items.map((item) => ({
          slug: item.slug,
          name: item.name,
          domain: item.useCase || 'Uncategorized',
        })).filter((item) => item.slug && item.name);
        if (!nextAlgorithms.length) return;
        setAlgorithms(nextAlgorithms);
        setAlgorithm((current) => nextAlgorithms.some((item) => item.slug === current) ? current : nextAlgorithms[0].slug);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!paramsReady) return;
    const params = new URLSearchParams();
    params.set('lens', lens);
    params.set('scope', scope);
    if (domain !== 'All domains') params.set('domain', domain);
    if (scope === 'algorithm') {
      params.set('algorithm', selectedVisibleAlgorithm);
    }
    params.set('language', languageMode);
    if (activeEvidenceBlock) params.set('evidence', activeEvidenceBlock.code);
    window.history.replaceState(null, '', `/briefings?${params.toString()}`);
  }, [activeEvidenceBlock, domain, languageMode, lens, paramsReady, scope, selectedVisibleAlgorithm]);

  useEffect(() => {
    if (lens !== 'intermediary') return;
    setPrivateNote(window.localStorage.getItem(privateNotesKey) || '');
  }, [lens, privateNotesKey]);

  const updatePrivateNote = (value) => {
    setPrivateNote(value);
    window.localStorage.setItem(privateNotesKey, value);
  };

  const openEvidence = (block) => {
    setActiveEvidenceBlock(block);
    const params = new URLSearchParams(window.location.search);
    params.set('evidence', block.code);
    window.history.pushState(null, '', `/briefings?${params.toString()}`);
  };

  const closeEvidence = () => {
    setActiveEvidenceBlock(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('evidence');
    window.history.replaceState(null, '', `/briefings?${params.toString()}`);
  };

  useEffect(() => {
    let cancelled = false;
    setLiveSnapshot(null);
    const getJson = (path, query = liveQuery) => fetch(`${path}${query}`).then((response) => {
      if (!response.ok) throw new Error(`${path} returned ${response.status}`);
      return response.json();
    });
    const requests = [
      ['landscape', getJson('/api/explore/landscape')],
      ['impact', getJson('/api/explore/impact')],
      ['themes', getJson('/api/explore/cross-cutting-themes')],
      ['patterns', getJson('/api/explore/patterns')],
      ['coverage', getJson('/api/explore/coverage')],
      ['evidence', getJson('/api/explore/evidence-strength')],
      ['silence', getJson('/api/explore/silence')],
      ['themeMatrix', getJson('/api/explore/theme-matrix')],
      ['trend', getJson('/api/explore/trend')],
      ['recognition', getJson('/api/explore/recognition')],
      ['compare', getJson('/api/explore/compare')],
      ['claimVsExperience', getJson('/api/explore/claim-vs-experience')],
      ['crossJurisdiction', getJson('/api/explore/cross-jurisdiction')],
      ['excerpts', getJson('/api/testimonies', excerptQuery)],
      ['organizations', getJson('/api/organizations?role=library&limit=6', '')],
      ['events', getJson('/api/events?limit=6', '')],
      ['proposedAlgorithms', getJson('/api/algorithms?status=PROPOSED,UNDER_REVIEW&limit=6', '')],
      ['briefings', getJson(`/api/briefings${briefingQuery}`, '')],
    ];
    Promise.allSettled(requests.map(([, request]) => request)).then((results) => {
      if (!cancelled) {
        const snapshot = Object.fromEntries(results.map((result, index) => [
          requests[index][0],
          result.status === 'fulfilled' ? result.value : null,
        ]));
        const unavailable = results.flatMap((result, index) => result.status === 'rejected' ? [requests[index][0]] : []);
        setLiveSnapshot({ ...snapshot, unavailable, error: unavailable.length === requests.length });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [briefingQuery, excerptQuery, liveQuery]);

  const cachedBriefing = liveSnapshot && !liveSnapshot.error ? liveSnapshot.briefings?.items?.[0] : null;

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/15 bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a] text-white">
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:38px_38px]" />
        <svg aria-hidden="true" viewBox="0 0 1200 220" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-[0.24]">
          <defs>
            <linearGradient id="briefingsHeaderMesh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#briefingsHeaderMesh)" strokeWidth="1.1">
            <path d="M0 170 L120 130 L240 160 L350 118 L470 146 L590 108 L720 136 L860 96 L980 130 L1200 84" />
            <path d="M0 210 L130 176 L250 204 L375 166 L505 194 L635 158 L770 188 L900 152 L1040 178 L1200 138" />
            <path d="M120 130 L130 176 M240 160 L250 204 M350 118 L375 166 M470 146 L505 194 M590 108 L635 158 M720 136 L770 188 M860 96 L900 152 M980 130 L1040 178" />
          </g>
        </svg>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          <p className="relative text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">Briefing Page</p>
          <div className="relative mt-3">
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white md:text-5xl">
              Briefings
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-amber-50/80">
              Switch between the six briefing views, then open the evidence behind each chart.
            </p>
            <LiveSnapshot snapshot={liveSnapshot} lens={lens} />
          </div>
          {scope === 'algorithm' ? (
            <div className="relative mt-5 grid gap-3 rounded-lg border border-white/15 bg-white/95 p-4 text-slate-950 shadow-xl md:grid-cols-3">
              <label className="text-sm font-semibold text-slate-700">
                Domain
                <select
                  value={domain}
                  onChange={(event) => {
                    const nextDomain = event.target.value;
                    const nextAlgorithms = nextDomain === 'All domains' ? algorithms : algorithms.filter((item) => item.domain === nextDomain);
                    setDomain(nextDomain);
                    setAlgorithm(nextAlgorithms[0]?.slug || algorithms[0].slug);
                  }}
                  className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  {domains.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Algorithm
                <select value={selectedVisibleAlgorithm} onChange={(event) => setAlgorithm(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900">
                  {visibleAlgorithms.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                </select>
              </label>
              <ControlSelect label="Language" value={languageMode} options={languageModes} onChange={setLanguageMode} />
            </div>
          ) : (
            <div className="relative mt-5 grid gap-3 rounded-lg border border-white/15 bg-white/95 p-4 text-slate-950 shadow-xl md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Domain
                <select value={domain} onChange={(event) => setDomain(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900">
                  {domains.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <ControlSelect label="Language" value={languageMode} options={languageModes} onChange={setLanguageMode} />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-800">
                <FileText className="h-3.5 w-3.5" />
                {view.code}
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">{view.title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{view.subtitle}</p>
            </div>
            <div className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 md:block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">Route</span>
              <span className="font-mono">{scope === 'algorithm' ? view.route.replace('[slug]', selectedAlgorithm.slug) : view.route}</span>
            </div>
          </div>
        </div>

        <NarrativePanel
          briefing={cachedBriefing}
          scope={scope}
          lens={lens}
          onLensChange={setLens}
          onScopeChange={setScope}
        />

        <div className="space-y-5">
          {view.blocks.map((block) => (
            <BriefingBlock
              key={block.code}
              block={block}
              snapshot={liveSnapshot}
              lens={lens}
              privateNote={privateNote}
              onPrivateNoteChange={updatePrivateNote}
              onOpenEvidence={() => openEvidence(block)}
              showPrivateNotes={lens === 'intermediary' && block.framing.includes('NOTES PRIVATE')}
            />
          ))}
        </div>
        <EvidenceDrawer block={activeEvidenceBlock} snapshot={liveSnapshot} lens={lens} onClose={closeEvidence} />
      </section>
    </>
  );
}

function LiveSnapshot({ snapshot, lens }) {
  const [drilldown, setDrilldown] = useState(null);
  const { preview, previewItem, setPreview, closePreview } = useEvidencePreview();
  if (!snapshot) {
    return <div className="mt-5 text-sm font-semibold text-amber-50/70">Loading live corpus snapshot...</div>;
  }
  if (snapshot.error) {
    return <div className="mt-5 text-sm font-semibold text-red-700">Live corpus snapshot is unavailable.</div>;
  }
  const points = snapshot.patterns?.points || [];
  const outliers = points.filter((point) => point.isOutlier).length;
  const aggregateOnly = lens === 'government';
  const stories = briefingStories(snapshot);
  const stats = [
    ['Approved stories', snapshot.landscape?.totalApprovedStories ?? 0, storyDrilldown('Approved stories', stories, lens)],
    ['Algorithms', snapshot.landscape?.totalAlgorithms ?? 0, algorithmDrilldown('Algorithms', snapshot.landscape?.algorithms || [])],
    ['Suggested topics', snapshot.patterns?.topics?.length ?? 0, metaDrilldown('Suggested topics', snapshot.patterns?.topics || [], 'Topic')],
    ['Less common stories', aggregateOnly ? 'Aggregate only' : outliers, storyDrilldown('Less common stories', stories.filter((story) => story.cluster?.isOutlier), lens, outliers)],
  ];
  const pipelines = [
    ['Theme matrix', snapshot.themeMatrix?.rows?.length ?? 0, metaDrilldown('Theme matrix cells', snapshot.themeMatrix?.rows || [], 'Cell')],
    ['Trend buckets', snapshot.trend?.buckets?.length ?? 0, metaDrilldown('Trend buckets', snapshot.trend?.buckets || [], 'Month')],
    ['Story excerpts', aggregateOnly ? 'Hidden' : snapshot.excerpts?.items?.length ?? 0, storyDrilldown('Story excerpts', stories, lens)],
    ['Claim rows', snapshot.claimVsExperience?.rows?.length ?? 0, metaDrilldown('Claim rows', snapshot.claimVsExperience?.rows || [], 'Claim row')],
  ];
  const cardClass = 'rounded-md border px-3 py-2 text-left transition';
  const topCardClass = `${cardClass} border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50`;
  const pipelineCardClass = `${cardClass} border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100`;
  return (
    <div className="mt-5 max-w-5xl">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([label, value, drill]) => (
          <button key={label} type="button" onClick={() => drill && setDrilldown(drill)} className={topCardClass}>
            <div className="text-xl font-bold text-slate-950">{value}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {pipelines.map(([label, value, drill]) => (
          <button key={label} type="button" onClick={() => drill && setDrilldown(drill)} className={pipelineCardClass}>
            <div className="text-lg font-bold text-emerald-900">{value}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{label}</div>
          </button>
        ))}
      </div>
      <DrilldownModal drilldown={drilldown} onClose={() => setDrilldown(null)} onPreview={setPreview} />
      <EvidencePreviewModal preview={preview} item={previewItem} onClose={closePreview} />
    </div>
  );
}

function buttonClass(active) {
  return active
    ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700'
    : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200';
}

function ControlSelect({ label, value, options, onChange }) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900">
        {options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
  );
}

function NarrativePanel({ briefing, scope, lens, onLensChange, onScopeChange }) {
  const findings = listJson(briefing?.keyFindings);
  const recommendations = listJson(briefing?.recommendations);
  const claims = claimPreviewRows(briefing?.claimVsExperience);
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.48fr)]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            {scope === 'algorithm' ? 'Algorithm briefing' : 'Corpus briefing'} / {lens}
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950">{briefing?.title || 'No published narrative yet'}</h3>
          <p className="mt-3 text-base leading-7 text-slate-700">
            {briefing?.executiveSummary || 'Live evidence is available below. A reviewed narrative will appear here after the draft is published.'}
          </p>
          {briefing?.patternAnalysis ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">{briefing.patternAnalysis}</p>
          ) : null}
        </div>
        <BriefingViewControls lens={lens} scope={scope} onLensChange={onLensChange} onScopeChange={onScopeChange} />
      </div>
      <div className="mt-5 grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        <NarrativeList title="Key findings" rows={findings} empty="Pending review." />
        <NarrativeList title="Recommendations" rows={recommendations} empty="Pending review." />
        {claims.length ? <NarrativeList title="Claim vs. experience" rows={claims} empty="" limit={3} /> : null}
      </div>
    </div>
  );
}

function BriefingViewControls({ lens, scope, onLensChange, onScopeChange }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-3 gap-2">
        {lenses.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => onLensChange(item.id)} className={buttonClass(lens === item.id)}>
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {scopes.map((item) => (
          <button key={item.id} type="button" onClick={() => onScopeChange(item.id)} className={buttonClass(scope === item.id)}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NarrativeList({ title, rows, empty, limit = Infinity }) {
  const visibleRows = rows.slice(0, limit);
  const remaining = Math.max(0, rows.length - visibleRows.length);
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-800">
        {(visibleRows.length ? visibleRows : [empty]).filter(Boolean).map((row) => (
          <li key={row}>- {row}</li>
        ))}
      </ul>
      {remaining ? <p className="mt-2 text-xs font-semibold text-slate-500">{remaining} more rows are available in the briefing sections below.</p> : null}
    </div>
  );
}

function claimPreviewRows(value) {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  return rows.map((item) => {
    if (typeof item === 'string') return item;
    const name = item?.algorithmName || item?.algorithmSlug || 'System claim';
    const count = Number(item?.experienceCount);
    return Number.isFinite(count) ? `${name}: ${count} relevant ${count === 1 ? 'story' : 'stories'}` : name;
  }).filter(Boolean);
}

function listJson(value) {
  if (!value) return [];
  const rows = Array.isArray(value) ? value : [value];
  return rows.map((item) => {
    if (typeof item === 'string') return item;
    if (item?.text) return item.text;
    if (item?.claim) return `${item.algorithmName || item.algorithmSlug || 'Claim'}: ${item.claim}`;
    return Object.values(item || {}).filter((part) => typeof part === 'string' || typeof part === 'number').join(' - ');
  }).filter(Boolean);
}

function BriefingBlock({ block, snapshot, lens, privateNote, onPrivateNoteChange, onOpenEvidence, showPrivateNotes }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(420px,1.15fr)_minmax(360px,0.85fr)]">
      <div className="flex flex-col border-b border-slate-200 bg-slate-950 p-4 text-white sm:p-6 lg:border-b-0 lg:border-r">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-3xl font-black tracking-tight text-amber-300">{block.code}</p>
            <h3 className="mt-3 text-xl font-bold leading-tight">{block.title}</h3>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200">{block.visual}</span>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex min-h-11 items-center gap-1 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Expand
            </button>
          </div>
        </div>
        <div className="flex min-h-[180px] flex-1 items-center md:min-h-[220px] [&>*]:w-full">
          <LiveVisual block={block} snapshot={snapshot} />
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">{block.framing}</span>
          </div>
        </div>
        <details className="group md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
            What this chart means
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="mt-3 hidden group-open:block">
            <BlockExplanation block={block} />
          </div>
        </details>
        <div className="hidden md:block">
          <BlockExplanation block={block} />
        </div>
        <div className="mt-5 flex justify-center">
          <button type="button" onClick={onOpenEvidence} className="rounded-md bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm hover:bg-emerald-700">
            View evidence
          </button>
        </div>
        {showPrivateNotes ? (
          <label className="mt-4 block rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
            Private notes
            <textarea
              value={privateNote}
              onChange={(event) => onPrivateNoteChange(event.target.value)}
              className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900"
            />
          </label>
        ) : null}
      </div>
      <ChartExpandDialog block={block} snapshot={snapshot} lens={lens} open={expanded} onClose={() => setExpanded(false)} />
    </article>
  );
}

function ChartExpandDialog({ block, snapshot, lens, open, onClose }) {
  const { preview, previewItem, setPreview, closePreview } = useEvidencePreview();
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  if (!open) return null;
  const rows = evidenceRowsWithFallback(block, snapshot, lens);
  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4"
        role="dialog"
        aria-modal="true"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="flex max-h-[94vh] w-full max-w-[min(96vw,1500px)] flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-300">{block.code}</p>
              <h3 className="mt-1 text-2xl font-black">{block.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{block.visual}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-md border border-white/20 p-2 text-white hover:bg-white/10" aria-label="Close expanded chart">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <section className="min-h-0 overflow-auto bg-slate-950 p-5 text-white">
              <LiveVisual block={block} snapshot={snapshot} expanded />
            </section>
            <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-5 lg:border-l lg:border-t-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">{block.framing}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Full expanded view</span>
              </div>
              <dl className="grid gap-3">
                <SpecDetails block={block} />
              </dl>
              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Evidence rows</p>
                <EvidenceRowsList rows={rows} onPreview={setPreview} />
              </div>
            </aside>
          </div>
        </div>
      </div>
      <EvidencePreviewModal preview={preview} item={previewItem} onClose={closePreview} />
    </>
  );
}

function EvidenceDrawer({ block, snapshot, lens, onClose }) {
  const { preview, previewItem, setPreview, closePreview } = useEvidencePreview();
  if (!block) return null;
  const visibleRows = evidenceRowsWithFallback(block, snapshot, lens);
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-950/35"
        role="dialog"
        aria-modal="true"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        onWheel={(event) => {
          if (event.target === event.currentTarget) window.scrollBy({ left: event.deltaX, top: event.deltaY });
        }}
      >
        <div className="ml-auto flex h-full w-full max-w-xl flex-col overscroll-contain bg-white shadow-2xl" onWheel={(event) => event.stopPropagation()}>
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Evidence</p>
                <h3 className="mt-2 text-xl font-bold text-slate-950">{block.code} {block.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{block.api}</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Close evidence">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain p-5">
            <EvidenceRowsList rows={visibleRows} onPreview={setPreview} />
            {lens === 'government' ? (
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Government view keeps story-level excerpts hidden and shows aggregate evidence only.
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <EvidencePreviewModal preview={preview} item={previewItem} onClose={closePreview} />
    </>
  );
}

function evidenceRowsWithFallback(block, snapshot, lens) {
  const rows = evidenceRows(block, snapshot, lens);
  if (rows.length) return rows;
  return [lens === 'government'
    ? { title: 'No aggregate rows available', value: '', detail: 'The current filters either do not meet the aggregate privacy threshold or are waiting for approved peer data.' }
    : { title: 'No rows for the current filters', value: '', detail: 'Try another domain, lens, or algorithm.' }];
}

function BlockExplanation({ block }) {
  const explanation = explainBlock(block);
  return (
    <div className="grid gap-3">
      <PlainInfo title="Summary" text={explanation.summary} />
      <PlainInfo title="Data used" text={explanation.data} />
      <PlainInfo title="ML/NLP method" text={explanation.method} />
      <PlainInfo title="Now" text={explanation.now} />
    </div>
  );
}

function PlainInfo({ title, text }) {
  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</h4>
      <p className="mt-1 text-sm leading-6 text-slate-800">{text}</p>
    </section>
  );
}

function explainBlock(block) {
  const api = block.api.toLowerCase();
  const summary = (() => {
    if (block.visualType === 'treemap') return 'Shows which public-service areas have the most algorithm records or story evidence.';
    if (block.visualType === 'heatmap') return 'Shows where two categories overlap, so stronger cells point to areas worth reviewing first.';
    if (block.visualType === 'network') return 'Shows themes or stories that often appear together across the current briefing.';
    if (block.visualType === 'excerpt') return 'Shows selected story excerpts that help explain what the chart is counting.';
    if (block.visualType === 'coverage') return 'Shows what is present in the evidence base and what is still missing.';
    if (block.visualType === 'table') return 'Turns the current evidence into rows that are easier to compare.';
    if (api.includes('trend')) return 'Shows how story volume or themes change month by month.';
    if (api.includes('patterns')) return 'Places stories with similar language near each other and labels the main topic groups.';
    return 'Summarizes the current briefing evidence in a chart that can be checked through the evidence panel.';
  })();
  const data = (() => {
    if (api.includes('organizations') || api.includes('events')) return 'Library partners, community events, and public resource links.';
    if (api.includes('status=proposed')) return 'Proposed or under-review algorithm cards plus comparable public records.';
    if (api.includes('claim-vs-experience')) return 'Published algorithm claims and approved stories that mention related experiences.';
    if (api.includes('coverage')) return 'Submission method, language, moderation status, dates, and other review metadata.';
    if (api.includes('testimonies') || api.includes('recognition')) return 'Approved stories, summaries, themes, and linked algorithm records.';
    if (api.includes('landscape') || api.includes('algorithms')) return 'Reviewed algorithm cards, domains, agencies, status, and approved-story counts.';
    return 'Approved stories, stored theme labels, impact labels, dates, and algorithm records.';
  })();
  return { summary, data, method: block.ml || 'none', now: currentMethod(block) };
}

function currentMethod(block) {
  const code = block.code;
  const excerptBlocks = new Set(['C5', 'L4', 'CC6', 'IC8']);
  const impactBlocks = new Set(['C3', 'L2', 'G2']);
  const themeBlocks = new Set(['C4', 'L3', 'G3', 'CC3', 'IC2', 'GC2']);
  const silenceBlocks = new Set(['L5', 'G5', 'IC3', 'GC4']);
  const evidenceBlocks = new Set(['L6', 'IC6']);
  const claimBlocks = new Set(['C7', 'L7', 'G4', 'IC7', 'GC3']);
  const comparableBlocks = new Set(['CC2', 'G7', 'GC7']);
  if (impactBlocks.has(code)) return 'Impact labels are read from stored story records. Local refresh uses BART-MNLI; results that still need review are not auto-published.';
  if (themeBlocks.has(code)) return 'Theme labels are read from stored story records. Local refresh uses multi-label BART-MNLI; emergent topics come from the separate corpus batch.';
  if (excerptBlocks.has(code)) return 'Stored spaCy entities are redacted. Qwen sentence-transformer vectors select each HDBSCAN cluster centroid, saved outliers preserve less common stories, and KeyBERT supplies keywords.';
  if (claimBlocks.has(code)) return 'Stored claims are matched to approved stories with cached sentence-transformers cosine similarity. Any prose comparison remains a reviewed draft.';
  if (silenceBlocks.has(code)) return 'The score combines volume gap, sentence-transformers cosine coverage, domain gap, and impact weight.';
  if (evidenceBlocks.has(code)) return 'Strength labels come from story counts, confidence, impact mix, and saved outlier flags.';
  if (comparableBlocks.has(code)) return 'Reviewed system records are filtered first. Approved peer aggregates are ranked by cached sentence-transformers similarity when peer data is available.';
  if (code === 'C1' || code === 'G1') return 'This section uses the reviewed algorithm record. Plain-language rewrite is still a reviewed content step.';
  if (code === 'C2') return 'This section uses reviewed algorithm fields. Keyword tags come from saved story keywords when available.';
  if (code === 'C6') return 'Matches are ranked by cosine similarity over cached sentence-transformers vectors.';
  if (code === 'IC4') return 'The story map reads the saved batch output: Qwen embeddings, UMAP, HDBSCAN, BERTopic, and KeyBERT labels.';
  if (code === 'G8' || code === 'GC8') return 'This waits on approved peer-jurisdiction records.';
  return block.ml?.toLowerCase().includes('none') ? 'This section groups reviewed records or metadata.' : 'This section reads saved fields and counts them for the current filters.';
}

function EvidenceRowsList({ rows, onPreview }) {
  const [drilldown, setDrilldown] = useState(null);
  return (
    <>
      <div className="mt-3 space-y-3">
        {rows.map((row, index) => {
          const actions = normalizeEvidenceActions(row);
          const canDrill = Boolean(row.drilldown);
          return (
          <div
            key={evidenceRowKey(row, index)}
            role={canDrill ? 'button' : undefined}
            tabIndex={canDrill ? 0 : undefined}
            onClick={() => canDrill && setDrilldown(row.drilldown)}
            onKeyDown={(event) => {
              if (canDrill && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                setDrilldown(row.drilldown);
              }
            }}
            className={`rounded-md border border-slate-200 bg-slate-50 p-3 ${canDrill ? 'cursor-pointer hover:border-amber-300 hover:bg-amber-50' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-slate-950">{row.title}</p>
              <div className="flex shrink-0 flex-wrap justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                {canDrill ? (
                  <button type="button" onClick={() => setDrilldown(row.drilldown)} className="rounded border border-amber-200 bg-white px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-50">
                    Details
                  </button>
                ) : null}
                {actions.map((action, actionIndex) => (
                  <EvidenceActionButton key={`${action.type}-${action.href || action.slug || action.id || actionIndex}`} action={action} onPreview={onPreview} />
                ))}
                {row.value ? <span className="rounded bg-white px-2 py-1 text-xs font-bold text-slate-800">{row.value}</span> : null}
              </div>
            </div>
            {row.detail ? <p className="mt-2 text-sm leading-6 text-slate-700">{row.detail}</p> : null}
          </div>
          );
        })}
      </div>
      <DrilldownModal drilldown={drilldown} onClose={() => setDrilldown(null)} onPreview={onPreview} />
    </>
  );
}

function EvidenceActionButton({ action, onPreview }) {
  const className = 'inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100';
  if (action.type === 'algorithm' || action.type === 'event') {
    return (
      <button type="button" onClick={() => onPreview(action)} className={className}>
        {action.label || 'Open'}
      </button>
    );
  }
  if (action.type === 'external') {
    return (
      <a href={action.href} target="_blank" rel="noreferrer" className={className}>
        {action.label || 'Open'}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  return action.href ? <a href={action.href} className={className}>{action.label || 'Open'}</a> : null;
}

function normalizeEvidenceActions(row) {
  if (Array.isArray(row.actions)) return row.actions.filter(Boolean);
  if (row.action) return [row.action];
  if (row.href) return [{ type: row.href.startsWith('http') ? 'external' : 'story', href: row.href, label: 'Open' }];
  return [];
}

function evidenceRowKey(row, index) {
  return `${row.title || 'row'}-${row.value || ''}-${row.detail || ''}-${index}`;
}

function useEvidencePreview() {
  const [preview, setPreview] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    if (!preview) {
      setPreviewItem(null);
      return undefined;
    }
    if (preview.type === 'event') {
      setPreviewItem(preview.item || null);
      return undefined;
    }
    if (preview.type !== 'algorithm') return undefined;
    let cancelled = false;
    setPreviewItem(preview.item ? normalizeAlgorithmForModal(preview.item) : null);
    if (!preview.slug) return undefined;
    fetch(`/api/algorithms/${encodeURIComponent(preview.slug)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!cancelled && payload) setPreviewItem(normalizeAlgorithmForModal(payload));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [preview]);

  return {
    preview,
    previewItem,
    setPreview,
    closePreview: () => setPreview(null),
  };
}

function EvidencePreviewModal({ preview, item, onClose }) {
  if (!preview) return null;
  if (preview.type === 'algorithm' && item) return <AlgorithmModal algorithm={item} onClose={onClose} />;
  if (preview.type === 'event' && item) return <EventModal event={item} onClose={onClose} />;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4">
      <div className="rounded-lg bg-white p-5 text-sm font-semibold text-slate-700 shadow-2xl">
        Loading details...
      </div>
    </div>
  );
}

function DrilldownModal({ drilldown, onClose, onPreview }) {
  useEffect(() => {
    if (!drilldown) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drilldown]);

  if (!drilldown) return null;
  const stories = drilldown.stories || [];
  const algorithms = drilldown.algorithms || [];
  const metaRows = drilldown.metaRows || [];
  const hasDetails = stories.length || algorithms.length || metaRows.length;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 sm:p-4" role="dialog" aria-modal="true" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Count details</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">{drilldown.title}</h3>
            <p className="mt-1 text-sm text-slate-600">Counted total: <span className="font-bold text-slate-900">{drilldown.count ?? stories.length + algorithms.length + metaRows.length}</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Close count details">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!hasDetails ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">Detailed rows are not available for this aggregate yet.</p>
          ) : null}
          {metaRows.length ? <DrilldownSection title="Breakdown" rows={metaRows} /> : null}
          {algorithms.length ? (
            <section className="mt-4">
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Algorithms</h4>
              <div className="mt-2 grid gap-2">
                {algorithms.map((algorithm, index) => (
                  <div key={algorithm.slug || `${algorithm.name}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950">{algorithm.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{algorithm.useCase || algorithm.domain || 'Uncategorized'}{algorithm.approvedTestimonyCount !== undefined ? `; ${algorithm.approvedTestimonyCount} approved stories` : ''}</p>
                      </div>
                      {algorithm.slug ? (
                        <button type="button" onClick={() => onPreview?.(algorithmAction(algorithm.slug, algorithm, 'System'))} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100">
                          Open
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {stories.length ? (
            <section className="mt-4">
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Stories</h4>
              <div className="mt-2 grid max-h-[45vh] gap-2 overflow-y-auto pr-1">
                {stories.map((story) => (
                  <div key={story.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950">{story.title}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{story.affectedDomain || story.topicLabel || 'Story'}{story.submittedAt ? ` / ${monthKey(story.submittedAt)}` : ''}{story.impact ? ` / ${story.impact}` : ''}</p>
                      </div>
                      {story.id ? <a href={`/stories/${story.id}`} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100">Open story</a> : null}
                    </div>
                    {story.excerpt ? <p className="mt-2 text-sm leading-6 text-slate-700">{story.excerpt}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DrilldownSection({ title, rows }) {
  return (
    <section>
      <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="mt-2 grid gap-2">
        {rows.map((row, index) => (
          <div key={`${row.title || row.label}-${index}`} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="font-bold text-slate-950">{row.title || row.label}</p>
              {row.detail ? <p className="mt-1 text-sm text-slate-600">{row.detail}</p> : null}
            </div>
            {row.value !== undefined && row.value !== '' ? <span className="rounded bg-white px-2 py-1 text-xs font-bold text-slate-800">{row.value}</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function normalizeAlgorithmForModal(algorithm) {
  const testimonyLinks = Array.isArray(algorithm.testimonyLinks) ? algorithm.testimonyLinks : [];
  const relatedStories = Array.isArray(algorithm.relatedStories)
    ? algorithm.relatedStories
    : testimonyLinks
      .map((link) => link.testimony)
      .filter((story) => story && (!story.moderationStatus || story.moderationStatus === 'APPROVED'));
  return {
    ...algorithm,
    documents: Array.isArray(algorithm.documents) ? algorithm.documents : [],
    claims: Array.isArray(algorithm.claims) ? algorithm.claims : [],
    relatedStories,
    storyCount: algorithm.storyCount ?? relatedStories.length,
  };
}

function briefingStories(snapshot) {
  return snapshot?.excerpts?.items || [];
}

function monthKey(value) {
  return String(value || '').slice(0, 7);
}

function storyHasTheme(story, theme) {
  return (story.themes || []).some((item) => item.theme === theme);
}

function storyAlgorithms(stories) {
  const bySlug = new Map();
  for (const story of stories) {
    for (const algorithm of story.algorithms || []) {
      const key = algorithm.slug || algorithm.name;
      if (key && !bySlug.has(key)) bySlug.set(key, algorithm);
    }
  }
  return [...bySlug.values()];
}

function algorithmDrilldown(title, algorithms) {
  return { kind: 'algorithms', title, count: algorithms.length, algorithms };
}

function storyDrilldown(title, stories, lens, count = stories.length) {
  return {
    kind: 'stories',
    title,
    count,
    stories: lens === 'government' ? [] : stories,
    algorithms: storyAlgorithms(stories),
    metaRows: lens === 'government' ? [{ title: 'Aggregate-only view', value: count, detail: 'Story-level details are hidden for this lens.' }] : [],
  };
}

function metaDrilldown(title, rows, label = 'Row') {
  return {
    kind: 'topics',
    title,
    count: rows.length,
    metaRows: rows.map((row, index) => ({
      title: row.label || row.title || row.month || row.algorithmName || `${label} ${index + 1}`,
      value: row.count ?? row.total ?? row.size ?? row.value ?? row.experienceCount ?? '',
      detail: row.detail || row.policyDirection || row.improvementDirection || row.reviewStatus || keywordDetail(row) || '',
    })),
  };
}

function keywordDetail(row) {
  const keywords = row.keywords || row.topKeywords;
  return Array.isArray(keywords) && keywords.length ? `Keywords: ${keywords.join(', ')}.` : '';
}

function groupStoriesByTheme(snapshot, theme, lens, count) {
  const stories = briefingStories(snapshot).filter((story) => storyHasTheme(story, theme));
  return storyDrilldown(`${displayBriefingLabel(theme)} - ${count} stories`, stories, lens, count);
}

function groupStoriesByDomainTheme(snapshot, row, lens) {
  const stories = briefingStories(snapshot).filter((story) => story.affectedDomain === row.domain && storyHasTheme(story, row.theme));
  return storyDrilldown(`${row.domain} / ${displayBriefingLabel(row.theme)} - ${row.count} stories`, stories, lens, row.count);
}

function groupStoriesByMonth(snapshot, row, lens) {
  const stories = briefingStories(snapshot).filter((story) => monthKey(story.submittedAt) === row.month);
  return storyDrilldown(`${row.month} - ${row.total} stories`, stories, lens, row.total);
}

function groupStoriesByTopic(snapshot, row, lens) {
  const topicPoints = (snapshot.patterns?.points || []).filter((point) => point.topicId === row.topicId || point.topicLabel === row.label);
  const byId = new Map(briefingStories(snapshot).map((story) => [story.id, story]));
  const stories = topicPoints.map((point) => ({ ...point, ...(byId.get(point.id) || {}) }));
  return storyDrilldown(`${row.label || `Topic ${row.topicId}`} - ${row.size} stories`, stories, lens, row.size);
}

function groupStoriesByDomain(snapshot, label, lens, count) {
  const stories = briefingStories(snapshot).filter((story) => story.affectedDomain === label);
  return storyDrilldown(`${label} - ${count} stories`, stories, lens, count);
}

function coverageStories(snapshot, key) {
  const stories = briefingStories(snapshot);
  if (key === 'noAlgorithmLink') return stories.filter((story) => !(story.algorithms || []).length);
  if (key === 'noAiThemes') return stories.filter((story) => !(story.themes || []).length);
  if (key === 'nonEnglish') return stories.filter((story) => story.originalLanguage && story.originalLanguage !== 'en');
  return [];
}

function coverageDrilldown(snapshot, key, value, lens) {
  const stories = coverageStories(snapshot, key);
  if (stories.length) return storyDrilldown(`${key} - ${value}`, stories, lens, value);
  return metaDrilldown(`${key} - ${value}`, [{
    label: key,
    count: value,
    detail: coverageGapDetail(key),
  }]);
}

function coverageGapDetail(key) {
  const details = {
    noNeighbourhood: 'The current story schema does not capture a neighbourhood field.',
    noPartnerOrganization: 'This aggregate counts stories without a stored partner organization.',
    noAlgorithmLink: 'Stories in this group have no linked algorithm record.',
    noAiThemes: 'Stories in this group do not have stored theme labels.',
    nonEnglish: 'Stories in this group were submitted in a language other than English.',
  };
  return details[key] || 'Coverage/paradata gap for the current filters.';
}

function groupStoriesByFinding(snapshot, row, lens) {
  const label = row.label;
  const byTopic = briefingStories(snapshot).filter((story) => story.topic?.label === label || story.topicLabel === label);
  const byDomain = briefingStories(snapshot).filter((story) => story.affectedDomain === label);
  const stories = byTopic.length ? byTopic : byDomain;
  return storyDrilldown(`${label} - ${row.count} stories`, stories, lens, row.count);
}

function evidenceRows(block, snapshot, lens) {
  if (!snapshot) return [{ title: 'Live evidence loading', value: '', detail: 'The supporting API rows are still loading.' }];
  if (snapshot.error) return [{ title: 'Live evidence unavailable', value: '', detail: 'The page could not load the supporting API rows.' }];
  const api = block.api.toLowerCase();
  if (api.includes('theme-matrix')) return (snapshot.themeMatrix?.rows || []).map((row) => ({
    title: `${row.domain} / ${displayBriefingLabel(row.theme)}`,
    value: row.count,
    detail: 'Approved story count in this domain-theme cell.',
    drilldown: groupStoriesByDomainTheme(snapshot, row, lens),
  }));
  if (api.includes('trend')) return [
    ...(snapshot.trend?.buckets || []).map((row) => ({
      title: row.month,
      value: row.total,
      detail: 'Approved stories in this time bucket.',
      drilldown: groupStoriesByMonth(snapshot, row, lens),
    })),
    ...(snapshot.trend?.markers || []).map((row) => ({
      title: row.algorithmName,
      value: row.currentVersion || row.yearDeployed || '',
      detail: 'Algorithm deployment/version marker shown against the monthly trend.',
      actions: [algorithmAction(row.algorithmSlug, undefined, 'System')],
    })),
  ];
  if (api.includes('patterns')) return [
    ...(snapshot.patterns?.topics || []).map((row) => ({
      title: row.label || `Topic ${row.topicId}`,
      value: row.size,
      detail: `Suggested corpus topic. Keywords: ${(row.keywords || row.topKeywords || []).join(', ') || 'none listed'}.`,
      drilldown: groupStoriesByTopic(snapshot, row, lens),
    })),
    ...(lens === 'government' ? [] : (snapshot.patterns?.points || []).map((row) => ({
      title: row.title || 'Story point',
      value: row.topicLabel || (row.isOutlier ? 'outlier' : `cluster ${row.clusterId ?? 'n/a'}`),
      detail: `UMAP (${Number(row.umapX).toFixed(2)}, ${Number(row.umapY).toFixed(2)}). ${row.excerpt || ''}`,
      actions: [storyAction(row.id, 'Story')],
    }))),
  ];
  if (api.includes('claim-vs-experience')) return (snapshot.claimVsExperience?.rows || []).map((row) => ({
    title: row.algorithmName,
    value: row.experienceCount,
    detail: (row.claims || []).map((claim) => claim.text).join(' ') || 'No formal claim text listed.',
    actions: [algorithmAction(row.algorithmSlug)],
  }));
  if (api.includes('status=proposed')) return (snapshot.proposedAlgorithms?.items || []).map((row) => ({
    title: row.name,
    value: row.status,
    detail: row.useCase || row.agencyName,
    actions: [algorithmAction(row.slug, row)],
  }));
  if (api.includes('cross-jurisdiction')) return (snapshot.crossJurisdiction?.rows || []).map((row) => {
    const [title, value] = crossJurisdictionRow(row);
    return { title, value, detail: row.summary || row.detail || snapshot.crossJurisdiction?.reviewStatus || 'Approved peer-jurisdiction aggregate.' };
  });
  if (api.includes('coverage')) return Object.entries(snapshot.coverage?.whatsMissing || {}).map(([title, value]) => {
    return {
      title,
      value,
      detail: 'Coverage/paradata gap for the current filters.',
      drilldown: coverageDrilldown(snapshot, title, value, lens),
    };
  });
  if (api.includes('silence')) return (snapshot.silence?.rows || []).map((row) => ({
    title: row.algorithmName,
    value: row.priority,
    detail: `Expected ${row.expectedVolume ?? 'n/a'} stories; volume ${row.factors?.volumeGap ?? 0}; semantic ${row.factors?.semanticGap ?? 0}; domain ${row.factors?.domainGap ?? 0}.`,
    actions: [algorithmAction(row.algorithmSlug)],
    drilldown: metaDrilldown(`${row.algorithmName} silence factors`, [
      { label: 'Expected volume', count: row.expectedVolume ?? 0, detail: 'Impact, age, and domain set the expected story level.' },
      { label: 'Volume gap', count: row.factors?.volumeGap ?? 0, detail: 'How far linked stories fall below expected volume.' },
      { label: 'Semantic gap', count: row.factors?.semanticGap ?? 0, detail: 'How few stories exceed the sentence-transformers relevance threshold for this system.' },
      { label: 'Domain gap', count: row.factors?.domainGap ?? 0, detail: 'How thin the domain-level story volume is.' },
      { label: 'Impact weight', count: row.factors?.impactWeight ?? 0, detail: 'Higher-impact systems raise the review priority.' },
    ]),
  }));
  if (api.includes('testimonies') || api.includes('recognition')) {
    if (lens === 'government') return [{ title: 'Aggregate-only lens', value: '', detail: 'Story rows are intentionally suppressed for government users.' }];
    const rows = api.includes('recognition') ? snapshot.recognition?.examples : snapshot.excerpts?.items;
    return (rows || []).map((row) => ({
      title: row.title,
      value: row.impact || row.matchBasis || row.whyShown,
      detail: row.excerpt || row.whyShown,
      actions: [
        storyAction(row.id),
        ...(row.algorithms || []).slice(0, 2).map((algorithm) => algorithmAction(algorithm.slug, algorithm, 'System')),
      ],
    }));
  }
  if (api.includes('evidence-strength')) return (snapshot.evidence?.findings || []).map((row) => ({
    title: row.label,
    value: row.strength,
    detail: `${row.count} stories; minority ${row.representation?.minorityCount || 0}; dissent ${row.representation?.dissentCount || 0}.`,
    drilldown: groupStoriesByFinding(snapshot, row, lens),
  }));
  if (api.includes('compare')) return (snapshot.compare?.groups || []).map((row) => {
    const impacts = Object.fromEntries(countRows(row.impact));
    return {
      title: row.label,
      value: row.total,
      detail: `Positive ${impacts.POSITIVE || 0}; negative ${impacts.NEGATIVE || 0}; mixed ${impacts.MIXED || 0}.`,
      drilldown: groupStoriesByDomain(snapshot, row.label, lens, row.total),
    };
  });
  if (api.includes('impact')) return (snapshot.impact?.aiSuggested || []).map((row) => ({ title: row.label, value: row.count, detail: 'Stored impact label count.' }));
  if (api.includes('themes') || api.includes('cross-cutting-themes')) return (snapshot.themes?.themes || []).map((row) => ({
    title: displayBriefingLabel(row.theme),
    value: row.count,
    detail: row.policyDirection || row.improvementDirection || 'Suggested theme from approved stories.',
    drilldown: groupStoriesByTheme(snapshot, row.theme, lens, row.count),
  }));
  if (api.includes('organizations') || api.includes('events')) return [
    ...(snapshot.organizations?.items || []).map((row) => ({
      title: row.name,
      value: row.role,
      detail: row.description || row.websiteUrl || 'Library/community resource.',
      actions: [externalAction(row.websiteUrl, 'Website')],
    })),
    ...(snapshot.events?.items || []).map((row) => ({
      title: row.title,
      value: row.location || (row.isVirtual ? 'Virtual' : ''),
      detail: row.date || 'Community event.',
      actions: [eventAction(row, 'Event'), externalAction(row.registrationUrl, 'Register')],
    })),
  ];
  if (block.code === 'CC2') return (snapshot.landscape?.algorithms || []).map((row) => ({
    title: row.name,
    value: row.useCase || 'Uncategorized',
    detail: `${row.agencyName || 'Unknown agency'}; ${row.status || 'unknown status'}; ${row.approvedTestimonyCount || 0} approved stories.`,
    actions: [algorithmAction(row.slug, row)],
    drilldown: algorithmDrilldown(row.name, [row]),
  }));
  return [
    ...(snapshot.landscape?.byDomain || []).map((row) => ({
      title: row.label,
      value: row.count,
      detail: 'Algorithms grouped by domain.',
      drilldown: algorithmDrilldown(`${row.label} - ${row.count} algorithms`, (snapshot.landscape?.algorithms || []).filter((algorithm) => algorithm.useCase === row.label)),
    })),
    ...(snapshot.landscape?.algorithms || []).map((row) => ({
      title: row.name,
      value: row.useCase || row.status || '',
      detail: `${row.agencyName || 'Unknown agency'}; ${row.approvedTestimonyCount || 0} approved stories.`,
      actions: [algorithmAction(row.slug, row, 'System')],
      drilldown: algorithmDrilldown(row.name, [row]),
    })),
  ];
}

function algorithmAction(slug, item, label = 'Open') {
  return slug ? { type: 'algorithm', slug, item, label } : null;
}

function storyAction(id, label = 'Open') {
  return id ? { type: 'story', href: `/stories/${id}`, label } : null;
}

function eventAction(item, label = 'Open') {
  return item?.id ? { type: 'event', id: item.id, item, label } : null;
}

function externalAction(href, label = 'Open') {
  return href ? { type: 'external', href, label } : null;
}

function SpecDetails({ block }) {
  return (
    <>
      <SpecRow icon={Database} label="Database" value={block.db} />
      <SpecRow icon={Search} label="API endpoint" value={block.api} />
      <SpecRow icon={Filter} label="ML / NLP method" value={block.ml} />
      <SpecRow icon={FileText} label="Now" value={currentMethod(block)} />
    </>
  );
}

function displayBriefingLabel(value) {
  const text = String(value || '').trim();
  const known = {
    data_accuracy: 'Data accuracy',
    arbitrary_outcome: 'Arbitrary outcomes',
    positive_experience: 'Positive experiences',
    opacity: 'Lack of explanation',
    delayed_outcome: 'Delays',
    loss_of_dignity: 'Dignity concerns',
    lack_of_recourse: 'Appeals and recourse',
    process_confusion: 'Process confusion',
  };
  return known[text] || text.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function LiveVisual({ block, snapshot, expanded = false }) {
  if (!snapshot) return <EmptyLive label="Loading live data for this chart..." />;
  if (snapshot.error) return <EmptyLive label="Live chart data is unavailable." />;
  const api = block.api.toLowerCase();
  if (block.code === 'GC1') return <LivePortfolioDashboard snapshot={snapshot} expanded={expanded} />;
  if (block.code === 'G2') return <LiveImpactTrend impact={snapshot.impact} buckets={snapshot.trend?.buckets || []} expanded={expanded} />;
  if (block.code === 'IC3') return <LiveSilenceCoverage silence={snapshot.silence} coverage={snapshot.coverage} expanded={expanded} />;
  if (block.code === 'GC2') return <LiveThemeBarsMatrix themes={snapshot.themes?.themes || []} matrix={snapshot.themes?.coOccurrences || []} expanded={expanded} />;
  if (block.code === 'GC6' || block.code === 'G6') return <LivePolicyTable themes={snapshot.themes?.themes || []} expanded={expanded} />;
  if (api.includes('theme-matrix')) return <LiveHeatmap rows={snapshot.themeMatrix?.rows || []} expanded={expanded} />;
  if (api.includes('trend')) return <LiveTrend buckets={snapshot.trend?.buckets || []} expanded={expanded} />;
  if (api.includes('testimonies')) return <LiveExcerpts examples={snapshot.excerpts?.items || []} expanded={expanded} />;
  if (api.includes('recognition')) return <LiveExcerpts examples={snapshot.recognition?.examples || []} expanded={expanded} />;
  if (api.includes('claim-vs-experience')) return <LiveTable rows={(snapshot.claimVsExperience?.rows || []).map((row) => [row.algorithmName, row.experienceCount])} expanded={expanded} />;
  if (api.includes('status=proposed')) return <LiveAlgorithmCards algorithms={snapshot.proposedAlgorithms?.items || []} emptyLabel="No proposed systems returned." expanded={expanded} />;
  if (api.includes('cross-jurisdiction')) return <LiveTable rows={(snapshot.crossJurisdiction?.rows || []).map(crossJurisdictionRow)} emptyLabel={snapshot.crossJurisdiction?.reviewStatus || 'Waiting for approved peer-jurisdiction data.'} expanded={expanded} />;
  if (api.includes('patterns')) return <LiveScatter points={snapshot.patterns?.points || []} expanded={expanded} />;
  if (api.includes('silence')) return <LiveSilenceHeatmap rows={snapshot.silence?.rows || []} expanded={expanded} />;
  if (api.includes('coverage')) return <LiveCoveragePanel coverage={snapshot.coverage} expanded={expanded} />;
  if (api.includes('organizations') || api.includes('events')) return <LiveLinks organizations={snapshot.organizations?.items || []} events={snapshot.events?.items || []} expanded={expanded} />;
  if (api.includes('evidence-strength')) return <LiveBars rows={(snapshot.evidence?.findings || []).map((row) => [row.label, row.count])} expanded={expanded} />;
  if (api.includes('compare')) return <LiveCompareMultiples groups={snapshot.compare?.groups || []} expanded={expanded} />;
  if (api.includes('impact')) return <LiveImpactSplit rows={snapshot.impact?.aiSuggested || []} />;
  if (api.includes('themes') || api.includes('cross-cutting-themes')) {
    if (block.visualType === 'network') return <LiveThemeNetwork rows={snapshot.themes?.coOccurrences || []} themes={snapshot.themes?.themes || []} expanded={expanded} />;
    if (block.visualType === 'heatmap') return <LiveCoOccurrenceMatrix rows={snapshot.themes?.coOccurrences || []} themes={snapshot.themes?.themes || []} expanded={expanded} />;
    return <LiveBars rows={(snapshot.themes?.themes || []).map((row) => [displayBriefingLabel(row.theme), row.count])} expanded={expanded} />;
  }
  if (block.code === 'CC2') return <LiveAlgorithmCards algorithms={snapshot.landscape?.algorithms || []} emptyLabel="No systems returned for the current domain." expanded={expanded} />;
  if (block.visualType === 'treemap') return <LiveTreemap rows={(snapshot.landscape?.byDomain || []).map((row) => [row.label, row.count])} expanded={expanded} />;
  if (block.visualType === 'cards') return <LiveAlgorithmCards algorithms={snapshot.landscape?.algorithms || []} expanded={expanded} />;
  if (block.visualType === 'table' && (api.includes('landscape') || api.includes('algorithms'))) {
    return <LiveTable rows={(snapshot.landscape?.algorithms || []).map((row) => [row.name, row.approvedTestimonyCount])} expanded={expanded} />;
  }
  if (api.includes('landscape') || api.includes('algorithms')) return <LiveBars rows={(snapshot.landscape?.byDomain || []).map((row) => [row.label, row.count])} expanded={expanded} />;
  return <EmptyLive label="No live chart data returned for this block." />;
}

function LivePortfolioDashboard({ snapshot, expanded = false }) {
  return (
    <div className="mt-5 space-y-4">
      <LiveTreemap rows={(snapshot.landscape?.byDomain || []).map((row) => [row.label, row.count])} expanded={expanded} />
      <LiveImpactSplit rows={snapshot.impact?.aiSuggested || []} compact />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-white/10 p-2">
          <p className="text-lg font-black text-amber-200">{snapshot.landscape?.totalAlgorithms ?? 0}</p>
          <p className="text-[10px] font-bold uppercase text-slate-300">systems</p>
        </div>
        <div className="rounded bg-white/10 p-2">
          <p className="text-lg font-black text-amber-200">{snapshot.landscape?.totalApprovedStories ?? 0}</p>
          <p className="text-[10px] font-bold uppercase text-slate-300">stories</p>
        </div>
      </div>
    </div>
  );
}

function LiveImpactTrend({ impact, buckets, expanded = false }) {
  return (
    <div className="mt-5 space-y-4">
      <LiveImpactSplit rows={impact?.aiSuggested || []} compact />
      <LiveTrend buckets={buckets} expanded={expanded} />
    </div>
  );
}

function LiveImpactSplit({ rows, compact = false }) {
  const cleanRows = (rows || []).filter((row) => row.count > 0);
  const total = cleanRows.reduce((sum, row) => sum + row.count, 0);
  if (!total) return <EmptyLive />;
  const colors = {
    POSITIVE: 'bg-emerald-300',
    NEGATIVE: 'bg-rose-300',
    MIXED: 'bg-amber-300',
    UNCLEAR: 'bg-slate-300',
  };
  return (
    <div className={compact ? '' : 'mt-5'}>
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Segment: impact</span>
        <span>Total: {total}</span>
      </div>
      <div className="flex h-7 rounded border border-white/15 bg-white/10">
        {cleanRows.map((row) => (
          <InfoTooltip
            key={row.label}
            label={String(row.count)}
            className="h-full"
            block
            style={{ width: `${(row.count / total) * 100}%` }}
          >
            <span className={`block h-full w-full ${colors[row.label] || 'bg-slate-300'}`} />
          </InfoTooltip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-300">
        {cleanRows.map((row) => (
          <span key={row.label} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-sm ${colors[row.label] || 'bg-slate-300'}`} />
            {displayBriefingLabel(row.label)} {row.count}
          </span>
        ))}
      </div>
    </div>
  );
}

function LiveSilenceCoverage({ silence, coverage, expanded = false }) {
  return (
    <div className="mt-5 space-y-4">
      <LiveSilenceHeatmap rows={silence?.rows || []} expanded={expanded} />
      <LiveCoveragePanel coverage={coverage} expanded={expanded} />
    </div>
  );
}

function LiveThemeBarsMatrix({ themes, matrix, expanded = false }) {
  return (
    <div className="mt-5 space-y-4">
      <LiveBars rows={(themes || []).map((row) => [displayBriefingLabel(row.theme), row.count])} expanded={expanded} />
      <LiveCoOccurrenceMatrix rows={matrix || []} themes={themes || []} expanded={expanded} />
    </div>
  );
}

function LivePolicyTable({ themes, expanded = false }) {
  const rows = (expanded ? themes || [] : (themes || []).slice(0, 5)).map((row) => ({
    theme: displayBriefingLabel(row.theme),
    direction: row.policyDirection || row.improvementDirection || 'Needs mapping',
  }));
  if (!rows.length) return <EmptyLive label="No policy-direction rows returned." />;
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: theme</span>
        <span>X: policy direction</span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={`${row.theme}-${row.direction}`} className={`grid gap-2 rounded-md border border-white/15 bg-white/10 p-2 text-xs ${expanded ? 'grid-cols-[minmax(180px,0.42fr)_minmax(0,0.58fr)]' : 'grid-cols-[minmax(96px,0.44fr)_minmax(0,0.56fr)]'}`}>
            <TruncatedTooltip label={row.theme} className="font-bold text-amber-100" full={expanded} />
            <TruncatedTooltip label={row.direction} className="text-slate-100" full={expanded} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveTreemap({ rows, expanded = false }) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const cleanRows = rows
    .map(([label, value]) => ({ label, value: Number(value) || 0 }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
  if (!cleanRows.length) return <EmptyLive />;
  const total = cleanRows.reduce((sum, row) => sum + row.value, 0);
  const rects = squarifyTreemap(cleanRows.map((row) => ({ ...row, area: (row.value / total) * 10000 })));
  const colors = ['#facc15', '#22c55e', '#38bdf8', '#f472b6', '#a78bfa', '#fb923c', '#14b8a6', '#ef4444'];
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Area: domain</span>
        <span>Size: count</span>
      </div>
      <div className="relative">
        <div className={`relative overflow-hidden rounded-md border border-white/15 bg-white/5 p-1 ${expanded ? 'h-[min(70vh,720px)]' : 'h-72'}`}>
          {rects.map((row, index) => (
            <TreemapCell
              key={`${row.label}-${index}`}
              row={row}
              color={colors[index % colors.length]}
              expanded={expanded}
              onHover={setHoveredCell}
              onLeave={() => setHoveredCell(null)}
            />
          ))}
        </div>
        {hoveredCell ? <TreemapTooltip cell={hoveredCell} /> : null}
      </div>
    </div>
  );
}

function TreemapCell({ row, color, expanded, onHover, onLeave }) {
  const showLabel = expanded || (row.w >= 10 && row.h >= 7);
  const labelStyle = expanded
    ? undefined
    : {
        display: '-webkit-box',
        WebkitLineClamp: row.h >= 18 ? 3 : 2,
        WebkitBoxOrient: 'vertical',
      };
  return (
    <div
      className="absolute p-0.5"
      style={{ left: `${row.x}%`, top: `${row.y}%`, width: `${row.w}%`, height: `${row.h}%` }}
    >
      <span
        role="img"
        aria-label={`${row.label}: ${row.value}`}
        onMouseEnter={() => onHover(row)}
        onMouseLeave={onLeave}
        className={`flex h-full w-full cursor-help overflow-hidden rounded-sm border border-slate-950/20 text-slate-950 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-white/80 ${showLabel ? 'flex-col justify-between px-2 py-1' : 'items-center justify-center'}`}
        style={{ backgroundColor: color }}
      >
        {showLabel ? (
          <>
            <span className={`block min-w-0 overflow-hidden font-black leading-tight ${expanded ? 'whitespace-normal break-words text-sm' : 'text-[10px]'}`} style={labelStyle}>{row.label}</span>
            <span className={`w-fit shrink-0 rounded bg-slate-950/15 px-1.5 py-0.5 font-black leading-none ${expanded ? 'text-xs' : 'text-[10px]'}`}>{row.value}</span>
          </>
        ) : null}
      </span>
    </div>
  );
}

function TreemapTooltip({ cell }) {
  const left = Math.min(88, Math.max(12, cell.x + cell.w / 2));
  const showBelow = cell.y < 16;
  const top = showBelow ? cell.y + cell.h : cell.y;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-[90] max-w-[260px] rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold leading-snug text-white shadow-xl ring-1 ring-white/20"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: showBelow ? 'translate(-50%, 8px)' : 'translate(-50%, calc(-100% - 8px))',
      }}
    >
      <span className="block text-sm font-black text-amber-200">{cell.value}</span>
    </div>
  );
}

function squarifyTreemap(items) {
  return binaryTreemap(items, { x: 0, y: 0, w: 100, h: 100 });
}

function binaryTreemap(items, bounds) {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], ...bounds }];
  const total = items.reduce((value, item) => value + item.area, 0);
  let running = 0;
  let splitIndex = 1;
  let bestDistance = Infinity;
  for (let index = 1; index < items.length; index += 1) {
    running += items[index - 1].area;
    const distance = Math.abs(total / 2 - running);
    if (distance < bestDistance) {
      bestDistance = distance;
      splitIndex = index;
    }
  }
  const left = items.slice(0, splitIndex);
  const right = items.slice(splitIndex);
  const leftTotal = left.reduce((value, item) => value + item.area, 0);
  if (bounds.w >= bounds.h) {
    const leftWidth = bounds.w * (leftTotal / total);
    return [
      ...binaryTreemap(left, { x: bounds.x, y: bounds.y, w: leftWidth, h: bounds.h }),
      ...binaryTreemap(right, { x: bounds.x + leftWidth, y: bounds.y, w: bounds.w - leftWidth, h: bounds.h }),
    ];
  }
  const topHeight = bounds.h * (leftTotal / total);
  return [
    ...binaryTreemap(left, { x: bounds.x, y: bounds.y, w: bounds.w, h: topHeight }),
    ...binaryTreemap(right, { x: bounds.x, y: bounds.y + topHeight, w: bounds.w, h: bounds.h - topHeight }),
  ];
}

function LiveBars({ rows, expanded = false }) {
  const topRows = expanded ? rows : rows.slice(0, 5);
  const max = Math.max(1, ...topRows.map(([, value]) => Number(value) || 0));
  if (!topRows.length) return <EmptyLive />;
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: category</span>
        <span>X: count</span>
      </div>
      <div className="space-y-3 border-b border-l border-white/15 pb-2 pl-2">
        {topRows.map(([label, value], index) => (
          <div key={`${label}-${value}`} className={`grid items-center gap-2 text-xs ${expanded ? 'grid-cols-[180px_1fr_44px]' : 'grid-cols-[90px_1fr_34px]'}`}>
            <TruncatedTooltip label={label} className="text-slate-300" full={expanded} />
            <InfoTooltip label={String(value)} side={index === 0 ? 'bottom' : 'top'} className="h-3" block style={{ width: `${Math.max(10, (Number(value) || 0) / max * 100)}%` }}>
              <span className="block h-full w-full rounded bg-amber-300" />
            </InfoTooltip>
            <span className="text-right font-bold text-white">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveHeatmap({ rows, expanded = false }) {
  const topRows = expanded ? rows : rows.slice(0, 25);
  const max = Math.max(1, ...topRows.map((row) => row.count || 0));
  if (!topRows.length) return <EmptyLive />;
  const domains = (expanded ? Array.from(new Set(topRows.map((row) => row.domain))) : Array.from(new Set(topRows.map((row) => row.domain))).slice(0, 5));
  const themes = (expanded ? Array.from(new Set(topRows.map((row) => displayBriefingLabel(row.theme)))) : Array.from(new Set(topRows.map((row) => displayBriefingLabel(row.theme)))).slice(0, 5));
  const countByCell = new Map(topRows.map((row) => [`${row.domain}|${displayBriefingLabel(row.theme)}`, row.count || 0]));
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: affected domain</span>
        <span>X: theme</span>
      </div>
      <div className="grid gap-1 overflow-x-auto" style={{ gridTemplateColumns: `${expanded ? 150 : 76}px repeat(${themes.length}, minmax(${expanded ? 120 : 0}px, 1fr))` }}>
        <div />
        {themes.map((theme) => (
          <TruncatedTooltip key={theme} label={theme} className="justify-center text-center text-[10px] text-slate-400" full={expanded} />
        ))}
        {domains.map((domain, domainIndex) => (
          <Fragment key={domain}>
            <TruncatedTooltip label={domain} className="justify-end pr-1 text-right text-[10px] text-slate-400" full={expanded} />
            {themes.map((theme) => {
              const count = countByCell.get(`${domain}|${theme}`) || 0;
              return (
                <InfoTooltip
                  key={`${domain}-${theme}`}
                  label={String(count)}
                  side={domainIndex === 0 ? 'bottom' : 'top'}
                  className="h-6"
                  block
                >
                  <span
                    className="block h-full w-full rounded border border-white/10 bg-amber-300"
                    style={{ opacity: count ? 0.25 + (count / max) * 0.75 : 0.08 }}
                  />
                </InfoTooltip>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>Color = story count</span>
        <span>Max cell: {max}</span>
      </div>
    </div>
  );
}

function LiveCoOccurrenceMatrix({ rows, themes, expanded = false }) {
  const topPairs = expanded ? rows : rows.slice(0, 25);
  const max = Math.max(1, ...topPairs.map((row) => row.count || 0));
  const labels = Array.from(new Set([
    ...topPairs.flatMap((row) => [displayBriefingLabel(row.source), displayBriefingLabel(row.target)]),
    ...(expanded ? themes || [] : themes.slice(0, 5)).map((row) => displayBriefingLabel(row.theme)),
  ])).slice(0, expanded ? undefined : 5);
  if (!labels.length) return <LiveBars rows={(themes || []).map((row) => [displayBriefingLabel(row.theme), row.count])} expanded={expanded} />;
  const countByPair = new Map(topPairs.flatMap((row) => {
    const source = displayBriefingLabel(row.source);
    const target = displayBriefingLabel(row.target);
    return [[`${source}|${target}`, row.count || 0], [`${target}|${source}`, row.count || 0]];
  }));
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: theme</span>
        <span>X: co-occurring theme</span>
      </div>
      <div className="grid gap-1 overflow-x-auto" style={{ gridTemplateColumns: `${expanded ? 150 : 76}px repeat(${labels.length}, minmax(${expanded ? 120 : 0}px, 1fr))` }}>
        <div />
        {labels.map((label) => <TruncatedTooltip key={label} label={label} className="justify-center text-center text-[10px] text-slate-400" full={expanded} />)}
        {labels.map((source, sourceIndex) => (
          <Fragment key={source}>
            <TruncatedTooltip label={source} className="justify-end pr-1 text-right text-[10px] text-slate-400" full={expanded} />
            {labels.map((target) => {
              const count = source === target ? 0 : countByPair.get(`${source}|${target}`) || 0;
              return (
                <InfoTooltip
                  key={`${source}-${target}`}
                  label={String(count)}
                  side={sourceIndex === 0 ? 'bottom' : 'top'}
                  className="h-6"
                  block
                >
                  <span
                    className="block h-full w-full rounded border border-white/10 bg-amber-300"
                    style={{ opacity: count ? 0.25 + (count / max) * 0.75 : 0.08 }}
                  />
                </InfoTooltip>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>Color = co-occurrence count</span>
        <span>Max pair: {max}</span>
      </div>
    </div>
  );
}

function LiveThemeNetwork({ rows, themes, expanded = false }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const topPairs = expanded ? rows : rows.slice(0, 12);
  const topThemes = (expanded ? themes || [] : (themes || []).slice(0, 4)).map((row) => [displayBriefingLabel(row.theme), row.count]);
  const themeMax = Math.max(1, ...topThemes.map(([, count]) => Number(count) || 0));
  const countByTheme = new Map((themes || []).map((row) => [displayBriefingLabel(row.theme), row.count]));
  const labels = Array.from(new Set([
    ...topPairs.flatMap((row) => [displayBriefingLabel(row.source), displayBriefingLabel(row.target)]),
    ...(expanded ? themes || [] : themes.slice(0, 5)).map((row) => displayBriefingLabel(row.theme)),
  ])).slice(0, expanded ? undefined : 7);
  if (!labels.length) return <LiveBars rows={(themes || []).map((row) => [displayBriefingLabel(row.theme), row.count])} expanded={expanded} />;
  const max = Math.max(1, ...topPairs.map((row) => row.count || 0));
  const nodes = labels.map((label, index) => {
    const angle = (Math.PI * 2 * index) / labels.length - Math.PI / 2;
    return {
      label,
      x: 50 + Math.cos(angle) * 36,
      y: 50 + Math.sin(angle) * 32,
    };
  });
  const nodeByLabel = new Map(nodes.map((node) => [node.label, node]));
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Bars: theme count</span>
        <span>Network: co-occurrence</span>
      </div>
      {topThemes.length ? (
        <div className="mb-3 space-y-1.5 border-b border-white/15 pb-3">
          {topThemes.map(([label, count], index) => (
            <div key={label} className={`grid items-center gap-2 text-[10px] ${expanded ? 'grid-cols-[180px_1fr_34px]' : 'grid-cols-[86px_1fr_28px]'}`}>
              <TruncatedTooltip label={label} className="text-slate-300" full={expanded} />
              <InfoTooltip label={String(count)} side={index === 0 ? 'bottom' : 'top'} className="h-2" block style={{ width: `${Math.max(8, (Number(count) || 0) / themeMax * 100)}%` }}>
                <span className="block h-full w-full rounded bg-amber-300" />
              </InfoTooltip>
              <span className="text-right font-bold text-white">{count}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="relative">
        <svg aria-label="Theme co-occurrence network" className={`${expanded ? 'h-80' : 'h-52'} w-full rounded-md border border-white/15 bg-white/5`} viewBox="0 0 100 100">
          {topPairs.map((row) => {
            const source = nodeByLabel.get(displayBriefingLabel(row.source));
            const target = nodeByLabel.get(displayBriefingLabel(row.target));
            if (!source || !target) return null;
            return (
              <line
                key={`${row.source}-${row.target}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#facc15"
                strokeOpacity={0.25 + ((row.count || 0) / max) * 0.55}
                strokeWidth={0.8 + ((row.count || 0) / max) * 2.8}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {nodes.map((node) => (
            <g key={node.label} onMouseEnter={() => setHoveredNode({ ...node, count: countByTheme.get(node.label) })} onMouseLeave={() => setHoveredNode(null)}>
              <circle cx={node.x} cy={node.y} r="5" fill="#fde047" stroke="#020617" strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="cursor-help" />
              <text x={node.x} y={node.y + 10} textAnchor="middle" className={`${expanded ? 'text-[3.3px]' : 'text-[4px]'} fill-slate-200 font-bold`}>
                {expanded ? node.label : node.label.length > 13 ? `${node.label.slice(0, 12)}...` : node.label}
              </text>
            </g>
          ))}
        </svg>
        {hoveredNode ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-[120] -translate-x-1/2 rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-xs font-medium leading-5 text-white shadow-xl"
            style={{ left: `${hoveredNode.x}%`, top: `${Math.min(86, hoveredNode.y + 8)}%` }}
          >
            {hoveredNode.count ?? hoveredNode.label}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LiveSilenceHeatmap({ rows, expanded = false }) {
  const topRows = expanded ? rows : rows.slice(0, 5);
  if (!topRows.length) return <EmptyLive />;
  const columns = [
    ['volumeGap', 'Volume'],
    ['semanticGap', 'Semantic'],
    ['domainGap', 'Domain'],
  ];
  const max = Math.max(1, ...topRows.flatMap((row) => columns.map(([key]) => row.factors?.[key] || 0)));
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: algorithm</span>
        <span>X: silence factor</span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `${expanded ? 180 : 96}px repeat(${columns.length}, minmax(0, 1fr)) 42px` }}>
        <div />
        {columns.map(([, label]) => <div key={label} className="text-center text-[10px] text-slate-400">{label}</div>)}
        <div className="text-center text-[10px] text-slate-400">Priority</div>
        {topRows.map((row, rowIndex) => (
          <Fragment key={row.algorithmId || row.algorithmName}>
            <TruncatedTooltip label={row.algorithmName} className="justify-end pr-1 text-right text-[10px] text-slate-400" full={expanded} />
            {columns.map(([key]) => {
              const value = row.factors?.[key] || 0;
              return (
                <InfoTooltip
                  key={`${row.algorithmName}-${key}`}
                  label={String(value)}
                  side={rowIndex === 0 ? 'bottom' : 'top'}
                  className="h-6"
                  block
                >
                  <span
                    className="block h-full w-full rounded border border-white/10 bg-amber-300"
                    style={{ opacity: value ? 0.25 + (value / max) * 0.75 : 0.08 }}
                  />
                </InfoTooltip>
              );
            })}
            <div className="rounded bg-white/10 px-1 text-center text-[10px] font-bold text-slate-200">{row.priority}</div>
          </Fragment>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Color = gap score from `/api/explore/silence`.</p>
    </div>
  );
}

function LiveCoveragePanel({ coverage, expanded = false }) {
  const rows = [
    ...countRows(coverage?.language).map(([label, value]) => [`Language: ${label}`, value]),
    ...countRows(coverage?.submissionMethod).map(([label, value]) => [`Method: ${label}`, value]),
    ...Object.entries(coverage?.whatsMissing || {}).map(([label, value]) => [`Missing: ${label}`, value]),
  ];
  return <LiveBars rows={expanded ? rows : rows.slice(0, 5)} expanded={expanded} />;
}

function countRows(rows) {
  return Array.isArray(rows) ? rows.map((row) => [row.label, row.count]) : Object.entries(rows || {});
}

function LiveCompareMultiples({ groups, expanded = false }) {
  const topGroups = expanded ? groups : groups.slice(0, 4);
  if (!topGroups.length) return <EmptyLive />;
  const max = Math.max(1, ...topGroups.map((row) => row.total || 0));
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: domain / agency</span>
        <span>X: impact mix</span>
      </div>
      <div className="space-y-3 border-b border-l border-white/15 pb-2 pl-2">
        {topGroups.map((group, groupIndex) => {
          const impacts = Object.fromEntries(countRows(group.impact));
          const positive = impacts.POSITIVE || 0;
          const negative = impacts.NEGATIVE || 0;
          const mixed = impacts.MIXED || 0;
          const unknown = Math.max(0, (group.total || 0) - positive - negative - mixed);
          return (
            <div key={group.label} className={`grid items-center gap-2 text-xs ${expanded ? 'grid-cols-[180px_1fr_44px]' : 'grid-cols-[90px_1fr_34px]'}`}>
              <TruncatedTooltip label={group.label} className="text-slate-300" full={expanded} />
              <div className="flex h-3 rounded bg-white/10" style={{ width: `${Math.max(10, (group.total || 0) / max * 100)}%` }}>
                <InfoTooltip label={String(positive)} side={groupIndex === 0 ? 'bottom' : 'top'} className="h-full" block style={{ width: `${positive / Math.max(1, group.total || 0) * 100}%` }}><span className="block h-full w-full bg-emerald-300" /></InfoTooltip>
                <InfoTooltip label={String(negative)} side={groupIndex === 0 ? 'bottom' : 'top'} className="h-full" block style={{ width: `${negative / Math.max(1, group.total || 0) * 100}%` }}><span className="block h-full w-full bg-rose-300" /></InfoTooltip>
                <InfoTooltip label={String(mixed)} side={groupIndex === 0 ? 'bottom' : 'top'} className="h-full" block style={{ width: `${mixed / Math.max(1, group.total || 0) * 100}%` }}><span className="block h-full w-full bg-amber-300" /></InfoTooltip>
                <InfoTooltip label={String(unknown)} side={groupIndex === 0 ? 'bottom' : 'top'} className="h-full" block style={{ width: `${unknown / Math.max(1, group.total || 0) * 100}%` }}><span className="block h-full w-full bg-slate-300" /></InfoTooltip>
              </div>
              <span className="text-right font-bold text-white">{group.total}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Green positive, red negative, yellow mixed, gray other.</p>
    </div>
  );
}

function LiveTrend({ buckets, expanded = false }) {
  const [hoveredSeries, setHoveredSeries] = useState(null);
  const topBuckets = expanded ? buckets : buckets.slice(-8);
  if (!topBuckets.length) return <EmptyLive />;
  const themeTotals = new Map();
  for (const bucket of topBuckets) {
    for (const [theme, count] of Object.entries(bucket.themes || {})) {
      themeTotals.set(theme, (themeTotals.get(theme) || 0) + count);
    }
  }
  const labels = [...themeTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, expanded ? undefined : 4).map(([label]) => label);
  const series = labels.length ? labels : ['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR'];
  const values = topBuckets.map((bucket, index) => {
    const x = topBuckets.length === 1 ? 50 : 4 + (index / (topBuckets.length - 1)) * 92;
    const rows = series.map((label) => Number((labels.length ? bucket.themes : bucket.impact)?.[label]) || 0);
    const total = rows.reduce((sum, value) => sum + value, 0);
    return { bucket, x, rows, total };
  });
  const maxTotal = Math.max(1, ...values.map((point) => point.total));
  const colors = ['#facc15', '#38bdf8', '#a78bfa', '#fb7185'];
  const paths = series.map((label, seriesIndex) => {
    const top = [];
    const bottom = [];
    let seriesTotal = 0;
    for (const point of values) {
      const scale = 70 / maxTotal;
      const totalHeight = point.total * scale;
      const baseline = 50 - totalHeight / 2;
      const lower = baseline + point.rows.slice(0, seriesIndex).reduce((sum, value) => sum + value * scale, 0);
      const upper = lower + point.rows[seriesIndex] * scale;
      seriesTotal += point.rows[seriesIndex];
      bottom.push([point.x, lower]);
      top.push([point.x, upper]);
    }
    const d = [
      ...top.map(([x, y], index) => `${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`),
      ...bottom.slice().reverse().map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`),
      'Z',
    ].join(' ');
    return { label, d, color: colors[seriesIndex % colors.length], total: seriesTotal };
  });
  const handleTrendHover = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    const point = values.reduce((nearest, candidate) => (
      Math.abs(candidate.x - xPct) < Math.abs(nearest.x - xPct) ? candidate : nearest
    ), values[0]);
    const scale = 70 / maxTotal;
    const totalHeight = point.total * scale;
    const baseline = 50 - totalHeight / 2;
    let lower = baseline;
    for (let index = 0; index < point.rows.length; index += 1) {
      const upper = lower + point.rows[index] * scale;
      if (point.rows[index] > 0 && yPct >= lower && yPct <= upper) {
        setHoveredSeries({ label: displayBriefingLabel(series[index]), total: point.rows[index], x: xPct, y: yPct });
        return;
      }
      lower = upper;
    }
    setHoveredSeries(null);
  };
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: stream</span>
        <span>X: submitted month</span>
      </div>
      <div className="grid grid-cols-[24px_1fr] gap-2">
        <div className="flex flex-col justify-between text-right text-[10px] text-slate-400">
          <span>{maxTotal}</span>
          <span>0</span>
        </div>
        <div>
          <div className={`${expanded ? 'h-64' : 'h-52'} relative border-b border-l border-white/15`}>
            <svg aria-label="Monthly streamgraph" onMouseMove={handleTrendHover} onMouseLeave={() => setHoveredSeries(null)} className="h-full w-full cursor-help overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              <line x1="0" x2="100" y1="50" y2="50" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
              {paths.map((path) => (
                <path
                  key={path.label}
                  d={path.d}
                  fill={path.color}
                  fillOpacity="0.76"
                  stroke="#020617"
                  strokeWidth="0.45"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {hoveredSeries ? (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-[120] -translate-x-1/2 rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-xs font-medium text-white shadow-xl"
                style={{ left: `${hoveredSeries.x}%`, top: `${Math.min(86, hoveredSeries.y + 7)}%` }}
              >
                {hoveredSeries.label}: {hoveredSeries.total}
              </div>
            ) : null}
            {values.map((point) => (
              <span key={point.bucket.month} className="pointer-events-none absolute top-0 h-full border-l border-white/10" style={{ left: `${point.x}%` }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-300">
            {paths.map((path) => <span key={path.label}><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: path.color }} />{displayBriefingLabel(path.label)}</span>)}
          </div>
          <div className="mt-2 grid text-center text-[10px] text-slate-400" style={{ gridTemplateColumns: `repeat(${topBuckets.length}, minmax(0, 1fr))` }}>
            {topBuckets.map((bucket) => (
              <span key={bucket.month}>{bucket.month.slice(5) || bucket.month}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveScatter({ points, expanded = false }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const visible = expanded ? points : points.slice(0, 40);
  if (!visible.length) return <EmptyLive label="No story-level points shown for this lens." />;
  const xs = visible.map((point) => point.umapX);
  const ys = visible.map((point) => point.umapY);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const plottedPoints = visible.map((point) => {
    const left = maxX === minX ? 50 : ((point.umapX - minX) / (maxX - minX)) * 88 + 6;
    const top = maxY === minY ? 50 : ((maxY - point.umapY) / (maxY - minY)) * 72 + 12;
    const tooltip = [
      point.title || 'Story point',
      point.topicLabel ? `Topic: ${point.topicLabel}` : null,
      point.clusterId != null ? `Cluster: ${point.clusterId}` : null,
      point.isOutlier ? 'Outlier story' : 'Clustered story',
      `UMAP: ${Number(point.umapX).toFixed(2)}, ${Number(point.umapY).toFixed(2)}`,
    ].filter(Boolean).join(' | ');
    return { ...point, left, top, tooltip };
  });
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: UMAP-2</span>
        <span>X: UMAP-1</span>
      </div>
      <div className="grid grid-cols-[34px_1fr] gap-2">
        <div className="flex flex-col justify-between text-right text-[10px] text-slate-400">
          <span>{maxY.toFixed(1)}</span>
          <span>{minY.toFixed(1)}</span>
        </div>
        <div>
          <div className={`${expanded ? 'h-96' : 'h-52'} relative rounded-md border border-white/15 bg-white/5`}>
            {plottedPoints.map((point) => (
              <button
                key={point.id}
                type="button"
                aria-label={point.tooltip}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                className={`${expanded ? 'h-4 w-4' : 'h-3 w-3'} absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none ring-offset-2 ring-offset-slate-950 focus-visible:ring-2 focus-visible:ring-yellow-400 ${point.isOutlier ? 'bg-white' : 'bg-amber-300'}`}
                style={{ left: `${point.left}%`, top: `${point.top}%` }}
              />
            ))}
            {hoveredPoint ? (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-[120] max-w-[280px] -translate-x-1/2 rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-xs font-medium leading-5 text-white shadow-xl"
                style={{ left: `${hoveredPoint.left}%`, top: `${Math.max(3, hoveredPoint.top - 10)}%` }}
              >
                {hoveredPoint.tooltip}
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>{minX.toFixed(1)}</span>
            <span>{maxX.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-3 text-[10px] text-slate-400">
        <span><span className="inline-block h-2 w-2 rounded-full bg-amber-300" /> clustered story</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-white" /> outlier</span>
      </div>
    </div>
  );
}

function LiveExcerpts({ examples, expanded = false }) {
  const rows = expanded ? examples : examples.slice(0, 2);
  if (!rows.length) return <EmptyLive label="No excerpts shown for this lens." />;
  return (
    <div className="mt-6 space-y-3">
      <MessageSquare className="h-8 w-8 text-amber-300" />
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-white/15 bg-white/10 p-3 text-sm leading-6 text-slate-100">
          <p className="font-semibold text-amber-100">{row.title}</p>
          <p className={`mt-1 text-slate-100 ${expanded ? '' : 'line-clamp-3'}`}>{row.excerpt || row.title}</p>
          {Array.isArray(row.keywords) && row.keywords.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.keywords.slice(0, expanded ? 8 : 4).map((keyword) => (
                <span key={`${row.id}-${keyword}`} className="rounded-full bg-amber-300/15 px-2 py-1 text-[10px] font-semibold text-amber-100">
                  {keyword}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function crossJurisdictionRow(row) {
  return [row.label || row.jurisdiction || row.city || 'Peer benchmark', row.value || row.count || row.summary || 'approved'];
}

function LiveTable({ rows, emptyLabel, expanded = false }) {
  const topRows = expanded ? rows : rows.slice(0, 4);
  if (!topRows.length) return <EmptyLive label={emptyLabel} />;
  return (
    <div className="mt-6 space-y-2">
      {topRows.map(([label, value]) => (
        <div key={`${label}-${value}`} className="grid grid-cols-[1fr_76px] gap-2 text-xs">
          <TruncatedTooltip label={label} className="rounded bg-white/10 px-2 py-2 text-slate-200" full={expanded} />
          <span className="rounded bg-amber-300/90 px-2 py-2 text-center font-bold text-slate-950">{value}</span>
        </div>
      ))}
    </div>
  );
}

function LiveLinks({ organizations, events, expanded = false }) {
  const rows = [
    ...(expanded ? organizations : organizations.slice(0, 2)).map((item) => ({ id: item.id, title: item.name, detail: item.websiteUrl || item.role || 'organization' })),
    ...(expanded ? events : events.slice(0, 2)).map((item) => ({ id: item.id, title: item.title, detail: item.location || 'event' })),
  ];
  if (!rows.length) return <EmptyLive />;
  return (
    <div className="mt-6 space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-slate-100">
          <p className="font-semibold text-amber-100">{row.title}</p>
          <TruncatedTooltip label={row.detail} className="mt-1 text-xs text-slate-300" full={expanded} />
        </div>
      ))}
    </div>
  );
}

function LiveAlgorithmCards({ algorithms, emptyLabel = 'No systems returned.', expanded = false }) {
  const rows = expanded ? algorithms : algorithms.slice(0, 3);
  if (!rows.length) return <EmptyLive label={emptyLabel} />;
  return (
    <div className={`mt-6 grid gap-3 ${expanded ? 'md:grid-cols-2' : ''}`}>
      {rows.map((item) => (
        <div key={item.id} className="rounded-md border border-white/15 bg-white/10 p-3 text-sm text-slate-100">
          <p className="font-semibold text-amber-100">{item.name}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-300">{item.useCase || item.status || 'System card'}</p>
          {Number.isFinite(Number(item.approvedTestimonyCount)) ? <p className="mt-1 text-xs text-slate-300">{item.approvedTestimonyCount} approved stories</p> : null}
        </div>
      ))}
    </div>
  );
}

function TruncatedTooltip({ label, className = '', full = false }) {
  const text = String(label || '');
  if (full) {
    return <span className={`min-w-0 whitespace-normal break-words ${className}`}>{text}</span>;
  }
  return (
    <InfoTooltip label={text} className={`min-w-0 ${className}`} block>
      <span className="block min-w-0 truncate">{text}</span>
    </InfoTooltip>
  );
}

function EmptyLive({ label = 'No live rows for the current filters.' }) {
  return (
    <div className="mt-6 rounded-md border border-white/15 bg-white/10 px-3 py-4 text-sm font-semibold text-slate-200">
      {label}
    </div>
  );
}

function SpecRow({ icon: Icon, label, value }) {
  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[150px_1fr]">
      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </dt>
      <dd className="text-sm leading-6 text-slate-800">{value}</dd>
    </div>
  );
}
