import { Fragment, useMemo } from 'react';
import type { Highlight } from '../../lib/types';
import { HIGHLIGHT_CLS, cn } from '../../lib/utils';

/** Renders the original message with flagged spans highlighted and labelled on hover. */
export default function HighlightedText({ text, highlights }: { text: string; highlights: Highlight[] }) {
  const segments = useMemo(() => {
    const out: { text: string; h?: Highlight }[] = [];
    let cursor = 0;
    for (const h of highlights) {
      if (h.start < cursor || h.end > text.length) continue;
      if (h.start > cursor) out.push({ text: text.slice(cursor, h.start) });
      out.push({ text: text.slice(h.start, h.end), h });
      cursor = h.end;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor) });
    return out;
  }, [text, highlights]);

  const legend = useMemo(() => [...new Map(highlights.map((h) => [h.category, h.category === 'url' ? 'Link' : h.category === 'impersonation' ? 'Impersonation' : h.label])).entries()], [highlights]);

  return (
    <div>
      <div className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/5 bg-ink-950/60 p-4 text-sm leading-7 text-slate-300">
        {segments.map((s, i) =>
          s.h ? (
            <span key={i} className="group relative">
              <mark className={cn('cursor-help rounded px-0.5 underline decoration-dotted underline-offset-4', HIGHLIGHT_CLS[s.h.category] || 'bg-white/10 text-white')}>
                {s.text}
              </mark>
              <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 hidden whitespace-nowrap rounded-md border border-white/10 bg-ink-800 px-2 py-1 text-[11px] font-medium text-white shadow-xl group-hover:block">
                {s.h.label}
              </span>
            </span>
          ) : (
            <Fragment key={i}>{s.text}</Fragment>
          )
        )}
      </div>
      {legend.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {legend.map(([cat, label]) => (
            <span key={cat} className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', HIGHLIGHT_CLS[cat])}>
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
