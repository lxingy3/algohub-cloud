import { getAlgorithmLandscape, getApprovedBriefingCorpus } from '../../../lib/briefingsExplore';
import { getSemanticEmbeddingMap } from '../../../lib/semanticEmbeddings';
import { buildSilenceAnalysis } from '../../../lib/silenceAnalysis';

export const dynamic = 'force-dynamic';

export default async function AdminSilencePage({ searchParams }) {
  const params = await searchParams;
  const requested = ['critical', 'high', 'medium'].includes(params?.priority) ? params.priority : '';
  const [algorithms, stories] = await Promise.all([getAlgorithmLandscape(), getApprovedBriefingCorpus()]);
  const [algorithmEmbeddings, storyEmbeddings] = await Promise.all([
    getSemanticEmbeddingMap('algorithm', algorithms.map((algorithm) => algorithm.id)),
    getSemanticEmbeddingMap('testimony', stories.map((story) => story.id)),
  ]);
  const analysis = buildSilenceAnalysis({ algorithms, stories, algorithmEmbeddings, storyEmbeddings });
  const rows = analysis.rows.filter((row) => !requested || row.priority === requested);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Silence Monitor</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">A review queue based on expected story volume, semantic coverage, domain coverage, and algorithm impact. A high score means evidence is thin, not that the system is safe.</p>
      <nav className="mt-5 flex flex-wrap gap-2">{['', 'critical', 'high', 'medium'].map((priority) => <a key={priority || 'all'} href={priority ? `/admin/silence?priority=${priority}` : '/admin/silence'} className={`rounded-md px-3 py-2 text-sm font-semibold ${requested === priority ? 'bg-slate-900 text-white' : 'border bg-white text-slate-700'}`}>{priority || 'all'}</a>)}</nav>
      <p className="mt-4 text-sm text-slate-500">{rows.length} systems - semantic cache {analysis.semanticCacheUsed ? 'available' : 'using saved topic fallback'}</p>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => <article key={row.algorithmId} className="rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-950">{row.algorithmName}</h2><p className="mt-1 text-sm text-slate-500">{row.useCase} - {row.agencyName || 'Agency not listed'}</p></div><span className={priorityClass(row.priority)}>{row.priority} - {row.silenceScore}</span></div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4"><Metric label="Linked / expected" value={`${row.approvedTestimonyCount} / ${row.expectedVolume}`} /><Metric label="Volume gap" value={row.factors.volumeGap} /><Metric label="Semantic gap" value={row.factors.semanticGap} /><Metric label="Domain gap" value={row.factors.domainGap} /></div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">{row.possibleReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </article>)}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-md bg-slate-50 p-3"><span className="block text-xs font-bold uppercase text-slate-500">{label}</span><strong className="mt-1 block text-slate-950">{value}</strong></div>;
}

function priorityClass(priority) {
  const tone = priority === 'critical' ? 'bg-red-100 text-red-800' : priority === 'high' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800';
  return `rounded-full px-3 py-1 text-xs font-bold uppercase ${tone}`;
}
