'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { DOCUMENT_CODES } from '@/lib/sst-documents';
import { getDocumentsWithContent } from '@/lib/document/corpus-context';
import { AgentPipelineLog } from '@/components/pulso/AgentPipelineLog';
import { AgentReviewPanel } from '@/components/pulso/AgentReviewPanel';
import type { AgentReviewResult, AgentStepLog } from '@/lib/agents/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Bot,
  Loader2,
  RefreshCw,
  Layers,
  Wrench,
  AlertCircle,
} from 'lucide-react';

interface BatchResultRow {
  docNumber: number;
  success: boolean;
  error?: string;
  review?: { approved?: boolean; score?: number };
}

export default function ReviseDocumentsView() {
  const store = useAppStore();
  const company = store.company;
  const docsWithContent = useMemo(
    () => getDocumentsWithContent(store.documents),
    [store.documents]
  );

  const notApprovedDocs = useMemo(
    () => docsWithContent.filter((d) => d.aiReview && !d.aiReview.approved),
    [docsWithContent]
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [revising, setRevising] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
  const [activeDoc, setActiveDoc] = useState<number | null>(null);
  const [lastReview, setLastReview] = useState<AgentReviewResult | null>(null);
  const [pipelineLog, setPipelineLog] = useState<AgentStepLog[]>([]);
  const [lastBatchResults, setLastBatchResults] = useState<BatchResultRow[]>([]);

  const toggle = (n: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === docsWithContent.length) setSelected(new Set());
    else setSelected(new Set(docsWithContent.map((d) => d.number)));
  };

  const selectNotApproved = () => {
    setSelected(new Set(notApprovedDocs.map((d) => d.number)));
  };

  const applyBatchResults = (
    results: Array<{
      docNumber: number;
      success: boolean;
      content?: string;
      review?: { approved: boolean; score: number; summary: string };
      error?: string;
    }>
  ) => {
    const rows: BatchResultRow[] = [];
    let ok = 0;
    for (const r of results) {
      rows.push({
        docNumber: r.docNumber,
        success: r.success,
        error: r.error,
        review: r.review,
      });
      if (r.success && r.content) {
        store.updateDocumentContent(r.docNumber, r.content);
        store.updateDocumentStatus(r.docNumber, 'En Proceso');
        if (r.review) {
          store.updateDocumentAiReview(r.docNumber, {
            approved: r.review.approved,
            score: r.review.score,
            summary: r.review.summary,
          });
        }
        ok++;
      }
    }
    setLastBatchResults(rows);
    return ok;
  };

  const companyPayload = () => ({
    documents: store.documents,
    companyName: company!.name,
    rut: company!.rut,
    business: company!.business,
    size: company!.size,
    workerCount: company!.workerCount,
    sector: company!.sector,
  });

  const runRevise = async (docNumbers: number[]) => {
    if (!company || docNumbers.length === 0) return;
    setRevising(true);
    setProgress({ current: 0, total: docNumbers.length, label: 'Revisión vs. paquete' });
    setLastReview(null);
    setPipelineLog([]);
    setLastBatchResults([]);

    try {
      const res = await fetch('/api/agents/document-revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docNumbers, ...companyPayload() }),
      });
      const data = await res.json();
      if (res.status === 401) {
        toast.error(data.error || 'No autorizado');
        return;
      }
      if (!data.results) {
        toast.error(data.error || 'Error en revisión');
        return;
      }

      const ok = applyBatchResults(data.results);
      setProgress({ current: docNumbers.length, total: docNumbers.length, label: 'Revisión vs. paquete' });

      if (docNumbers.length === 1 && data.results[0]?.success) {
        const r = data.results[0];
        setActiveDoc(r.docNumber);
        setLastReview(r.review as AgentReviewResult);
        setPipelineLog((r.pipelineLog as AgentStepLog[]) ?? []);
      }

      toast.success(`${ok} de ${docNumbers.length} documento(s) actualizado(s) según el paquete SST`);
      if (ok < docNumbers.length) {
        toast.warning('Algunos documentos no tenían contenido o fallaron — revise el detalle abajo');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setRevising(false);
      setProgress({ current: 0, total: 0, label: '' });
    }
  };

  const runFixBatch = async (docNumbers: number[], onlyNotApproved = false) => {
    if (!company) return;
    const nums =
      docNumbers.length > 0
        ? docNumbers
        : onlyNotApproved
          ? notApprovedDocs.map((d) => d.number)
          : [];

    if (nums.length === 0) {
      toast.error('No hay documentos para corregir');
      return;
    }

    setFixing(true);
    setProgress({ current: 0, total: nums.length, label: 'Corrector multiagente' });
    setLastBatchResults([]);

    try {
      const res = await fetch('/api/agents/document-fix-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docNumbers: nums,
          onlyNotApproved,
          ...companyPayload(),
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        toast.error(data.error || 'No autorizado');
        return;
      }
      if (!data.results) {
        toast.error(data.error || 'Error en corrección');
        return;
      }

      const ok = applyBatchResults(data.results);
      setProgress({ current: nums.length, total: nums.length, label: 'Corrector multiagente' });

      const approved = data.results.filter((r: BatchResultRow & { review?: { approved?: boolean } }) =>
        r.success && r.review?.approved
      ).length;

      toast.success(`${ok} corregido(s); ${approved} aprobado(s) por agentes`);
      if (ok < nums.length) {
        toast.warning('Revise el detalle de documentos con error');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setFixing(false);
      setProgress({ current: 0, total: 0, label: '' });
    }
  };

  const busy = revising || fixing;

  return (
    <div className="min-h-screen circuit-bg">
      <header className="sticky top-0 z-50 bg-[#0A1929]/95 backdrop-blur border-b border-[#1E3A5F]">
        <div className="flex items-center gap-3 px-4 py-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="sm" className="text-[#94A3B8]" onClick={() => store.setCurrentView('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <Layers className="w-6 h-6 text-[#8B5CF6]" />
          <div>
            <h1 className="text-white font-semibold">Revisión de documentos previos</h1>
            <p className="text-xs text-[#64748B]">
              Alineación al paquete · corrector en lote · revisor multiagente
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Card className="bg-[#112240] border-[#1E3A5F]">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#8B5CF6]" />
              Pipeline de revisión documental
            </CardTitle>
            <CardDescription className="text-[#94A3B8]">
              <strong>Revisar seleccionados:</strong> alinea con el paquete SST ya creado + auditoría + corrección.
              <strong className="text-[#F59E0B]"> Corregir (IA):</strong> solo revisor + corrector, sin re-alinear el paquete.
              El estado pasa a En Proceso para volver a validar el checklist.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              onClick={() => runRevise([...selected])}
              disabled={busy || selected.size === 0}
              className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
            >
              {revising ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Revisar seleccionados ({selected.size})
            </Button>
            <Button
              onClick={() => runFixBatch([...selected])}
              disabled={busy || selected.size === 0}
              variant="outline"
              className="border-[#F59E0B]/40 text-[#FDBA74] hover:bg-[#F59E0B]/10"
            >
              {fixing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
              Corregir seleccionados (IA)
            </Button>
            {notApprovedDocs.length > 0 && (
              <Button
                onClick={() => runFixBatch([], true)}
                disabled={busy}
                variant="outline"
                className="border-[#EF4444]/40 text-[#FCA5A5] hover:bg-[#EF4444]/10"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Corregir todos no aprobados ({notApprovedDocs.length})
              </Button>
            )}
            <Button variant="outline" onClick={selectAll} disabled={busy} className="border-[#1E3A5F] text-[#94A3B8]">
              {selected.size === docsWithContent.length ? 'Deseleccionar' : 'Seleccionar todos'}
            </Button>
            {notApprovedDocs.length > 0 && (
              <Button variant="outline" onClick={selectNotApproved} disabled={busy} className="border-[#1E3A5F] text-[#94A3B8]">
                Seleccionar no aprobados ({notApprovedDocs.length})
              </Button>
            )}
          </CardContent>
          {busy && progress.total > 0 && (
            <CardContent className="pt-0">
              <Progress value={(progress.current / progress.total) * 100} className="h-2" />
              <p className="text-xs text-[#64748B] mt-1">
                {progress.label}: {progress.current} / {progress.total}…
              </p>
            </CardContent>
          )}
        </Card>

        {lastBatchResults.length > 0 && (
          <Card className="bg-[#112240] border-[#1E3A5F]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#94A3B8]" />
                Resultado del último lote
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs">
                {lastBatchResults.map((r) => {
                  const doc = store.documents.find((d) => d.number === r.docNumber);
                  return (
                    <li
                      key={r.docNumber}
                      className={`flex flex-wrap items-center gap-2 rounded px-2 py-1 ${
                        r.success ? 'bg-[#00D4AA]/5 text-[#94A3B8]' : 'bg-[#EF4444]/5 text-[#FCA5A5]'
                      }`}
                    >
                      <span className="font-mono text-[#64748B]">{DOCUMENT_CODES[r.docNumber]}</span>
                      <span className="truncate flex-1">{doc?.name ?? `Doc ${r.docNumber}`}</span>
                      {r.success ? (
                        <Badge className="bg-[#00D4AA]/10 text-[#00D4AA] text-[10px]">
                          {r.review?.approved ? `OK ${r.review.score}%` : `Obs. ${r.review?.score ?? '?'}%`}
                        </Badge>
                      ) : (
                        <span className="text-[#FCA5A5]">{r.error}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {lastReview && (
          <>
            <AgentPipelineLog steps={pipelineLog} title={`Agentes — Doc ${activeDoc}`} />
            <AgentReviewPanel review={lastReview} />
          </>
        )}

        <Card className="bg-[#112240] border-[#1E3A5F]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">
              Documentos con contenido ({docsWithContent.length})
              {notApprovedDocs.length > 0 && (
                <span className="text-[#F59E0B] font-normal ml-2">
                  · {notApprovedDocs.length} pend. aprobación IA
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {docsWithContent.length === 0 ? (
              <p className="text-sm text-[#64748B] py-8 text-center">
                No hay documentos previos. Genere al menos uno desde el Dashboard.
              </p>
            ) : (
              <ScrollArea className="h-[min(420px,50vh)]">
                <div className="space-y-2 pr-2">
                  {docsWithContent.map((doc) => (
                    <div
                      key={doc.number}
                      className="flex items-start gap-3 rounded-lg border border-[#1E3A5F] bg-[#0A1929]/50 p-3"
                    >
                      <Checkbox
                        checked={selected.has(doc.number)}
                        onCheckedChange={() => toggle(doc.number)}
                        disabled={busy}
                        className="mt-1 border-[#475569]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-[#64748B]">
                            {DOCUMENT_CODES[doc.number]}
                          </span>
                          <Badge variant="outline" className="text-[10px] border-[#334155] text-[#94A3B8]">
                            {doc.status}
                          </Badge>
                          {doc.aiReview && (
                            <Badge
                              className={
                                doc.aiReview.approved
                                  ? 'bg-[#00D4AA]/10 text-[#00D4AA] text-[10px]'
                                  : 'bg-[#F59E0B]/10 text-[#F59E0B] text-[10px]'
                              }
                            >
                              IA {doc.aiReview.score}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-white font-medium truncate">
                          {doc.number}. {doc.name}
                        </p>
                        <p className="text-xs text-[#64748B] line-clamp-1">{doc.categoryName}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          className="text-[#8B5CF6] h-8"
                          title="Revisar vs. paquete"
                          onClick={() => runRevise([doc.number])}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          className="text-[#F59E0B] h-8"
                          title="Solo corregir con IA"
                          onClick={() => runFixBatch([doc.number])}
                        >
                          <Wrench className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
