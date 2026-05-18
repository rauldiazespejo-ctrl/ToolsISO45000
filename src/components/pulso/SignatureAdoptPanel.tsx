'use client';

import { useCallback, useEffect, useState } from 'react';
import { SignatoryConfig } from '@/types/sst';
import { SIGNATURE_STYLES, deriveInitials } from '@/lib/signature-styles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignatureAdoptPanelProps {
  title: string;
  value: SignatoryConfig;
  onChange: (next: SignatoryConfig) => void;
  auditSeed: string;
}

export function SignatureAdoptPanel({ title, value, onChange, auditSeed }: SignatureAdoptPanelProps) {
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [auditId, setAuditId] = useState('');

  const loadPreview = useCallback(async () => {
    if (!value.fullName.trim()) {
      setPreview('');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/signature-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: value.fullName,
          initials: value.initials || deriveInitials(value.fullName),
          styleId: value.styleId,
          auditSeed,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.preview);
        setAuditId(data.auditId);
      }
    } finally {
      setLoading(false);
    }
  }, [value.fullName, value.initials, value.styleId, auditSeed]);

  useEffect(() => {
    const t = setTimeout(loadPreview, 280);
    return () => clearTimeout(t);
  }, [loadPreview]);

  const update = (patch: Partial<SignatoryConfig>) => {
    const next = { ...value, ...patch };
    if (patch.fullName !== undefined && !value.initials) {
      next.initials = deriveInitials(patch.fullName);
    }
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-[#1E3A5F] bg-white text-[#1A1A1A] overflow-hidden shadow-lg">
      <div className="bg-[#F4F6FB] border-b border-[#D8E2F0] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#1E4FA1]">{title}</h3>
        <p className="text-xs text-[#64748B] mt-0.5">
          Estilo tipo firma electrónica — se insertará en todos los documentos Word
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-[#475569]">Nombre completo</Label>
            <Input
              value={value.fullName}
              onChange={(e) => update({ fullName: e.target.value })}
              placeholder="María González Pérez"
              className="mt-1 border-[#CBD5E1]"
            />
          </div>
          <div>
            <Label className="text-xs text-[#475569]">Iniciales</Label>
            <Input
              value={value.initials}
              onChange={(e) => update({ initials: e.target.value.toUpperCase().slice(0, 4) })}
              placeholder="MG"
              className="mt-1 border-[#CBD5E1] max-w-[100px]"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-[#475569]">Cargo</Label>
            <Input
              value={value.jobTitle}
              onChange={(e) => update({ jobTitle: e.target.value })}
              placeholder="Encargado(a) SST"
              className="mt-1 border-[#CBD5E1]"
            />
          </div>
        </div>

        <Tabs defaultValue="style" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#EEF2F8]">
            <TabsTrigger value="style" className="data-[state=active]:bg-white data-[state=active]:text-[#1E4FA1]">
              Seleccionar estilo
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-white data-[state=active]:text-[#1E4FA1]">
              Vista previa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="style" className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {SIGNATURE_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => update({ styleId: style.id })}
                className={cn(
                  'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                  value.styleId === style.id
                    ? 'border-[#1E4FA1] bg-[#1E4FA1]/5 ring-1 ring-[#1E4FA1]/30'
                    : 'border-[#E2E8F0] hover:border-[#94A3B8]'
                )}
              >
                <span className="text-xs text-[#64748B] w-16 shrink-0">{style.label}</span>
                <span
                  className="flex-1 text-center text-[#1A1A1A] truncate px-2"
                  style={{
                    fontFamily: style.fontFamily,
                    fontSize: '1.15rem',
                    fontStyle: style.fontStyle,
                    letterSpacing: style.letterSpacing,
                  }}
                >
                  {value.fullName || 'Tu nombre'}
                </span>
                {value.styleId === style.id && <Check className="w-4 h-4 text-[#1E4FA1] shrink-0" />}
              </button>
            ))}
          </TabsContent>

          <TabsContent value="preview" className="mt-3">
            <div className="min-h-[130px] flex items-center justify-center rounded-lg bg-[#F8FAFC] border border-dashed border-[#CBD5E1] p-3">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#1E4FA1]" />
              ) : preview ? (
                <img src={preview} alt="Vista previa firma" className="max-w-full h-auto" />
              ) : (
                <p className="text-xs text-[#94A3B8]">Ingresa un nombre para ver la firma</p>
              )}
            </div>
            {auditId && (
              <p className="text-[10px] text-[#64748B] mt-2 text-center font-mono">
                ID de trazabilidad: {auditId}
              </p>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-[10px] leading-relaxed text-[#64748B] border-t border-[#E2E8F0] pt-3">
          Al guardar, esta firma gráfica se aplicará en la tabla de formalización (Elaborado / Revisado / Aprobado)
          de los 46 documentos. Es una representación visual para gestión documental; no constituye firma electrónica
          avanzada Ley 19.799 sin certificado digital.
        </p>
      </div>
    </div>
  );
}
