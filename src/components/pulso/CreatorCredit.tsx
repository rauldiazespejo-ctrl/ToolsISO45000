'use client';

/** Logo y texto de la agencia creadora (Pulso AI). Imagen en /public/pulso-ai-creator-logo.png */
export function CreatorCredit({
  variant = 'footer',
  className = '',
}: {
  variant?: 'footer' | 'splash' | 'inline';
  className?: string;
}) {
  const imgClass =
    variant === 'splash'
      ? 'h-14 sm:h-16 w-auto max-w-[200px] object-contain'
      : variant === 'inline'
        ? 'h-8 w-auto max-w-[120px] object-contain'
        : 'h-9 w-auto max-w-[140px] object-contain';

  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${className}`}
    >
      <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#475569]">
        Creado por
      </span>
      <img
        src="/pulso-ai-creator-logo.png"
        alt="Pulso AI"
        className={imgClass}
        loading="lazy"
      />
    </div>
  );
}
