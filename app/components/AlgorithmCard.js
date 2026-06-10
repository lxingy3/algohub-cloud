import Link from 'next/link';
import { Info, MapPin } from 'lucide-react';
import { formatStatus } from './Formatters';
import { InfoTooltip } from './InfoTooltip';

export function AlgorithmCard({ algorithm, onSelect }) {
  const className = 'group flex h-full flex-col rounded-lg border border-gray-200 border-l-4 border-l-yellow-500 bg-white p-5 text-left shadow-sm transition-all hover:shadow-lg';
  const content = (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-tight text-gray-900 transition-colors group-hover:text-yellow-600">
          {algorithm.name}
        </h3>
        <StoryCountBadge count={algorithm.storyCount || 0} />
      </div>

      {algorithm.useCase ? (
        <span className="mb-4 w-fit rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700">
          {algorithm.useCase}
        </span>
      ) : null}

      <p className="line-clamp-3 flex-1 text-sm leading-6 text-gray-600">
        {algorithm.description}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm text-gray-600">
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate">{algorithm.location || 'Location not listed'}</span>
        </span>
        {algorithm.impactLevel ? <ImpactBadge impactLevel={algorithm.impactLevel} /> : null}
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(algorithm)} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link href={`/algorithms/${algorithm.slug}`} className={className}>
      {content}
    </Link>
  );
}

function StoryCountBadge({ count }) {
  const label = `${count} ${count === 1 ? 'Story' : 'Stories'}`;
  const tone = count === 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800';
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
      {label}
    </span>
  );
}

function ImpactBadge({ impactLevel }) {
  const label = `${formatStatus(impactLevel)} Impact`;
  const tone = impactLevel === 'HIGH'
    ? 'bg-red-100 text-red-700'
    : impactLevel === 'MEDIUM'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700';

  return (
    <span className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1 text-sm font-bold ${tone}`}>
      {label}
      <InfoTooltip label="Impact measures the scale and severity of how this algorithm affects the community" className="text-yellow-600">
        <Info className="h-4 w-4" />
      </InfoTooltip>
    </span>
  );
}
