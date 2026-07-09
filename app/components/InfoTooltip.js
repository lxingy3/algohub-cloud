'use client';

export function InfoTooltip({ label, children, className = '', side = 'top', block = false, style }) {
  const TriggerElement = block ? 'div' : 'span';
  const textClass = /\btext-/.test(className) ? '' : 'text-yellow-600';
  const positionClass = side === 'bottom'
    ? 'left-1/2 top-full mt-2 -translate-x-1/2'
    : 'bottom-full left-1/2 mb-2 -translate-x-1/2';
  const arrowClass = side === 'bottom'
    ? 'bottom-full left-1/2 -translate-x-1/2 border-x-4 border-b-4 border-x-transparent border-b-slate-950'
    : 'left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-slate-950';

  return (
    <TriggerElement
      className={`group/tooltip relative ${block ? 'flex' : 'inline-flex'} cursor-help items-center ${textClass} outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 ${className}`}
      aria-label={label}
      style={style}
    >
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${positionClass} z-[120] hidden w-max max-w-[250px] rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-xs font-medium leading-5 text-white shadow-xl group-hover/tooltip:block`}
      >
        {label}
        <span className={`absolute h-0 w-0 ${arrowClass}`} />
      </span>
    </TriggerElement>
  );
}
