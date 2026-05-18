'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { BowtieDiagram } from '@/components/pulso/BowtieDiagram';
import { AgentPipelineLog } from '@/components/pulso/AgentPipelineLog';
import { AgentReviewPanel } from '@/components/pulso/AgentReviewPanel';
import type { AgentReviewResult, AgentStepLog } from '@/lib/agents/types';
import { encodeBowtie } from '@/lib/bowtie/encode';
import { renderBowtieSvg } from '@/lib/bowtie/render-svg';
import type { BowtieAnalysisRecord, BowtieModel } from '@/lib/bowtie/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  FileDown,
  GitBranch,
  AlertTriangle,
  Save,
  Trash2,
  Copy,
  Bot,
  ShieldCheck,
} from 'lucide-react';

export default function BowtieView() {
  const store = useAppStore();
  const company = store.company;
  const records = store.bowtieRecords;

  const [title, setTitle] = useState('');
  const [hazard, setHazard] = useState('');
  const [topEvent, setTopEvent] = useState('');
  const [activity, setActivity] = useState('');
  const [area, setArea] = useState('');
  const [criticality, setCriticality] = useState<'critico' | 'alto'>('critico');
  const [context, setContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [draftModel, setDraftModel] = useState<BowtieModel | null>(null);
  const [draftMarkdown, setDraftMarkdown] = useState('');
  const [draftSvg, setDraftSvg] = useState('');
  const [review, setReview] = useState<AgentReviewResult | null>(null);
  const [pipelineLog, setPipelineLog] = useState<AgentStepLog[]>([]);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  useEffect(() => {
    if (company?.id) void store.syncBowtiesFromApi();
  }, [company?.id]);

  const selected = records.find((r) => r.id === selectedId);
  const displayModel = draftModel ?? selected?.model ?? null;
  const displaySvg =
    draftSvg || selected?.svgDiagram || (displayModel ? renderBowtieSvg(displayModel) : '');
  const displayMd = draftMarkdown || selected?.markdown || '';
  const exportApproved = Boolean(review?.approved || saveAsDraft);

  const handleGenerate = async () => {
    if (!company) {
      toast.error('Configure la empresa primero');
      return;
    }
    if (!title.trim() || !hazard.trim() || !topEvent.trim()) {
      toast.error('Complete título, peligro y evento central');
      return;
    }
    setGenerating(true);
    setReview(null);
    setPipelineLog([
      { agent: 'bowtie-generator', label: 'Iniciando pipeline multiagente…', status: 'running', startedAt: new Date().toISOString() },
    ]);
    try {
      const res = await fetch('/api/bowtie/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          hazard,
          topEvent,
          activity,
          area,
          criticality,
          context,
          companyName: company.name,
          rut: company.rut,
          sector: company.sector,
          workerCount: company.workerCount,
          existingCodes: records.map((r) => r.model.code),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Error al generar');
        return;
      }
      setDraftModel(data.model);
      setDraftMarkdown(data.markdown);
      setDraftSvg(data.svgDiagram);
      setReview(data.review);
      setPipelineLog(data.pipelineLog ?? []);
      setSelectedId(null);
      setSaveAsDraft(false);
      if (data.review?.approved) {
        toast.success(`Bowtie aprobado por agentes (${data.review.score}%)`);
      } else {
        toast.warning(`Bowtie generado con observaciones (${data.review?.score ?? 0}%). Revise hallazgos.`);
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGenerating(false);
    }
  };

  const handleReReview = async () => {
    if (!displayModel) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/bowtie/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: displayModel, sector: company?.sector, workerCount: company?.workerCount }),
      });
      const data = await res.json();
      if (data.success) {
        setReview(data.review);
        toast.success(data.review.approved ? 'Re-aprobado' : 'Aún con hallazgos');
      }
    } catch {
      toast.error('Error al re-revisar');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!displayModel || !company) return;
    if (!exportApproved) {
      toast.error('Apruebe el Bowtie con los agentes o guarde como borrador');
      return;
    }
    const now = new Date().toISOString();
    const record: BowtieAnalysisRecord = {
      id: selected?.id ?? `local-${Date.now()}`,
      companyId: company.id,
      model: displayModel,
      markdown: displayMd,
      svgDiagram: displaySvg,
      status: review?.approved ? 'aprobado' : 'generado',
      createdAt: selected?.createdAt ?? now,
      updatedAt: now,
    };
    store.upsertBowtieRecord(record);
    const serverId = await store.persistBowtieToApi(record);
    if (serverId) {
      setSelectedId(serverId);
      setDraftModel(null);
      setDraftMarkdown('');
      setDraftSvg('');
    } else {
      setSelectedId(record.id);
    }
    toast.success('Bowtie guardado');
  };

  const handleDownloadDocx = async () => {
    if (!displayModel || !company) return;
    if (!review?.approved) {
      toast.error('Solo puede exportar Word tras aprobación del pipeline multiagente');
      return;
    }
    try {
      const res = await fetch('/api/bowtie/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: displayModel,
          markdown: displayMd,
          companyName: company.name,
          rut: company.rut,
        }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${displayModel.code}_bowtie.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Word descargado');
    } catch {
      toast.error('Error al generar Word');
    }
  };

  const handleCopyJson = () => {
    if (!displayModel) return;
    void navigator.clipboard.writeText(encodeBowtie(displayModel));
    toast.success('JSON codificado copiado');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este análisis Bowtie?')) return;
    if (!id.startsWith('local-')) {
      await fetch(`/api/bowtie?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
    store.removeBowtieRecord(id);
    if (selectedId === id) setSelectedId(null);
    toast.success('Eliminado');
  };

  const loadRecord = (r: BowtieAnalysisRecord) => {
    setSelectedId(r.id);
    setDraftModel(null);
    setDraftMarkdown('');
    setDraftSvg('');
    setReview(null);
    setPipelineLog([]);
    setTitle(r.model.title);
    setHazard(r.model.hazard);
    setTopEvent(r.model.topEvent);
    setActivity(r.model.activity);
    setArea(r.model.area);
    setCriticality(r.model.criticality);
  };

  return (
    <div className="min-h-screen circuit-bg">
      <header className="sticky top-0 z-50 bg-[#0A1929]/95 backdrop-blur border-b border-[#1E3A5F]">
        <div className="flex items-center gap-3 px-4 py-3 max-w-6xl mx-auto">
          <Button variant="ghost" size="sm" className="text-[#94A3B8]" onClick={() => store.setCurrentView('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <GitBranch className="w-6 h-6 text-[#F97316]" />
          <div>
            <h1 className="text-white font-semibold">Análisis Bowtie — Riesgos críticos</h1>
            <p className="text-xs text-[#64748B]">Codificación automática · Diagrama · Word · Vinculado a MIPER</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-[#112240] border-[#1E3A5F]">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#F97316]" />
                Identificar riesgo crítico
              </CardTitle>
              <CardDescription className="text-[#94A3B8]">
                La IA genera amenazas, barreras y consecuencias en formato Bowtie codificado (JSON).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-[#94A3B8]">Título del riesgo</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Caída desde altura en mantención" className="bg-[#0A1929] border-[#1E3A5F] text-white mt-1" />
              </div>
              <div>
                <Label className="text-[#94A3B8]">Peligro</Label>
                <Input value={hazard} onChange={(e) => setHazard(e.target.value)} placeholder="Trabajo en altura sin control" className="bg-[#0A1929] border-[#1E3A5F] text-white mt-1" />
              </div>
              <div>
                <Label className="text-[#94A3B8]">Evento central (Top Event)</Label>
                <Input value={topEvent} onChange={(e) => setTopEvent(e.target.value)} placeholder="Caída de persona desde ≥ 1,8 m" className="bg-[#0A1929] border-[#1E3A5F] text-white mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[#94A3B8]">Actividad</Label>
                  <Input value={activity} onChange={(e) => setActivity(e.target.value)} className="bg-[#0A1929] border-[#1E3A5F] text-white mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-[#94A3B8]">Área</Label>
                  <Input value={area} onChange={(e) => setArea(e.target.value)} className="bg-[#0A1929] border-[#1E3A5F] text-white mt-1 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-[#94A3B8]">Criticidad</Label>
                <Select value={criticality} onValueChange={(v) => setCriticality(v as 'critico' | 'alto')}>
                  <SelectTrigger className="bg-[#0A1929] border-[#1E3A5F] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#112240] border-[#1E3A5F]">
                    <SelectItem value="critico">Crítico</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#94A3B8]">Contexto (opcional)</Label>
                <Textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} className="bg-[#0A1929] border-[#1E3A5F] text-white mt-1 text-sm" placeholder="Contratista, faena minera, turno noche..." />
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full bg-[#F97316] text-[#0A1929] hover:bg-[#EA580C]">
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
                Pipeline multiagente (Generar → Revisar → Corregir)
              </Button>
              <p className="text-[10px] text-[#64748B] text-center">
                3 agentes: generador, auditor SST, corrector normativo
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#112240] border-[#1E3A5F]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Registros guardados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {records.length === 0 && <p className="text-xs text-[#64748B]">Sin Bowties guardados</p>}
              {records.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => loadRecord(r)}
                  className={`w-full text-left rounded-lg border p-2 text-sm transition-colors ${
                    selectedId === r.id ? 'border-[#F97316] bg-[#F97316]/10' : 'border-[#1E3A5F] hover:border-[#334155]'
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-white font-medium truncate">{r.model.title}</span>
                    <Badge className={r.model.criticality === 'critico' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}>
                      {r.model.criticality}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-[#64748B] font-mono mt-1">{r.model.code}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {(generating || pipelineLog.length > 0) && (
            <AgentPipelineLog steps={pipelineLog} title="Agentes Bowtie" />
          )}
          {!displayModel ? (
            <Card className="bg-[#112240] border-[#1E3A5F]">
              <CardContent className="py-16 text-center">
                <GitBranch className="w-14 h-14 text-[#334155] mx-auto mb-4" />
                <p className="text-[#64748B]">Identifique un riesgo crítico y pulse Generar Bowtie automático</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <AgentReviewPanel review={review} loading={generating && !review} />
              <div className="flex flex-wrap gap-2 items-center">
                <Badge className="bg-[#1E4FA1]/20 text-blue-300 border border-blue-500/30 font-mono">{displayModel.code}</Badge>
                {review?.approved && (
                  <Badge className="bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/30">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Aprobado agentes
                  </Badge>
                )}
                <Button size="sm" onClick={handleSave} className="bg-[#00D4AA] text-[#0A1929] disabled:opacity-40" disabled={!exportApproved}>
                  <Save className="w-4 h-4 mr-1" /> Guardar
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadDocx} className="border-[#1E3A5F] text-[#94A3B8] disabled:opacity-40" disabled={!review?.approved}>
                  <FileDown className="w-4 h-4 mr-1" /> Word
                </Button>
                <Button size="sm" variant="outline" onClick={handleCopyJson} className="border-[#1E3A5F] text-[#94A3B8]">
                  <Copy className="w-4 h-4 mr-1" /> JSON
                </Button>
                <Button size="sm" variant="ghost" onClick={handleReReview} disabled={generating} className="text-[#94A3B8] text-xs">
                  Re-revisar
                </Button>
                {!review?.approved && (
                  <label className="flex items-center gap-1 text-xs text-[#64748B] cursor-pointer">
                    <input type="checkbox" checked={saveAsDraft} onChange={(e) => setSaveAsDraft(e.target.checked)} className="rounded" />
                    Guardar como borrador
                  </label>
                )}
                {selectedId && (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(selectedId)} className="text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <Tabs defaultValue="diagrama">
                <TabsList className="bg-[#112240] border border-[#1E3A5F]">
                  <TabsTrigger value="diagrama" className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#F97316]">Diagrama</TabsTrigger>
                  <TabsTrigger value="documento" className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#F97316]">Documento</TabsTrigger>
                  <TabsTrigger value="codigo" className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#F97316]">Codificación</TabsTrigger>
                </TabsList>
                <TabsContent value="diagrama" className="mt-3">
                  <BowtieDiagram svg={displaySvg} />
                </TabsContent>
                <TabsContent value="documento" className="mt-3">
                  <Card className="bg-[#112240] border-[#1E3A5F]">
                    <CardContent className="p-4">
                      <ScrollArea className="h-[420px]">
                        <pre className="text-xs text-[#CBD5E1] whitespace-pre-wrap font-sans">{displayMd}</pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="codigo" className="mt-3">
                  <Card className="bg-[#112240] border-[#1E3A5F]">
                    <CardContent className="p-4">
                      <ScrollArea className="h-[420px]">
                        <pre className="text-[10px] text-[#94A3B8] font-mono">{encodeBowtie(displayModel)}</pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
