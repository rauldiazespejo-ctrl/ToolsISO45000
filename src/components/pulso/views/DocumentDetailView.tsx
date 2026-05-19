'use client';
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { CATEGORIES, DOCUMENT_CODES } from '@/lib/sst-documents';
import type { SstDocumentItem } from '@/types/sst';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Loader2, Sparkles, ArrowLeft, XCircle, CheckCircle2, RefreshCw, Eye, FileDown, ClipboardCheck, Shield, Wrench, PenLine, Bot, Layers } from 'lucide-react';
import { AgentPipelineLog } from '@/components/pulso/AgentPipelineLog';
import type { AgentStepLog } from '@/lib/agents/types';
import { APP_PRODUCT_NAME } from '@/lib/product-brand';
import { DocumentAuditChecklist } from '@/components/pulso/DocumentAuditChecklist';
import { ConfiguredSignatoriesPanel } from '@/components/pulso/ConfiguredSignatoriesPanel';
import { AgentReviewPanel } from '@/components/pulso/AgentReviewPanel';
import type { AgentReviewResult } from '@/lib/agents/types';
import { areSignatoriesComplete } from '@/lib/signatory-validation';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function DocumentDetailView() {
  const store = useAppStore();
  const doc = store.documents.find(d => d.number === store.selectedDocNumber);
  const company = store.company;
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [docAiReview, setDocAiReview] = useState<AgentReviewResult | null>(null);
  const [reviewingDoc, setReviewingDoc] = useState(false);
  const [pipelineLog, setPipelineLog] = useState<AgentStepLog[]>([]);
  const [forceCloseWithoutAi, setForceCloseWithoutAi] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (doc?.aiReview) {
      setDocAiReview({
        approved: doc.aiReview.approved,
        score: doc.aiReview.score,
        summary: doc.aiReview.summary,
        findings: [],
      });
    }
  }, [doc?.number, doc?.aiReview?.revisedAt]);

  const runDocumentAgentReview = async (content: string) => {
    if (!company || !doc) return;
    setReviewingDoc(true);
    setDocAiReview(null);
    try {
      const res = await fetch('/api/agents/document-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docNumber: doc.number,
          docName: doc.name,
          normRef: doc.normRef,
          companyName: company.name,
          rut: company.rut,
          size: company.size,
          content,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDocAiReview(data.review);
        if (data.review) {
          store.updateDocumentAiReview(doc.number, {
            approved: data.review.approved,
            score: data.review.score,
            summary: data.review.summary,
          });
        }
        if (data.pipelineLog) setPipelineLog(data.pipelineLog);
        toast.success(data.review.approved ? `Apto (${data.review.score}%)` : `${data.review.findings.length} hallazgo(s)`);
      }
    } catch {
      toast.error('Agente revisor no disponible');
    } finally {
      setReviewingDoc(false);
    }
  };

  const runReviseVsPackage = async () => {
    if (!company || !doc || !generatedContent) return;
    setReviewingDoc(true);
    setPipelineLog([{ agent: 'document-corpus-revise', label: 'Revisión vs. paquete documental…', status: 'running', startedAt: new Date().toISOString() }]);
    try {
      const res = await fetch('/api/agents/document-revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docNumbers: [doc.number],
          documents: store.documents,
          companyName: company.name,
          rut: company.rut,
          business: company.business,
          size: company.size,
          workerCount: company.workerCount,
          sector: company.sector,
        }),
      });
      const data = await res.json();
      const r = data.results?.[0];
      if (r?.success && r.content) {
        store.updateDocumentContent(doc.number, r.content);
        store.updateDocumentStatus(doc.number, 'En Proceso');
        if (r.review) {
          setDocAiReview(r.review);
          store.updateDocumentAiReview(doc.number, {
            approved: r.review.approved,
            score: r.review.score,
            summary: r.review.summary,
          });
        }
        setPipelineLog(r.pipelineLog ?? []);
        setActiveTab('auditoria');
        toast.success(`Actualizado con ${r.corpusReferenceCount ?? 0} doc(s) de referencia`);
      } else {
        toast.error(r?.error || data.error || 'Error al revisar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setReviewingDoc(false);
    }
  };

  const runDocumentFixPipeline = async (content: string) => {
    if (!company || !doc) return;
    setReviewingDoc(true);
    setPipelineLog([{ agent: 'document-fixer', label: 'Corrector regenerando Markdown…', status: 'running', startedAt: new Date().toISOString() }]);
    try {
      const res = await fetch('/api/agents/document-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docNumber: doc.number,
          docName: doc.name,
          description: doc.description,
          normRef: doc.normRef,
          companyName: company.name,
          rut: company.rut,
          business: company.business,
          size: company.size,
          workerCount: company.workerCount,
          sector: company.sector,
          content,
        }),
      });
      const data = await res.json();
      if (data.success) {
        store.updateDocumentContent(doc.number, data.content);
        setDocAiReview(data.review);
        if (data.review) {
          store.updateDocumentAiReview(doc.number, {
            approved: data.review.approved,
            score: data.review.score,
            summary: data.review.summary,
          });
        }
        setPipelineLog(data.pipelineLog ?? []);
        toast.success('Documento corregido por agentes');
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Error en corrector');
    } finally {
      setReviewingDoc(false);
    }
  };

  useEffect(() => {
    const tab = store.consumePendingDocumentTab();
    if (tab) setActiveTab(tab);
  }, [doc?.number]);

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#64748B]">Documento no encontrado</p>
      </div>
    );
  }

  const category = CATEGORIES.find(c => c.id === doc.category);
  const auditProgress = store.getAuditProgressForDoc(doc.number);
  const generatedContent = doc.generatedContent;
  const canDownload = doc.status === 'Completado' && Boolean(generatedContent);

  const canFinalize = store.canFinalizeDocument(doc.number, {
    forceWithoutAi: forceCloseWithoutAi,
  });
  const needsAiApproval =
    Boolean(generatedContent && doc.aiReview && !doc.aiReview.approved);

  const handleFinalize = () => {
    if (store.finalizeDocument(doc.number, { forceWithoutAi: forceCloseWithoutAi })) {
      toast.success('Documento marcado como completado');
    } else if (!auditProgress.complete) {
      toast.error('Completa el checklist anti-devolución antes de cerrar');
    } else if (needsAiApproval && !forceCloseWithoutAi) {
      toast.error('Los agentes no aprobaron el documento. Corrija o marque cierre sin aprobación IA.');
    } else {
      toast.error('No se pudo completar el documento');
    }
  };

  const handleGenerate = async () => {
    if (!company) return;
    setGenerating(true);
    setDocAiReview(null);
    setPipelineLog([{ agent: 'document-generator', label: 'Pipeline multiagente iniciado…', status: 'running', startedAt: new Date().toISOString() }]);
    store.updateDocumentStatus(doc.number, 'En Proceso');
    try {
      const res = await fetch('/api/agents/document-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docNumber: doc.number,
          docName: doc.name,
          description: doc.description,
          normRef: doc.normRef,
          companyName: company.name,
          rut: company.rut,
          business: company.business,
          size: company.size,
          workerCount: company.workerCount,
          sector: company.sector,
        }),
      });
      const data = await res.json();
      if (data.success) {
        store.updateDocumentContent(doc.number, data.content);
        setDocAiReview(data.review);
        if (data.review) {
          store.updateDocumentAiReview(doc.number, {
            approved: data.review.approved,
            score: data.review.score,
            summary: data.review.summary,
          });
        }
        setPipelineLog(data.pipelineLog ?? []);
        setActiveTab('auditoria');
        if (data.review?.approved) {
          toast.success(`Documento generado y aprobado (${data.review.score}%)`);
        } else {
          toast.warning(`Generado con observaciones (${data.review?.score ?? 0}%). Puede ejecutar corrector.`);
        }
      } else {
        store.updateDocumentStatus(doc.number, 'Pendiente');
        toast.error(data.error);
      }
    } catch {
      store.updateDocumentStatus(doc.number, 'Pendiente');
      toast.error('Error al generar documento');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (docBrandingMode?: string) => {
    const sig = areSignatoriesComplete(company?.signatories);
    if (!sig.ok) {
      toast.error(`Configure las firmas: ${sig.missing.join(', ')}`);
      setActiveTab('firmas');
      return;
    }
    try {
      const mode = docBrandingMode || company?.brandingMode || 'pulso';
      const res = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: generatedContent || '',
          docName: doc.name,
          docCode: DOCUMENT_CODES[doc.number] || `SIG-DOC-${doc.number}`,
          companyName: company?.name || '',
          rut: company?.rut || '',
          version: 1,
          brandingMode: mode,
          clientLogoPath: company?.clientLogoPath || company?.logoData || '',
          brandPalette: company?.brandPalette,
          signatories: company?.signatories,
          companyId: company?.id,
        }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${DOCUMENT_CODES[doc.number]}_${doc.name.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Documento descargado');
    } catch {
      toast.error('Error al descargar');
    }
  };

  const renderMarkdown = (md: string) => {
    const lines = md.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      if (trimmed.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-[#00D4AA] mt-4 mb-2">{trimmed.slice(4)}</h3>;
      if (trimmed.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-[#00D4AA] mt-6 mb-3">{trimmed.slice(3)}</h2>;
      if (trimmed.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mt-6 mb-4">{trimmed.slice(2)}</h1>;
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return <li key={i} className="text-sm text-[#CBD5E1] ml-4 list-disc">{trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}</li>;
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return <li key={i} className="text-sm text-[#CBD5E1] ml-4 list-decimal">{trimmed.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}</li>;
      }
      if (trimmed.startsWith('---')) return <hr key={i} className="border-[#1E3A5F] my-4" />;
      if (trimmed.startsWith('|')) {
        const cells = trimmed.split('|').filter(c => c.trim());
        const isHeader = trimmed.match(/^\|.*\|$/) && i > 0 && lines[i-1]?.trim().match(/^-+$/);
        if (lines[i+1]?.trim().match(/^-+$/)) return null;
        return (
          <div key={i} className={`grid gap-2 text-xs py-1 px-2 ${isHeader ? 'bg-[#1A3050] font-semibold text-[#00D4AA]' : 'text-[#94A3B8]'}`}
            style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
            {cells.map((c, j) => <span key={j} className="truncate">{c.trim()}</span>)}
          </div>
        );
      }
      return <p key={i} className="text-sm text-[#CBD5E1] leading-relaxed" dangerouslySetInnerHTML={{ __html: trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} />;
    });
  };

  return (
    <div className="min-h-screen circuit-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A1929]/95 backdrop-blur border-b border-[#1E3A5F]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" className="text-[#94A3B8]" onClick={() => store.setCurrentView('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <Separator orientation="vertical" className="h-6 bg-[#1E3A5F]" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#64748B] font-mono">{DOCUMENT_CODES[doc.number]}</p>
            <p className="text-sm font-medium text-white truncate">{doc.name}</p>
          </div>
          <Badge className="bg-[#1A3050] text-[#94A3B8] border border-[#1E3A5F]" style={{ borderColor: category?.color }}>
            <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: category?.color }} />
            {category?.name}
          </Badge>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 lg:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#112240] border border-[#1E3A5F]">
            <TabsTrigger value="info" className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#00D4AA] text-[#94A3B8]">
              <FileText className="w-4 h-4 mr-1" /> Información
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#00D4AA] text-[#94A3B8]">
              <Eye className="w-4 h-4 mr-1" /> Vista Previa
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#00D4AA] text-[#94A3B8]">
              <ClipboardCheck className="w-4 h-4 mr-1" /> Checklist
              {!auditProgress.complete && generatedContent && (
                <span className="ml-1 w-2 h-2 rounded-full bg-[#F59E0B]" />
              )}
            </TabsTrigger>
            <TabsTrigger value="firmas" className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#00D4AA] text-[#94A3B8]">
              <PenLine className="w-4 h-4 mr-1" /> Firmas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4 space-y-4">
            {/* Doc Info Card */}
            <Card className="bg-[#112240] border-[#1E3A5F]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-lg">{doc.name}</CardTitle>
                    <CardDescription className="text-[#94A3B8] mt-1">{doc.description}</CardDescription>
                  </div>
                  <Badge className={`${doc.priority === 'Alta' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'}`}>
                    {doc.priority} Prioridad
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#0A1929] rounded-lg p-3 border border-[#1E3A5F]">
                    <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Fuente Normativa</p>
                    <p className="text-sm text-white">{doc.normSource}</p>
                  </div>
                  <div className="bg-[#0A1929] rounded-lg p-3 border border-[#1E3A5F]">
                    <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Referencia Norma</p>
                    <p className="text-sm text-[#94A3B8] whitespace-pre-line">{doc.normRef}</p>
                  </div>
                  <div className="bg-[#0A1929] rounded-lg p-3 border border-[#1E3A5F]">
                    <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Responsable</p>
                    <p className="text-sm text-white">{doc.responsible}</p>
                  </div>
                  <div className="bg-[#0A1929] rounded-lg p-3 border border-[#1E3A5F]">
                    <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Estado</p>
                    <Badge className={doc.status === 'Completado' ? 'bg-[#00D4AA]/10 text-[#00D4AA]' :
                      doc.status === 'En Proceso' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                      'bg-[#334155]/10 text-[#64748B]'}>
                      {doc.status}
                    </Badge>
                  </div>
                </div>

                {doc.complianceTrace && (
                  <div className="rounded-lg border border-[#1E3A5F] bg-[#0A1929] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[#00D4AA] uppercase tracking-wider font-semibold">
                        Trazabilidad legal Chile
                      </p>
                      <Badge className="bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/30">
                        Auditoría Ready
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {doc.complianceTrace.legalReferences.map((ref, idx) => (
                        <div key={`${ref.body}-${ref.article}-${idx}`} className="rounded-md border border-[#1E3A5F] bg-[#112240] p-3">
                          <p className="text-sm text-white font-medium">
                            {ref.body} · {ref.article}
                          </p>
                          <p className="text-xs text-[#94A3B8] mt-1">{ref.title}</p>
                          <p className="text-[11px] text-[#64748B] mt-1">
                            Versión: {ref.version}{ref.effectiveDate ? ` · Vigencia: ${ref.effectiveDate}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-md border border-[#1E3A5F] bg-[#112240] p-3">
                      <p className="text-xs text-[#00D4AA] uppercase tracking-wider font-semibold mb-2">
                        Criterios mínimos de aceptación
                      </p>
                      <ul className="space-y-1">
                        {doc.complianceTrace.minimumAuditCriteria.map((criterion, idx) => (
                          <li key={`${idx}-${criterion}`} className="text-xs text-[#CBD5E1] list-disc ml-4">
                            {criterion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {(doc.status === 'Pendiente' || (doc.status === 'En Proceso' && !generatedContent)) && (
                <Button onClick={handleGenerate} disabled={generating}
                  className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888]">
                  {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Pipeline…</> : <><Bot className="w-4 h-4 mr-2" /> Generar (multiagente)</>}
                </Button>
              )}
              {doc.status === 'En Proceso' && generatedContent && (
                <Button onClick={() => setActiveTab('auditoria')} className="bg-[#F59E0B] text-[#0A1929] hover:bg-[#D97706]">
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Checklist ({auditProgress.done}/{auditProgress.total})
                </Button>
              )}
              {generatedContent && doc.status !== 'Pendiente' && (
                <Button size="sm" variant="outline" className="border-[#1E3A5F] text-[#94A3B8]" onClick={handleGenerate} disabled={generating}>
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Regenerar
                </Button>
              )}
              {canDownload && (
                <>
                  <Button size="sm" onClick={() => handleDownload()} className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888]">
                    <FileDown className="w-4 h-4 mr-2" /> Descargar .docx
                  </Button>
                  {company?.clientLogoPath && (
                    <Select value={company.brandingMode} onValueChange={(v) => handleDownload(v)}>
                      <SelectTrigger className="w-44 bg-[#112240] border-[#1E3A5F] text-white text-xs">
                        <SelectValue placeholder="Logo en documento" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#112240] border-[#1E3A5F]">
                        <SelectItem value="pulso">Solo marca {APP_PRODUCT_NAME}</SelectItem>
                        <SelectItem value="soldesp">Solo logo empresa</SelectItem>
                        <SelectItem value="both">Empresa + {APP_PRODUCT_NAME}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
              <Button variant="outline" onClick={() => { store.updateDocumentStatus(doc.number, 'No Aplica'); store.setCurrentView('dashboard'); }} className="border-[#1E3A5F] text-[#64748B]">
                <XCircle className="w-4 h-4 mr-2" /> Marcar No Aplica
              </Button>
              {generatedContent && (
                <Button
                  variant="outline"
                  onClick={runReviseVsPackage}
                  disabled={reviewingDoc}
                  className="border-[#8B5CF6]/40 text-[#C4B5FD] hover:bg-[#8B5CF6]/10"
                >
                  <Layers className="w-4 h-4 mr-2" /> Revisar vs. paquete SST
                </Button>
              )}
              <Button variant="outline" onClick={() => store.setCurrentView('adapt')} className="border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/10">
                <Wrench className="w-4 h-4 mr-2" /> Adaptar documento externo
              </Button>
              <Button variant="outline" onClick={() => store.setCurrentView('revise')} className="border-[#1E3A5F] text-[#94A3B8]">
                <Layers className="w-4 h-4 mr-2" /> Todos los previos
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {generatedContent ? (
              <Card className="bg-[#112240] border-[#1E3A5F]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-white">Vista Previa del Documento</CardTitle>
                  {canDownload ? (
                    <Button size="sm" onClick={() => handleDownload()} className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888]">
                      <FileDown className="w-4 h-4 mr-1" /> .docx
                    </Button>
                  ) : (
                    <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30 text-xs">
                      Completa el checklist para descargar
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-250px)]">
                    <div className="prose prose-invert max-w-none" ref={contentRef}>
                      {renderMarkdown(generatedContent)}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-16 bg-[#112240] rounded-xl border border-[#1E3A5F]">
                <FileText className="w-16 h-16 text-[#334155] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#64748B] mb-2">Documento no generado</h3>
                <p className="text-sm text-[#475569] mb-4">Genera el documento con IA para ver la vista previa</p>
                <Button onClick={handleGenerate} disabled={generating} className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888]">
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Generar Documento
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="auditoria" className="mt-4 space-y-4">
            {(generating || reviewingDoc || pipelineLog.length > 0) && (
              <AgentPipelineLog steps={pipelineLog} title="Agentes documento SST" />
            )}
            <AgentReviewPanel review={docAiReview} loading={(generating || reviewingDoc) && !docAiReview} />
            {generatedContent && docAiReview && !docAiReview.approved && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-[#F59E0B] text-[#0A1929]"
                  disabled={reviewingDoc}
                  onClick={() => runDocumentFixPipeline(generatedContent)}
                >
                  <Bot className="w-4 h-4 mr-1" /> Corregir con agentes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#1E3A5F] text-[#94A3B8]"
                  disabled={reviewingDoc}
                  onClick={() => runDocumentAgentReview(generatedContent)}
                >
                  Solo re-revisar
                </Button>
              </div>
            )}
            <DocumentAuditChecklist
              doc={doc}
              checks={doc.auditChecks ?? {}}
              onToggle={(id, checked) => store.updateAuditCheck(doc.number, id, checked)}
              hasGeneratedContent={Boolean(generatedContent)}
            />
            {generatedContent && (
              <div className="space-y-3">
                {needsAiApproval && (
                  <div className="flex items-start gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-3">
                    <Checkbox
                      id="force-close-ai"
                      checked={forceCloseWithoutAi}
                      onCheckedChange={(v) => setForceCloseWithoutAi(v === true)}
                    />
                    <Label htmlFor="force-close-ai" className="text-sm text-[#94A3B8] cursor-pointer leading-snug">
                      Cerrar sin aprobación de agentes (uso bajo su responsabilidad; los agentes reportaron observaciones)
                    </Label>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleFinalize}
                  disabled={!canFinalize}
                  className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888] disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marcar documento completado
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('preview')} className="border-[#1E3A5F] text-[#94A3B8]">
                  <Eye className="w-4 h-4 mr-2" /> Revisar contenido
                </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="firmas" className="mt-4">
            <ConfiguredSignatoriesPanel
              signatories={company?.signatories}
              rut={company?.rut}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
