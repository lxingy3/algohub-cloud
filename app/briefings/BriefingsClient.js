'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Database, FileText, Filter, Landmark, MessageSquare, Search, Users } from 'lucide-react';

const lenses = [
  { id: 'community', label: 'Community', short: 'Community Members', icon: Users },
  { id: 'intermediary', label: 'Library', short: 'Libraries / Intermediaries', icon: BookOpen },
  { id: 'government', label: 'Government', short: 'Local Government', icon: Landmark },
];

const scopes = [
  { id: 'overview', label: 'Overview' },
  { id: 'algorithm', label: 'Filter by Algorithm' },
];

const algorithms = [
  { slug: 'allegheny-family-screening-tool', name: 'Allegheny Family Screening Tool', domain: 'Child Welfare' },
  { slug: 'housing-allocation-algorithm', name: 'Housing Allocation Algorithm', domain: 'Housing Services' },
  { slug: 'job-matching-algorithm', name: 'Job Matching Algorithm', domain: 'Jobs & Employment' },
  { slug: 'student-risk-assessment', name: 'Student Risk Assessment', domain: 'Student Services' },
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
        b('IC7', 'Systemic claim-vs-experience', 'table / scatter', 'NOT ADJUDICATED', 'algorithm_claims.*; briefings.claim_vs_experience', 'GET /api/explore/claim-vs-experience?scope=corpus', 'model choice pending; human review before publish', 'table'),
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
        b('GC3', 'Intent vs. reality across systems', 'ranked divergence + table', 'SDM/PDM GAP', 'algorithm_claims.*; briefings.claim_vs_experience; testimonies.ai_extracted_experiences', 'GET /api/explore/claim-vs-experience?scope=corpus', 'model choice pending; sentence-transformers candidate retrieval', 'table'),
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
        b('C7', 'Promised vs. reported', 'side-by-side table', 'NOT ADJUDICATED', 'algorithm_claims.*; briefings.claim_vs_experience', 'GET /api/explore/claim-vs-experience', 'model choice pending; human review before publish', 'table'),
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
        b('L7', 'Claim vs. experience', 'table', 'NOT ADJUDICATED', 'algorithm_claims.*; briefings.claim_vs_experience', 'GET /api/explore/claim-vs-experience', 'model choice pending; human review before publish', 'table'),
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
        b('G4', 'Intent vs. reality (SDM vs PDM)', 'table + flag', 'SDM/PDM GAP', 'algorithm_claims.*; briefings.claim_vs_experience; testimonies.ai_extracted_experiences', 'GET /api/explore/claim-vs-experience', 'model choice pending; sentence-transformers candidate retrieval', 'table'),
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
  const [algorithm, setAlgorithm] = useState(algorithms[0].slug);
  const [paramsReady, setParamsReady] = useState(false);
  const view = briefingViews[scope][lens];
  const domains = useMemo(() => ['All domains', ...new Set(algorithms.map((item) => item.domain))], []);
  const visibleAlgorithms = domain === 'All domains' ? algorithms : algorithms.filter((item) => item.domain === domain);
  const selectedVisibleAlgorithm = visibleAlgorithms.some((item) => item.slug === algorithm)
    ? algorithm
    : visibleAlgorithms[0]?.slug || algorithms[0].slug;
  const selectedAlgorithm = algorithms.find((item) => item.slug === selectedVisibleAlgorithm) || algorithms[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextLens = params.get('lens');
    const nextScope = params.get('scope');
    const nextDomain = params.get('domain');
    const nextAlgorithm = params.get('algorithm');

    if (lenses.some((item) => item.id === nextLens)) setLens(nextLens);
    if (scopes.some((item) => item.id === nextScope)) setScope(nextScope);
    if (domains.includes(nextDomain)) setDomain(nextDomain);
    if (algorithms.some((item) => item.slug === nextAlgorithm)) setAlgorithm(nextAlgorithm);
    setParamsReady(true);
  }, [domains]);

  useEffect(() => {
    if (!paramsReady) return;
    const params = new URLSearchParams();
    params.set('lens', lens);
    params.set('scope', scope);
    if (scope === 'algorithm') {
      params.set('domain', domain);
      params.set('algorithm', selectedVisibleAlgorithm);
    }
    window.history.replaceState(null, '', `/briefings?${params.toString()}`);
  }, [domain, lens, paramsReady, scope, selectedVisibleAlgorithm]);

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Briefing Page</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Briefing pages
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                Choose a lens, then choose Overview or Filter by Algorithm. The blocks below follow the current wireframes. Data fields, endpoints, and model methods are listed, but the models are not connected yet.
              </p>
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
            <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
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
            </div>
          ) : null}
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

        <div className="space-y-5">
          {view.blocks.map((block) => (
            <BriefingBlock key={block.code} block={block} />
          ))}
        </div>
      </section>
    </>
  );
}

function buttonClass(active) {
  return active
    ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white'
    : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100';
}

