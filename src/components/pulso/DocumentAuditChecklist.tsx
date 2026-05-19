'use client';

import { SstDocumentItem } from '@/types/sst';
import {
  getAuditChecklistForDocument,
  getAuditChecklistProgress,
  type AuditChecklistItem,
} from '@/lib/audit-checklist';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, AlertCircle } from 'lucide-react';

interface DocumentAuditChecklistProps {
  doc: SstDocumentItem;
  checks: Record<string, boolean>;
  onToggle: (itemId: string, checked: boolean) => void;
  hasGeneratedContent?: boolean;
}

export function DocumentAuditChecklist({
  doc,
  checks,
  onToggle,
  hasGeneratedContent,
}: DocumentAuditChecklistProps) {
  const items = getAuditChecklistForDocument(doc);
  const progress = getAuditChecklistProgress(items, checks);

  return (
    <Card className="bg-[#112240] border-[#1E3A5F]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#00D4AA]" />
              Checklist anti-devolución (Chile)
            </CardTitle>
            <CardDescription className="text-[#94A3B8] mt-1">
              Verifica cada ítem antes de dar por cerrado el documento ante un auditor DT / ISL / certificación.
            </CardDescription>
          </div>
          <Badge
            className={
              progress.complete
                ? 'bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/40'
                : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/40'
            }
          >
            {progress.done}/{progress.total}
          </Badge>
        </div>
        <Progress value={progress.percent} className="h-2 mt-3 bg-[#0A1929]" />
        <p className="text-xs text-[#64748B] mt-1">{progress.percent}% verificado</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {doc.complianceTrace && (
          <div className="rounded-lg border border-[#1E3A5F] bg-[#0A1929]/60 p-3 space-y-2">
            <p className="text-xs text-[#00D4AA] font-semibold uppercase tracking-wide">Evidencia mínima exigible (Chile)</p>
            {doc.complianceTrace.requiredEvidence.length > 0 ? (
              <div className="space-y-2">
                {doc.complianceTrace.requiredEvidence.map((ev) => (
                  <div key={ev.id} className="rounded-md border border-[#1E3A5F] bg-[#0A1929] p-2">
                    <p className="text-sm text-white">{ev.name}</p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      {ev.ownerRole} · {ev.frequency} · retención: {ev.retention}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8]">
                Este documento no declara evidencias específicas adicionales en la base actual.
              </p>
            )}
          </div>
        )}
        {!hasGeneratedContent && (
          <div className="flex items-start gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-sm text-[#FCD34D]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            Genera el documento con IA antes de validar el contenido punto por punto.
          </div>
        )}
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            checked={Boolean(checks[item.id])}
            onCheckedChange={(c) => onToggle(item.id, c)}
            disabled={!hasGeneratedContent}
          />
        ))}
        {progress.complete && (
          <p className="text-sm text-[#00D4AA] pt-2 border-t border-[#1E3A5F]">
            Checklist completo. El documento puede marcarse como listo para entrega.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistRow({
  item,
  checked,
  onCheckedChange,
  disabled,
}: {
  item: AuditChecklistItem;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
        checked
          ? 'border-[#00D4AA]/40 bg-[#00D4AA]/5'
          : 'border-[#1E3A5F] bg-[#0A1929]/40 hover:border-[#334155]'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5 border-[#475569] data-[state=checked]:bg-[#00D4AA] data-[state=checked]:border-[#00D4AA]"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${checked ? 'text-[#CBD5E1] line-through opacity-80' : 'text-white'}`}>
          {item.label}
        </p>
        {item.hint && <p className="text-xs text-[#64748B] mt-1">{item.hint}</p>}
        {item.normRef && (
          <p className="text-[10px] text-[#00D4AA]/80 mt-1 font-mono">{item.normRef}</p>
        )}
      </div>
    </label>
  );
}
