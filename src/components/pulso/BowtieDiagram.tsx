'use client';

interface BowtieDiagramProps {
  svg: string;
  className?: string;
}

export function BowtieDiagram({ svg, className }: BowtieDiagramProps) {
  if (!svg) return null;
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <div className={`overflow-x-auto rounded-lg border border-[#1E3A5F] bg-[#0A1929] p-2 ${className ?? ''}`}>
      <img src={src} alt="Diagrama Bowtie" className="w-full h-auto min-w-[640px]" />
    </div>
  );
}