function BriefingBlock({ block }) {
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
        <Visual type={block.visualType} />
      </div>
      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">{block.framing}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">No actions</span>
        </div>
        <dl className="grid gap-3">
          <SpecRow icon={Database} label="Database" value={block.db} />
          <SpecRow icon={Search} label="API endpoint" value={block.api} />
          <SpecRow icon={Filter} label="ML / NLP method" value={block.ml} />
        </dl>
      </div>
    </article>
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

function Visual({ type }) {
  if (type === 'heatmap') return <Heatmap />;
  if (type === 'trend') return <Trend />;
  if (type === 'excerpt') return <Excerpt />;
  if (type === 'network') return <NetworkVisual />;
  if (type === 'scatter') return <Scatter />;
  if (type === 'table') return <TableVisual />;
  if (type === 'coverage') return <Coverage />;
  if (type === 'links') return <LinksVisual />;
  if (type === 'multiples') return <Multiples />;
  if (type === 'cards') return <CardsVisual />;
  return <Bars />;
}

function Bars() {
  return (
    <div className="mt-6 space-y-3">
      {[74, 52, 38, 28].map((width, index) => (
        <div key={width} className="flex items-center gap-3">
          <div className="h-3 w-20 rounded bg-white/10" />
          <div className="h-3 rounded bg-amber-300" style={{ width: `${width}%` }} />
          <span className="text-xs text-slate-300">{index + 1}</span>
        </div>
      ))}
    </div>
  );
}

function Heatmap() {
  return (
    <div className="mt-6 grid grid-cols-5 gap-1.5">
      {Array.from({ length: 25 }).map((_, index) => (
        <div key={index} className={['h-9 rounded', 'bg-amber-200', 'bg-amber-300', 'bg-amber-500', 'bg-white/15'][index % 4]} />
      ))}
    </div>
  );
}

function Trend() {
  return (
    <div className="mt-6 flex h-32 items-end gap-2">
      {[32, 46, 38, 70, 58, 82, 66, 90].map((height) => (
        <div key={height} className="w-full rounded-t bg-amber-300" style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

function Excerpt() {
  return (
    <div className="mt-6 space-y-3">
      <MessageSquare className="h-8 w-8 text-amber-300" />
      <div className="rounded-md border border-white/15 bg-white/10 p-3 text-sm leading-6 text-slate-100">
        "Representative and minority excerpts go here."
      </div>
    </div>
  );
}

function NetworkVisual() {
  return (
    <div className="mt-6 grid grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="flex h-14 items-center justify-center rounded-full border border-amber-300/50 bg-white/10 text-sm font-bold text-amber-200">
          {item}
        </div>
      ))}
    </div>
  );
}

function Scatter() {
  return (
    <div className="relative mt-6 h-36 rounded-md border border-white/15 bg-white/5">
      {[12, 28, 43, 58, 76, 90, 34, 66].map((left, index) => (
        <span key={left} className="absolute h-3 w-3 rounded-full bg-amber-300" style={{ left: `${left}%`, top: `${20 + ((index * 17) % 62)}%` }} />
      ))}
    </div>
  );
}

function TableVisual() {
  return (
    <div className="mt-6 space-y-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="grid grid-cols-[1fr_70px] gap-2">
          <div className="h-8 rounded bg-white/10" />
          <div className="h-8 rounded bg-amber-300/80" />
        </div>
      ))}
    </div>
  );
}

function Coverage() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      <div className="rounded-md bg-white/10 p-3">
        <p className="text-xs text-slate-300">Covered</p>
        <p className="mt-2 text-3xl font-bold text-amber-300">68%</p>
      </div>
      <div className="rounded-md bg-white/10 p-3">
        <p className="text-xs text-slate-300">Missing</p>
        <p className="mt-2 text-3xl font-bold text-white">32%</p>
      </div>
    </div>
  );
}

function LinksVisual() {
  return (
    <div className="mt-6 space-y-2">
      {['Library partner', 'Community event', 'Help resource'].map((item) => (
        <div key={item} className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-slate-100">{item}</div>
      ))}
    </div>
  );
}

function Multiples() {
  return (
    <div className="mt-6 grid grid-cols-3 gap-2">
      {[42, 64, 28, 72, 50, 38].map((height) => (
        <div key={height} className="flex h-24 items-end rounded bg-white/5 p-2">
          <div className="w-full rounded-t bg-amber-300" style={{ height: `${height}%` }} />
        </div>
      ))}
    </div>
  );
}

function CardsVisual() {
  return (
    <div className="mt-6 grid gap-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-md border border-white/15 bg-white/10 p-3">
          <div className="h-3 w-1/2 rounded bg-amber-300" />
          <div className="mt-3 h-2 w-full rounded bg-white/20" />
          <div className="mt-2 h-2 w-3/4 rounded bg-white/20" />
        </div>
      ))}
    </div>
  );
}
