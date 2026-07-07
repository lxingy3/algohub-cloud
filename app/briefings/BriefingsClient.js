'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { BookOpen, Database, FileText, Filter, Landmark, MessageSquare, Search, Users, X } from 'lucide-react';

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

const readingLevels = [
  { id: 'plain', label: 'Plain' },
  { id: 'standard', label: 'Standard' },
  { id: 'detail', label: 'Detailed' },
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
        b('CC2', 'Find systems relevant to you', 'domain filter + cards', 'RECOGNITION', 'algorithms.use_case, location; shared_taxonomy', 'GET /api/explore/landscape?domain=', 'optional sBERT similar systems', 'cards'),
        b('CC3', 'Cross-cutting patterns', 'theme bars / chips', 'SUGGESTED', 'testimonies.ai_themes (corpus)', 'GET /api/explore/cross-cutting-themes', 'multi-label BART-MNLI aggregation; optional BERTopic', 'bars'),
        b('CC4', 'Where harms concentrate', 'domain x theme heatmap', 'INTERPRETATION', 'testimonies.affected_domain, ai_themes; algorithms.use_case', 'GET /api/explore/theme-matrix', 'aggregation of stored themes', 'heatmap'),
        b('CC5', 'Over time', 'streamgraph', 'INTERPRETATION', 'testimonies.submitted_at, ai_themes, ai_impact_classification', 'GET /api/explore/trend?scope=corpus', 'time aggregation', 'trend'),
        b('CC6', "In people's words across systems", 'excerpts', 'ARTICULATION', 'testimonies.narrative_text, ai_summary, cluster_id, is_outlier', 'GET /api/testimonies?scope=corpus', 'spaCy NER; sBERT + HDBSCAN; KeyBERT', 'excerpt'),
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
        b('IC3', 'Silence & coverage map (corpus)', 'silence matrix + coverage', 'PARADATA + ABSENCE', 'algorithms.impact_level, use_case; testimonies.affected_domain, original_language', 'GET /api/explore/silence-map + /coverage', 'rule-based + sBERT across all algorithms', 'heatmap'),
        b('IC4', 'Corpus story map / emergent topics', 'UMAP scatter + topic labels', 'INTERPRETATION', 'testimonies.topic_id, umap_x, umap_y, cluster_id; corpus_topics', 'GET /api/explore/patterns', 'BERTopic + UMAP + HDBSCAN over corpus', 'scatter'),
        b('IC5', 'Compare across domains / agencies', 'small multiples', 'INTERPRETATION', 'algorithms.use_case, agency_name; testimonies.ai_themes, ai_impact_classification', 'GET /api/explore/compare?dimension=', 'aggregation', 'multiples'),
        b('IC6', 'Evidence strength + representation', 'strength bars + distribution', 'HUMILITY', 'testimony counts, ai_confidence_score, ai_themes distribution, is_outlier', 'GET /api/explore/evidence-strength?scope=corpus', 'derived stats; sBERT / HDBSCAN outliers', 'bars'),
        b('IC7', 'Systemic claim-vs-experience', 'table / scatter', 'NOT ADJUDICATED', 'algorithm_claims.*; briefings.claim_vs_experience', 'GET /api/explore/claim-vs-experience?scope=corpus', 'Claude cache; human review before publish', 'table'),
        b('IC8', "In people's words across systems", 'excerpts', 'ARTICULATION', 'testimonies.narrative_text, ai_summary, cluster_id, is_outlier', 'GET /api/testimonies?scope=corpus', 'spaCy NER; sBERT + HDBSCAN; KeyBERT', 'excerpt'),
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
        b('GC3', 'Intent vs. reality across systems', 'ranked divergence + table', 'SDM/PDM GAP', 'algorithm_claims.*; briefings.claim_vs_experience; testimonies.ai_extracted_experiences', 'GET /api/explore/claim-vs-experience?scope=corpus', 'Claude cache + sentence-transformers candidate retrieval', 'table'),
        b('GC4', 'Silence map = accountability gaps', 'ranked silence matrix', 'ABSENCE != SAFETY', 'algorithms.impact_level, use_case; testimonies.affected_domain; briefings.silence_gaps', 'GET /api/explore/silence-map', 'rule-based + sBERT', 'heatmap'),
        b('GC5', 'Compare agencies / domains', 'small multiples / ranked', 'INTERPRETATION', 'algorithms.agency_name, agency_type, use_case; testimonies.ai_themes', 'GET /api/explore/compare?dimension=', 'aggregation', 'multiples'),
        b('GC6', 'Systemic improvement & policy directions', 'theme -> policy table', 'REFERENCE', 'testimonies.ai_themes aggregation + theme_improvement_map.policy_direction', 'GET /api/explore/cross-cutting-themes + map', 'none (reference map)', 'table'),
        b('GC7', 'Procurement policy (all Proposed)', 'proposed list + evidence + terms', 'READ BEFORE PURCHASE', 'algorithms.status, use_case; cross_jurisdiction_insights; shared_taxonomy', 'GET /api/algorithms?status=Proposed + /cross-jurisdiction', 'sBERT similarity; aggregation', 'cards'),
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
        b('C1', 'System explainer - context first', '4-category, 3 levels', 'NORMATIVE', 'algorithms.* + algorithm_claims.*', 'GET /api/algorithms/:slug', 'none for v1; optional reading-level model later', 'cards'),
        b('C2', 'What it decides about you', 'data / system / usage', 'NOVICE-NEED', 'algorithms.data_used, decision_type, use_case', 'GET /api/algorithms/:slug', 'optional KeyBERT tags', 'table'),
        b('C3', 'Impact overview', 'segmented bar', 'INTERPRETATION', 'testimonies.ai_impact_classification, self_reported_impact, ai_confidence_score', 'GET /api/explore/impact', 'zero-shot BART-large-MNLI', 'bars'),
        b('C4', 'Theme profile + co-occurrence', 'chips + matrix', 'SUGGESTED', 'testimonies.ai_themes (JSONB)', 'GET /api/explore/themes', 'multi-label BART-MNLI; optional BERTopic', 'heatmap'),
        b('C5', "In people's words", 'excerpts', 'ARTICULATION', 'testimonies.narrative_text, ai_summary, cluster_id, is_outlier', 'GET /api/testimonies?fields=excerpt', 'spaCy NER; sBERT + HDBSCAN; KeyBERT', 'excerpt'),
        b('C6', 'Recognition - others like me?', 'prevalence + similar stories', 'RECOGNITION', 'testimonies.ai_themes + embeddings', 'GET /api/explore/recognition', 'sentence-transformers kNN', 'network'),
        b('C7', 'Promised vs. reported', 'side-by-side table', 'NOT ADJUDICATED', 'algorithm_claims.*; briefings.claim_vs_experience', 'GET /api/explore/claim-vs-experience', 'Claude cache; human review before publish', 'table'),
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
        b('L2', 'Impact overview', 'segmented bar', 'INTERPRETATION', 'testimonies.ai_impact_classification, self_reported_impact, ai_confidence_score', 'GET /api/explore/impact', 'zero-shot BART-MNLI', 'bars'),
        b('L3', 'Theme profile + co-occurrence', 'chips + matrix', 'SUGGESTED', 'testimonies.ai_themes', 'GET /api/explore/themes', 'multi-label BART-MNLI; optional BERTopic', 'heatmap'),
        b('L4', "In people's words", 'representative + minority excerpts', 'ARTICULATION', 'testimonies.narrative_text, ai_summary, cluster_id, is_outlier', 'GET /api/testimonies?fields=excerpt', 'spaCy NER; sBERT + HDBSCAN; KeyBERT', 'excerpt'),
        b('L5', 'Coverage & silence (prominent)', "ranked + who's missing", 'PARADATA + ABSENCE', 'algorithms.impact_level, use_case; testimonies.affected_domain, original_language, submission_method', 'GET /api/explore/silence + /coverage', 'rule-based + sBERT', 'heatmap'),
        b('L6', 'Evidence strength + representation', 'thin to robust; minority / positive / dissent', 'HUMILITY', 'testimony counts, ai_confidence_score, ai_themes distribution, is_outlier', 'GET /api/explore/evidence-strength', 'derived stats; sBERT / HDBSCAN outliers', 'bars'),
        b('L7', 'Claim vs. experience', 'table', 'NOT ADJUDICATED', 'algorithm_claims.*; briefings.claim_vs_experience', 'GET /api/explore/claim-vs-experience', 'Claude cache; human review before publish', 'table'),
        b('L8', 'Provenance + custody + notes', 'panel + notes', 'PARADATA; NOTES PRIVATE', 'testimonies.* (paradata); briefings.review_status, reviewed_by', 'GET /api/explore/coverage + /api/briefings/:slug', 'none', 'coverage'),
      ],
    },
    government: {
      code: 'G',
      route: '/briefings/[slug]?lens=government',
      title: 'Local Government',
      subtitle: 'One algorithm, shown for government review.',
      blocks: [
        b('G1', 'Justifiability / global explanation', 'rationale + claims', 'GLOBAL EXPLANATION', 'algorithms.* (purpose, decision_type, data_used, agency_*, status); algorithm_claims.*', 'GET /api/algorithms/:slug', 'optional summary model, not connected', 'cards'),
        b('G2', 'Impact dashboard', 'split + trend', 'INTERPRETATION', 'testimonies.ai_impact_classification, submitted_at; algorithms.current_version, year_deployed', 'GET /api/explore/impact + /trend', 'zero-shot BART-MNLI; time aggregation', 'trend'),
        b('G3', 'Theme profile + co-occurrence', 'chips + matrix', 'SUGGESTED', 'testimonies.ai_themes', 'GET /api/explore/themes', 'multi-label BART-MNLI; optional BERTopic', 'heatmap'),
        b('G4', 'Intent vs. reality (SDM vs PDM)', 'table + flag', 'SDM/PDM GAP', 'algorithm_claims.*; briefings.claim_vs_experience; testimonies.ai_extracted_experiences', 'GET /api/explore/claim-vs-experience', 'Claude cache + sentence-transformers candidate retrieval', 'table'),
        b('G5', 'Coverage & silence = accountability gap', 'ranked flags', 'ABSENCE != SAFETY', 'algorithms.impact_level, use_case; testimonies.affected_domain; briefings.silence_gaps', 'GET /api/explore/silence', 'rule-based + sBERT', 'heatmap'),
        b('G6', 'Improvement directions', 'theme -> direction table', 'REFERENCE', 'testimonies.ai_themes aggregation + theme_improvement_map', 'GET /api/explore/themes + static map', 'none (reference map)', 'table'),
        b('G7', 'Procurement / future systems', 'filter Proposed; comparables', 'READ BEFORE PURCHASE', 'algorithms.status, use_case; cross_jurisdiction_insights; shared_taxonomy', 'GET /api/algorithms?status=Proposed + /cross-jurisdiction', 'sBERT similarity; aggregation', 'cards'),
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
  const [readingLevel, setReadingLevel] = useState('standard');
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
    params.set('limit', '6');
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
    const nextReading = params.get('reading');
    const nextLanguage = params.get('language');

    if (lenses.some((item) => item.id === nextLens)) setLens(nextLens);
    if (scopes.some((item) => item.id === nextScope)) setScope(nextScope);
    if (domains.includes(nextDomain)) setDomain(nextDomain);
    if (algorithms.some((item) => item.slug === nextAlgorithm)) setAlgorithm(nextAlgorithm);
    if (readingLevels.some((item) => item.id === nextReading)) setReadingLevel(nextReading);
    if (languageModes.some((item) => item.id === nextLanguage)) setLanguageMode(nextLanguage);
    setParamsReady(true);
  }, [domains]);

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
    params.set('reading', readingLevel);
    params.set('language', languageMode);
    window.history.replaceState(null, '', `/briefings?${params.toString()}`);
  }, [domain, languageMode, lens, paramsReady, readingLevel, scope, selectedVisibleAlgorithm]);

  useEffect(() => {
    if (lens !== 'intermediary') return;
    setPrivateNote(window.localStorage.getItem(privateNotesKey) || '');
  }, [lens, privateNotesKey]);

  const updatePrivateNote = (value) => {
    setPrivateNote(value);
    window.localStorage.setItem(privateNotesKey, value);
  };

  useEffect(() => {
    let cancelled = false;
    setLiveSnapshot(null);
    const getJson = (path, query = liveQuery) => fetch(`${path}${query}`).then((response) => response.json());
    Promise.all([
      getJson('/api/explore/landscape'),
      getJson('/api/explore/impact'),
      getJson('/api/explore/cross-cutting-themes'),
      getJson('/api/explore/patterns'),
      getJson('/api/explore/coverage'),
      getJson('/api/explore/evidence-strength'),
      getJson('/api/explore/silence'),
      getJson('/api/explore/theme-matrix'),
      getJson('/api/explore/trend'),
      getJson('/api/explore/recognition'),
      getJson('/api/explore/compare'),
      getJson('/api/explore/claim-vs-experience'),
      getJson('/api/testimonies', excerptQuery),
      fetch('/api/organizations?role=library&limit=6').then((response) => response.json()),
      fetch('/api/events?limit=6').then((response) => response.json()),
      fetch('/api/algorithms?status=PROPOSED,UNDER_REVIEW&limit=6').then((response) => response.json()),
      fetch(`/api/briefings${briefingQuery}`).then((response) => response.json()),
    ]).then(([landscape, impact, themes, patterns, coverage, evidence, silence, themeMatrix, trend, recognition, compare, claimVsExperience, excerpts, organizations, events, proposedAlgorithms, briefings]) => {
      if (!cancelled) {
        setLiveSnapshot({ landscape, impact, themes, patterns, coverage, evidence, silence, themeMatrix, trend, recognition, compare, claimVsExperience, excerpts, organizations, events, proposedAlgorithms, briefings });
      }
    }).catch(() => {
      if (!cancelled) setLiveSnapshot({ error: true });
    });
    return () => {
      cancelled = true;
    };
  }, [briefingQuery, excerptQuery, liveQuery]);

  const cachedBriefing = liveSnapshot && !liveSnapshot.error ? liveSnapshot.briefings?.items?.[0] : null;

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Briefing Page</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Briefings
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                Choose a lens on the left, then use Overview or Filter by Algorithm. Each section combines reviewed briefing text with live aggregate evidence.
              </p>
              <LiveSnapshot snapshot={liveSnapshot} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-3 gap-2">
                {lenses.map((item) => {
                  const Icon = item.icon;
                  return (
                      <button key={item.id} type="button" onClick={() => setLens(item.id)} className={buttonClass(lens === item.id)}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {scopes.map((item) => (
                  <button key={item.id} type="button" onClick={() => setScope(item.id)} className={buttonClass(scope === item.id)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {scope === 'algorithm' ? (
            <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-4">
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
              <ControlSelect label="Reading level" value={readingLevel} options={readingLevels} onChange={setReadingLevel} />
              <ControlSelect label="Language" value={languageMode} options={languageModes} onChange={setLanguageMode} />
            </div>
          ) : (
            <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
              <label className="text-sm font-semibold text-slate-700">
                Domain
                <select value={domain} onChange={(event) => setDomain(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900">
                  {domains.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <ControlSelect label="Reading level" value={readingLevel} options={readingLevels} onChange={setReadingLevel} />
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
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">Route</span>
              <span className="font-mono">{scope === 'algorithm' ? view.route.replace('[slug]', selectedAlgorithm.slug) : view.route}</span>
            </div>
          </div>
        </div>

        <NarrativePanel briefing={cachedBriefing} scope={scope} lens={lens} />

        <div className="space-y-5">
          {view.blocks.map((block) => (
            <BriefingBlock
              key={block.code}
              block={block}
              snapshot={liveSnapshot}
              readingLevel={readingLevel}
              privateNote={privateNote}
              onPrivateNoteChange={updatePrivateNote}
              onOpenEvidence={() => setActiveEvidenceBlock(block)}
              showPrivateNotes={lens === 'intermediary' && block.framing.includes('NOTES PRIVATE')}
            />
          ))}
        </div>
        <EvidenceDrawer block={activeEvidenceBlock} snapshot={liveSnapshot} lens={lens} onClose={() => setActiveEvidenceBlock(null)} />
      </section>
    </>
  );
}

function LiveSnapshot({ snapshot }) {
  if (!snapshot) {
    return <div className="mt-5 text-sm font-semibold text-slate-500">Loading live corpus snapshot...</div>;
  }
  if (snapshot.error) {
    return <div className="mt-5 text-sm font-semibold text-red-700">Live corpus snapshot is unavailable.</div>;
  }
  const points = snapshot.patterns?.points || [];
  const outliers = points.filter((point) => point.isOutlier).length;
  const stats = [
    ['Approved stories', snapshot.landscape?.totalApprovedStories ?? 0],
    ['Algorithms', snapshot.landscape?.totalAlgorithms ?? 0],
    ['Suggested topics', snapshot.patterns?.topics?.length ?? 0],
    ['Less common stories', outliers],
  ];
  const pipelines = [
    ['Theme matrix', snapshot.themeMatrix?.rows?.length ?? 0],
    ['Trend buckets', snapshot.trend?.buckets?.length ?? 0],
    ['Story excerpts', snapshot.excerpts?.items?.length ?? 0],
    ['Claim rows', snapshot.claimVsExperience?.rows?.length ?? 0],
  ];
  return (
    <div className="mt-5 max-w-5xl">
      <div className="grid gap-2 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <div className="text-xl font-bold text-slate-950">{value}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        {pipelines.map(([label, value]) => (
          <div key={label} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div className="text-lg font-bold text-emerald-900">{value}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buttonClass(active) {
  return active
    ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white'
    : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100';
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

function NarrativePanel({ briefing, scope, lens }) {
  const findings = listJson(briefing?.keyFindings);
  const recommendations = listJson(briefing?.recommendations);
  const claims = listJson(briefing?.claimVsExperience);
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
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
        <div className="grid gap-3">
          <NarrativeList title="Key findings" rows={findings} empty="Pending review." />
          <NarrativeList title="Recommendations" rows={recommendations} empty="Pending review." />
          {claims.length ? <NarrativeList title="Claim vs. experience" rows={claims} empty="" /> : null}
        </div>
      </div>
    </div>
  );
}

function NarrativeList({ title, rows, empty }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-800">
        {(rows.length ? rows : [empty]).filter(Boolean).map((row) => (
          <li key={row}>- {row}</li>
        ))}
      </ul>
    </div>
  );
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

function BriefingBlock({ block, snapshot, readingLevel, privateNote, onPrivateNoteChange, onOpenEvidence, showPrivateNotes }) {
  return (
    <article className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.25fr)]">
      <div className="border-b border-slate-200 bg-slate-950 p-5 text-white lg:border-b-0 lg:border-r">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-3xl font-black tracking-tight text-amber-300">{block.code}</p>
            <h3 className="mt-3 text-xl font-bold leading-tight">{block.title}</h3>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200">{block.visual}</span>
        </div>
        <LiveVisual block={block} snapshot={snapshot} />
      </div>
      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">{block.framing}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Read only</span>
          </div>
          <button type="button" onClick={onOpenEvidence} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50">
            View evidence
          </button>
        </div>
        <dl className="grid gap-3">
          <SpecDetails block={block} readingLevel={readingLevel} />
        </dl>
        <LiveBlockData block={block} snapshot={snapshot} />
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
    </article>
  );
}

function EvidenceDrawer({ block, snapshot, lens, onClose }) {
  if (!block) return null;
  const rows = evidenceRows(block, snapshot, lens);
  const visibleRows = rows.length ? rows : [{ title: 'No rows for the current filters', value: '', detail: 'Try another domain, lens, or algorithm.' }];
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
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
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-3">
            {visibleRows.map((row) => (
              <div key={`${row.title}-${row.value}-${row.detail}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-950">{row.title}</p>
                  {row.value ? <span className="shrink-0 rounded bg-white px-2 py-1 text-xs font-bold text-slate-800">{row.value}</span> : null}
                </div>
                {row.detail ? <p className="mt-2 text-sm leading-6 text-slate-700">{row.detail}</p> : null}
              </div>
            ))}
          </div>
          {lens === 'government' ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              Government view keeps story-level excerpts hidden and shows aggregate evidence only.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function evidenceRows(block, snapshot, lens) {
  if (!snapshot) return [{ title: 'Live evidence loading', value: '', detail: 'The supporting API rows are still loading.' }];
  if (snapshot.error) return [{ title: 'Live evidence unavailable', value: '', detail: 'The page could not load the supporting API rows.' }];
  const api = block.api.toLowerCase();
  if (api.includes('theme-matrix')) return (snapshot.themeMatrix?.rows || []).slice(0, 8).map((row) => ({ title: `${row.domain} / ${displayBriefingLabel(row.theme)}`, value: row.count, detail: 'Approved story count in this domain-theme cell.' }));
  if (api.includes('trend')) return (snapshot.trend?.buckets || []).slice(-8).map((row) => ({ title: row.month, value: row.total, detail: 'Approved stories in this time bucket.' }));
  if (api.includes('patterns')) return (snapshot.patterns?.topics || []).slice(0, 8).map((row) => ({ title: row.label || `Topic ${row.topicId}`, value: row.size, detail: `Suggested corpus topic. Keywords: ${(row.keywords || []).join(', ') || 'none listed'}.` }));
  if (api.includes('claim-vs-experience')) return (snapshot.claimVsExperience?.rows || []).slice(0, 8).map((row) => ({ title: row.algorithmName, value: row.experienceCount, detail: (row.claims || []).map((claim) => claim.text).join(' ') || 'No formal claim text listed.' }));
  if (api.includes('coverage')) return Object.entries(snapshot.coverage?.whatsMissing || {}).map(([title, value]) => ({ title, value, detail: 'Coverage/paradata gap for the current filters.' }));
  if (api.includes('silence')) return (snapshot.silence?.rows || []).slice(0, 8).map((row) => ({ title: row.algorithmName, value: row.priority, detail: `Volume ${row.factors?.volumeGap ?? 0}; semantic ${row.factors?.semanticGap ?? 0}; domain ${row.factors?.domainGap ?? 0}.` }));
  if (api.includes('testimonies') || api.includes('recognition')) {
    if (lens === 'government') return [{ title: 'Aggregate-only lens', value: '', detail: 'Story rows are intentionally suppressed for government users.' }];
    const rows = api.includes('recognition') ? snapshot.recognition?.examples : snapshot.excerpts?.items;
    return (rows || []).slice(0, 8).map((row) => ({ title: row.title, value: row.impact || row.matchBasis || row.whyShown, detail: row.excerpt || row.whyShown }));
  }
  if (api.includes('evidence-strength')) return (snapshot.evidence?.findings || []).slice(0, 8).map((row) => ({ title: row.label, value: row.strength, detail: `${row.count} stories; minority ${row.representation?.minorityCount || 0}; dissent ${row.representation?.dissentCount || 0}.` }));
  if (api.includes('compare')) return (snapshot.compare?.groups || []).slice(0, 8).map((row) => {
    const impacts = Object.fromEntries(countRows(row.impact));
    return { title: row.label, value: row.total, detail: `Positive ${impacts.POSITIVE || 0}; negative ${impacts.NEGATIVE || 0}; mixed ${impacts.MIXED || 0}.` };
  });
  if (api.includes('impact')) return (snapshot.impact?.aiSuggested || []).map((row) => ({ title: row.label, value: row.count, detail: 'AI-suggested impact classification count.' }));
  if (api.includes('themes') || api.includes('cross-cutting-themes')) return (snapshot.themes?.themes || []).slice(0, 8).map((row) => ({ title: displayBriefingLabel(row.theme), value: row.count, detail: row.policyDirection || row.improvementDirection || 'Suggested theme from approved stories.' }));
  if (api.includes('organizations') || api.includes('events')) return [
    ...(snapshot.organizations?.items || []).map((row) => ({ title: row.name, value: row.role, detail: row.websiteUrl || 'Library/community resource.' })),
    ...(snapshot.events?.items || []).map((row) => ({ title: row.title, value: row.location, detail: row.startsAt || 'Community event.' })),
  ].slice(0, 8);
  if (api.includes('status=proposed')) return (snapshot.proposedAlgorithms?.items || []).slice(0, 8).map((row) => ({ title: row.name, value: row.status, detail: row.useCase || row.agencyName }));
  return (snapshot.landscape?.byDomain || []).slice(0, 8).map((row) => ({ title: row.label, value: row.count, detail: 'Algorithms grouped by domain.' }));
}

function SpecDetails({ block, readingLevel }) {
  if (readingLevel === 'plain') {
    return <SpecRow icon={Database} label="Uses" value="Approved stories, algorithm records, and review metadata." />;
  }
  return (
    <>
      <SpecRow icon={Database} label="Database" value={block.db} />
      <SpecRow icon={Search} label="API endpoint" value={block.api} />
      {readingLevel === 'detail' ? <SpecRow icon={Filter} label="ML / NLP method" value={block.ml} /> : null}
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

function LiveVisual({ block, snapshot }) {
  if (!snapshot) return <EmptyLive label="Loading live data for this chart..." />;
  if (snapshot.error) return <EmptyLive label="Live chart data is unavailable." />;
  const api = block.api.toLowerCase();
  if (api.includes('theme-matrix')) return <LiveHeatmap rows={snapshot.themeMatrix?.rows || []} />;
  if (api.includes('trend')) return <LiveTrend buckets={snapshot.trend?.buckets || []} />;
  if (api.includes('testimonies')) return <LiveExcerpts examples={snapshot.excerpts?.items || []} />;
  if (api.includes('recognition')) return <LiveExcerpts examples={snapshot.recognition?.examples || []} />;
  if (api.includes('claim-vs-experience')) return <LiveTable rows={(snapshot.claimVsExperience?.rows || []).map((row) => [row.algorithmName, row.experienceCount])} />;
  if (api.includes('patterns')) return <LiveScatter points={snapshot.patterns?.points || []} />;
  if (api.includes('silence')) return <LiveSilenceHeatmap rows={snapshot.silence?.rows || []} />;
  if (api.includes('coverage')) return <LiveCoveragePanel coverage={snapshot.coverage} />;
  if (api.includes('organizations') || api.includes('events')) return <LiveLinks organizations={snapshot.organizations?.items || []} events={snapshot.events?.items || []} />;
  if (api.includes('status=proposed')) return <LiveAlgorithmCards algorithms={snapshot.proposedAlgorithms?.items || []} />;
  if (api.includes('evidence-strength')) return <LiveBars rows={(snapshot.evidence?.findings || []).map((row) => [row.label, row.count])} />;
  if (api.includes('compare')) return <LiveCompareMultiples groups={snapshot.compare?.groups || []} />;
  if (api.includes('impact')) return <LiveBars rows={(snapshot.impact?.aiSuggested || []).map((row) => [row.label, row.count])} />;
  if (api.includes('themes') || api.includes('cross-cutting-themes')) {
    if (block.visualType === 'heatmap' || block.visualType === 'network') return <LiveCoOccurrenceMatrix rows={snapshot.themes?.coOccurrences || []} themes={snapshot.themes?.themes || []} />;
    return <LiveBars rows={(snapshot.themes?.themes || []).map((row) => [displayBriefingLabel(row.theme), row.count])} />;
  }
  if (api.includes('landscape') || api.includes('algorithms')) return <LiveBars rows={(snapshot.landscape?.byDomain || []).map((row) => [row.label, row.count])} />;
  return <EmptyLive label="No live chart data returned for this block." />;
}

function LiveBars({ rows }) {
  const topRows = rows.slice(0, 5);
  const max = Math.max(1, ...topRows.map(([, value]) => Number(value) || 0));
  if (!topRows.length) return <EmptyLive />;
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: category</span>
        <span>X: count</span>
      </div>
      <div className="space-y-3 border-b border-l border-white/15 pb-2 pl-2">
        {topRows.map(([label, value]) => (
          <div key={`${label}-${value}`} className="grid grid-cols-[90px_1fr_34px] items-center gap-2 text-xs">
            <span className="truncate text-slate-300">{label}</span>
            <span className="h-3 rounded bg-amber-300" style={{ width: `${Math.max(10, (Number(value) || 0) / max * 100)}%` }} />
            <span className="text-right font-bold text-white">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveHeatmap({ rows }) {
  const topRows = rows.slice(0, 25);
  const max = Math.max(1, ...topRows.map((row) => row.count || 0));
  if (!topRows.length) return <EmptyLive />;
  const domains = Array.from(new Set(topRows.map((row) => row.domain))).slice(0, 5);
  const themes = Array.from(new Set(topRows.map((row) => displayBriefingLabel(row.theme)))).slice(0, 5);
  const countByCell = new Map(topRows.map((row) => [`${row.domain}|${displayBriefingLabel(row.theme)}`, row.count || 0]));
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: affected domain</span>
        <span>X: theme</span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `76px repeat(${themes.length}, minmax(0, 1fr))` }}>
        <div />
        {themes.map((theme) => (
          <div key={theme} title={theme} className="truncate text-center text-[10px] text-slate-400">{theme}</div>
        ))}
        {domains.map((domain) => (
          <Fragment key={domain}>
            <div title={domain} className="truncate pr-1 text-right text-[10px] text-slate-400">{domain}</div>
            {themes.map((theme) => {
              const count = countByCell.get(`${domain}|${theme}`) || 0;
              return (
                <div
                  key={`${domain}-${theme}`}
                  title={`${domain} / ${theme}: ${count}`}
                  className="h-6 rounded border border-white/10 bg-amber-300"
                  style={{ opacity: count ? 0.25 + (count / max) * 0.75 : 0.08 }}
                />
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

function LiveCoOccurrenceMatrix({ rows, themes }) {
  const topPairs = rows.slice(0, 25);
  const max = Math.max(1, ...topPairs.map((row) => row.count || 0));
  const labels = Array.from(new Set([
    ...topPairs.flatMap((row) => [displayBriefingLabel(row.source), displayBriefingLabel(row.target)]),
    ...themes.slice(0, 5).map((row) => displayBriefingLabel(row.theme)),
  ])).slice(0, 5);
  if (!labels.length) return <LiveBars rows={(themes || []).map((row) => [displayBriefingLabel(row.theme), row.count])} />;
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
      <div className="grid gap-1" style={{ gridTemplateColumns: `76px repeat(${labels.length}, minmax(0, 1fr))` }}>
        <div />
        {labels.map((label) => <div key={label} title={label} className="truncate text-center text-[10px] text-slate-400">{label}</div>)}
        {labels.map((source) => (
          <Fragment key={source}>
            <div title={source} className="truncate pr-1 text-right text-[10px] text-slate-400">{source}</div>
            {labels.map((target) => {
              const count = source === target ? 0 : countByPair.get(`${source}|${target}`) || 0;
              return (
                <div
                  key={`${source}-${target}`}
                  title={`${source} + ${target}: ${count}`}
                  className="h-6 rounded border border-white/10 bg-amber-300"
                  style={{ opacity: count ? 0.25 + (count / max) * 0.75 : 0.08 }}
                />
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

function LiveSilenceHeatmap({ rows }) {
  const topRows = rows.slice(0, 5);
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
      <div className="grid gap-1" style={{ gridTemplateColumns: `96px repeat(${columns.length}, minmax(0, 1fr)) 42px` }}>
        <div />
        {columns.map(([, label]) => <div key={label} className="text-center text-[10px] text-slate-400">{label}</div>)}
        <div className="text-center text-[10px] text-slate-400">Priority</div>
        {topRows.map((row) => (
          <Fragment key={row.algorithmId || row.algorithmName}>
            <div title={row.algorithmName} className="truncate pr-1 text-right text-[10px] text-slate-400">{row.algorithmName}</div>
            {columns.map(([key, label]) => {
              const value = row.factors?.[key] || 0;
              return (
                <div
                  key={`${row.algorithmName}-${key}`}
                  title={`${row.algorithmName} / ${label}: ${value}`}
                  className="h-6 rounded border border-white/10 bg-amber-300"
                  style={{ opacity: value ? 0.25 + (value / max) * 0.75 : 0.08 }}
                />
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

function LiveCoveragePanel({ coverage }) {
  const rows = [
    ...countRows(coverage?.language).map(([label, value]) => [`Language: ${label}`, value]),
    ...countRows(coverage?.submissionMethod).map(([label, value]) => [`Method: ${label}`, value]),
    ...Object.entries(coverage?.whatsMissing || {}).map(([label, value]) => [`Missing: ${label}`, value]),
  ].slice(0, 5);
  return <LiveBars rows={rows} />;
}

function countRows(rows) {
  return Array.isArray(rows) ? rows.map((row) => [row.label, row.count]) : Object.entries(rows || {});
}

function LiveCompareMultiples({ groups }) {
  const topGroups = groups.slice(0, 4);
  if (!topGroups.length) return <EmptyLive />;
  const max = Math.max(1, ...topGroups.map((row) => row.total || 0));
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: domain / agency</span>
        <span>X: impact mix</span>
      </div>
      <div className="space-y-3 border-b border-l border-white/15 pb-2 pl-2">
        {topGroups.map((group) => {
          const impacts = Object.fromEntries(countRows(group.impact));
          const positive = impacts.POSITIVE || 0;
          const negative = impacts.NEGATIVE || 0;
          const mixed = impacts.MIXED || 0;
          const unknown = Math.max(0, (group.total || 0) - positive - negative - mixed);
          return (
            <div key={group.label} className="grid grid-cols-[90px_1fr_34px] items-center gap-2 text-xs">
              <span title={group.label} className="truncate text-slate-300">{group.label}</span>
              <div className="flex h-3 overflow-hidden rounded bg-white/10" style={{ width: `${Math.max(10, (group.total || 0) / max * 100)}%` }}>
                <span title={`Positive: ${positive}`} className="bg-emerald-300" style={{ width: `${positive / Math.max(1, group.total || 0) * 100}%` }} />
                <span title={`Negative: ${negative}`} className="bg-rose-300" style={{ width: `${negative / Math.max(1, group.total || 0) * 100}%` }} />
                <span title={`Mixed: ${mixed}`} className="bg-amber-300" style={{ width: `${mixed / Math.max(1, group.total || 0) * 100}%` }} />
                <span title={`Other: ${unknown}`} className="bg-slate-300" style={{ width: `${unknown / Math.max(1, group.total || 0) * 100}%` }} />
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

function LiveTrend({ buckets }) {
  const topBuckets = buckets.slice(-8);
  const max = Math.max(1, ...topBuckets.map((bucket) => bucket.total || 0));
  if (!topBuckets.length) return <EmptyLive />;
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        <span>Y: story count</span>
        <span>X: submitted month</span>
      </div>
      <div className="grid grid-cols-[24px_1fr] gap-2">
        <div className="flex flex-col justify-between text-right text-[10px] text-slate-400">
          <span>{max}</span>
          <span>0</span>
        </div>
        <div className="flex h-32 items-end gap-2 border-b border-l border-white/15 pl-2">
          {topBuckets.map((bucket) => (
            <div key={bucket.month} className="flex w-full flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-bold text-slate-200">{bucket.total}</span>
              <div className="w-full rounded-t bg-amber-300" style={{ height: `${Math.max(8, (bucket.total || 0) / max * 100)}%` }} />
              <span className="text-[10px] text-slate-400">{bucket.month.slice(5) || bucket.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveScatter({ points }) {
  const visible = points.slice(0, 40);
  if (!visible.length) return <EmptyLive label="No story-level points shown for this lens." />;
  const xs = visible.map((point) => point.umapX);
  const ys = visible.map((point) => point.umapY);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
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
          <div className="relative h-36 rounded-md border border-white/15 bg-white/5">
            {visible.map((point) => {
              const left = maxX === minX ? 50 : ((point.umapX - minX) / (maxX - minX)) * 88 + 6;
              const top = maxY === minY ? 50 : ((maxY - point.umapY) / (maxY - minY)) * 72 + 12;
              return (
                <span
                  key={point.id}
                  title={`${point.title || point.topicLabel || 'story'} (${point.umapX?.toFixed?.(2)}, ${point.umapY?.toFixed?.(2)})`}
                  className={`absolute h-3 w-3 rounded-full ${point.isOutlier ? 'bg-white' : 'bg-amber-300'}`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                />
              );
            })}
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

function LiveExcerpts({ examples }) {
  const rows = examples.slice(0, 2);
  if (!rows.length) return <EmptyLive label="No excerpts shown for this lens." />;
  return (
    <div className="mt-6 space-y-3">
      <MessageSquare className="h-8 w-8 text-amber-300" />
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-white/15 bg-white/10 p-3 text-sm leading-6 text-slate-100">
          <p className="font-semibold text-amber-100">{row.title}</p>
          <p className="mt-1 line-clamp-3 text-slate-100">{row.excerpt || row.title}</p>
        </div>
      ))}
    </div>
  );
}

function LiveTable({ rows }) {
  const topRows = rows.slice(0, 4);
  if (!topRows.length) return <EmptyLive />;
  return (
    <div className="mt-6 space-y-2">
      {topRows.map(([label, value]) => (
        <div key={`${label}-${value}`} className="grid grid-cols-[1fr_76px] gap-2 text-xs">
          <div className="truncate rounded bg-white/10 px-2 py-2 text-slate-200">{label}</div>
          <div className="rounded bg-amber-300/90 px-2 py-2 text-center font-bold text-slate-950">{value}</div>
        </div>
      ))}
    </div>
  );
}

function LiveLinks({ organizations, events }) {
  const rows = [
    ...organizations.slice(0, 2).map((item) => ({ id: item.id, title: item.name, detail: item.websiteUrl || item.role || 'organization' })),
    ...events.slice(0, 2).map((item) => ({ id: item.id, title: item.title, detail: item.location || 'event' })),
  ];
  if (!rows.length) return <EmptyLive />;
  return (
    <div className="mt-6 space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-slate-100">
          <p className="font-semibold text-amber-100">{row.title}</p>
          <p className="mt-1 truncate text-xs text-slate-300">{row.detail}</p>
        </div>
      ))}
    </div>
  );
}

function LiveAlgorithmCards({ algorithms }) {
  const rows = algorithms.slice(0, 3);
  if (!rows.length) return <EmptyLive label="No proposed systems returned." />;
  return (
    <div className="mt-6 grid gap-3">
      {rows.map((item) => (
        <div key={item.id} className="rounded-md border border-white/15 bg-white/10 p-3 text-sm text-slate-100">
          <p className="font-semibold text-amber-100">{item.name}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-300">{item.status}</p>
        </div>
      ))}
    </div>
  );
}

function LiveBlockData({ block, snapshot }) {
  if (!snapshot || snapshot.error) return null;
  const api = block.api.toLowerCase();
  const titleClass = 'text-xs font-bold uppercase tracking-wide text-emerald-700';
  const boxClass = 'mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3';

  if (api.includes('theme-matrix')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live theme matrix" rows={(snapshot.themeMatrix?.rows || []).slice(0, 4).map((row) => [`${row.domain} / ${displayBriefingLabel(row.theme)}`, row.count])} />;
  }
  if (api.includes('trend')) {
    const bucketRows = (snapshot.trend?.buckets || []).slice(-2).map((row) => [row.month, row.total]);
    const markerRows = (snapshot.trend?.markers || []).slice(0, 2).map((row) => [row.algorithmName, row.currentVersion || row.yearDeployed || 'marker']);
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live trend markers" rows={[...bucketRows, ...markerRows]} />;
  }
  if (api.includes('recognition')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live similar-story examples" rows={(snapshot.recognition?.examples || []).slice(0, 3).map((row) => [row.title, row.isLessCommonExperience ? 'less common' : 'representative'])} />;
  }
  if (api.includes('testimonies')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live story excerpts" rows={(snapshot.excerpts?.items || []).slice(0, 3).map((row) => [row.title, row.whyShown])} />;
  }
  if (api.includes('claim-vs-experience')) {
    const rows = [
      ...(snapshot.claimVsExperience?.reviewStatus ? [['Review status', snapshot.claimVsExperience.reviewStatus]] : []),
      ...(snapshot.claimVsExperience?.rows || []).slice(0, 3).map((row) => [row.algorithmName, row.experienceCount]),
    ];
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live claim rows" rows={rows} />;
  }
  if (api.includes('patterns')) {
    const rows = [
      ...((snapshot.patterns?.notes || []).slice(0, 1).map((note) => ['Note', note])),
      ...(snapshot.patterns?.topics || []).slice(0, 4).map((row) => [row.label || `Topic ${row.topicId}`, row.size]),
    ];
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live suggested topics" rows={rows} />;
  }
  if (api.includes('coverage')) {
    const missing = snapshot.coverage?.whatsMissing || {};
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live coverage gaps" rows={Object.entries(missing).slice(0, 4)} />;
  }
  if (api.includes('silence')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live silence review" rows={(snapshot.silence?.rows || []).slice(0, 4).map((row) => [
      row.algorithmName,
      `${row.priority}; vol ${row.factors?.volumeGap ?? 0}, sem ${row.factors?.semanticGap ?? 0}, dom ${row.factors?.domainGap ?? 0}`,
    ])} />;
  }
  if (api.includes('status=proposed')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live proposed systems" rows={(snapshot.proposedAlgorithms?.items || []).slice(0, 4).map((row) => [row.name, row.status])} />;
  }
  if (api.includes('organizations') || api.includes('events')) {
    const orgRows = (snapshot.organizations?.items || []).slice(0, 2).map((row) => [row.name, row.role || 'organization']);
    const eventRows = (snapshot.events?.items || []).slice(0, 2).map((row) => [row.title, row.location || 'event']);
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live help links" rows={[...orgRows, ...eventRows]} />;
  }
  if (api.includes('evidence-strength')) {
    const evidenceRows = (snapshot.evidence?.findings || []).slice(0, 3).map((row) => [
      row.label,
      `${row.strength}; positive ${row.representation?.positiveCount || 0}, minority ${row.representation?.minorityCount || 0}, dissent ${row.representation?.dissentCount || 0}`,
    ]);
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live evidence strength" rows={evidenceRows} />;
  }
  if (api.includes('compare')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live comparison" rows={(snapshot.compare?.groups || []).slice(0, 4).map((row) => [row.label, row.total])} />;
  }
  if (api.includes('impact')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live impact split" rows={(snapshot.impact?.aiSuggested || []).slice(0, 4).map((row) => [row.label, row.count])} />;
  }
  if (block.title.toLowerCase().includes('improvement') || block.title.toLowerCase().includes('policy direction')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live improvement map" rows={(snapshot.themes?.themes || []).slice(0, 4).map((row) => [displayBriefingLabel(row.theme), row.policyDirection || row.improvementDirection || 'needs mapping'])} />;
  }
  if (block.title.toLowerCase().includes('co-occurrence')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live co-occurrence" rows={(snapshot.themes?.coOccurrences || []).slice(0, 4).map((row) => [`${displayBriefingLabel(row.source)} + ${displayBriefingLabel(row.target)}`, row.count])} />;
  }
  if (api.includes('themes') || api.includes('cross-cutting-themes')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live suggested themes" rows={(snapshot.themes?.themes || []).slice(0, 4).map((row) => [displayBriefingLabel(row.theme), row.count])} />;
  }
  if (api.includes('landscape') || api.includes('algorithms')) {
    return <MiniRows className={boxClass} titleClass={titleClass} title="Live landscape" rows={(snapshot.landscape?.byDomain || []).slice(0, 4).map((row) => [row.label, row.count])} />;
  }
  return null;
}

function MiniRows({ className, titleClass, title, rows }) {
  if (!rows?.length) return null;
  return (
    <div className={className}>
      <p className={titleClass}>{title}</p>
      <div className="mt-2 grid gap-2">
        {rows.map(([label, value]) => (
          <div key={`${label}-${value}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-800">{label}</span>
            <span className="shrink-0 rounded bg-white px-2 py-1 text-xs font-bold text-slate-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
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
