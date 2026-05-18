'use client';

import { useEffect, useState } from 'react';
import { CompanySignatories, DEFAULT_SIGNATORIES } from '@/types/sst';
import { SIGNATURE_STYLES } from '@/lib/signature-styles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, PenLine } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ConfiguredSignatoriesPanelProps {
  signatories?: CompanySignatories;
  rut?: string;
  compact?: boolean;
}

type PreviewMap = Record<'elaborado' | 'revisado' | 'aprobado', string>;

export function ConfiguredSignatoriesPanel({
  signatories = DEFAULT_SIGNATORIES,
  rut = 'demo',
  compact = false,
}: ConfiguredSignatoriesPanelProps) {
  const [previews, setPreviews] = useState<PreviewMap>({ elaborado: '', revisado: '', aprobado: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const roles = ['elaborado', 'revisado', 'aprobado'] as const;
      const next: PreviewMap = { elaborado: '', revisado: '', aprobado: '' };
      await Promise.all(
        roles.map(async (key) => {
          const s = signatories[key];
          if (!s.fullName.trim()) return;
          try {
            const res = await fetch('/api/signature-preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName: s.fullName,
                initials: s.initials,
                styleId: s.styleId,
                auditSeed: `${rut}|${s.role}`,
              }),
            });
            const data = await res.json();
            if (data.success) next[key] = data.preview;
          } catch {
            /* ignore */
          }
        })
      );
      if (!cancelled) {
        setPreviews(next);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [signatories, rut]);

  const roles = [
    { key: 'elaborado' as const, label: 'Elaborado', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
    { key: 'revisado' as const, label: 'Revisado', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
    { key: 'aprobado' as const, label: 'Aprobado', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  ];

  const styleLabel = (id: string) => SIGNATURE_STYLES.find((s) => s.id === id)?.label ?? id;

  return (
    <Card className="bg-[#112240] border-[#1E3A5F]">
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <PenLine className="w-5 h-5 text-[#1E4FA1]" />
          Firmas configuradas
        </CardTitle>
        <CardDescription className="text-[#94A3B8]">
          Estilo DocuSign — se insertan en la portada de los 46 documentos Word
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E4FA1]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {roles.map(({ key, label, color }) => {
              const s = signatories[key];
              const hasName = Boolean(s.fullName.trim());
              return (
                <div
                  key={key}
                  className="rounded-xl border border-[#1E3A5F] bg-[#0A1929]/60 overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#1E3A5F] bg-[#0A1929]">
                    <Badge className={color}>{label}</Badge>
                    {hasName ? (
                      <span className="text-sm text-white font-medium">{s.fullName}</span>
                    ) : (
                      <span className="text-xs text-[#F59E0B]">Sin configurar</span>
                    )}
                  </div>
                  <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#94A3B8]">
                    <span>Cargo: <span className="text-[#CBD5E1]">{s.jobTitle || '—'}</span></span>
                    <span>Estilo: <span className="text-[#CBD5E1]">{styleLabel(s.styleId)}</span></span>
                    <span>Iniciales: <span className="text-[#CBD5E1]">{s.initials || '—'}</span></span>
                  </div>
                  <div className="bg-white mx-3 mb-3 rounded-lg p-2 flex items-center justify-center min-h-[72px]">
                    {previews[key] ? (
                      <img src={previews[key]} alt={`Firma ${label}`} className="max-w-full h-auto max-h-[70px]" />
                    ) : (
                      <p className="text-xs text-[#94A3B8] text-center px-2">
                        {hasName ? 'Generando vista previa…' : 'Completa el firmante en Configuración'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!compact && (
          <Button variant="outline" asChild className="w-full border-[#1E3A5F] text-[#94A3B8]">
            <Link href="/preview-firmas-configuradas.html" target="_blank">
              Ver ejemplo con firmas DocuSign
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
