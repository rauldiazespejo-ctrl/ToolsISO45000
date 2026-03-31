'use client';
import { useState, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { CATEGORIES, DOCUMENT_CODES } from '@/lib/sst-documents';
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
import { FileText, Loader2, Sparkles, ArrowLeft, XCircle, CheckCircle2, RefreshCw, Eye, FileDown, ClipboardCheck, Settings, Shield, Menu, X, Wrench } from 'lucide-react';
import { APP_PRODUCT_NAME } from '@/lib/product-brand';

export default function DocumentDetailView() {
  const store = useAppStore();
  const doc = store.documents.find(d => d.number === store.selectedDocNumber);
  const company = store.company;
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const contentRef = useRef<HTMLDivElement>(null);

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#64748B]">Documento no encontrado</p>
      </div>
    );
  }

  const category = CATEGORIES.find(c => c.id === doc.category);

  const handleGenerate = async () => {
    if (!company) return;
    setGenerating(true);
    store.updateDocumentStatus(doc.number, 'En Proceso');
    try {
      const res = await fetch('/api/generate', {
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
        setActiveTab('preview');
        toast.success('Documento generado exitosamente');
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
    try {
      const mode = docBrandingMode || company?.brandingMode || 'pulso';
      const res = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: (doc as any).generatedContent || '',
          docName: doc.name,
          docCode: DOCUMENT_CODES[doc.number] || `SIG-DOC-${doc.number}`,
          companyName: company?.name || '',
          rut: company?.rut || '',
          version: 1,
          brandingMode: mode,
          clientLogoPath: company?.clientLogoPath || '',
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
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {doc.status !== 'Completado' && (
                <Button onClick={handleGenerate} disabled={generating}
                  className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888]">
                  {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generar con IA</>}
                </Button>
              )}
              {doc.status === 'Completado' && (
                <>
                  <Button size="sm" variant="outline" className="border-[#1E3A5F] text-[#94A3B8]" onClick={handleGenerate} disabled={generating}>
                    {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Regenerar
                  </Button>
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
              <Button variant="outline" onClick={() => store.setCurrentView('adapt')} className="border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/10">
                <Wrench className="w-4 h-4 mr-2" /> Adaptar Documento Existente
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {(doc as any).generatedContent ? (
              <Card className="bg-[#112240] border-[#1E3A5F]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-white">Vista Previa del Documento</CardTitle>
                  <Button size="sm" onClick={() => handleDownload()} className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888]">
                    <FileDown className="w-4 h-4 mr-1" /> .docx
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-250px)]">
                    <div className="prose prose-invert max-w-none" ref={contentRef}>
                      {renderMarkdown((doc as any).generatedContent)}
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
        </Tabs>
      </div>
    </div>
  );
}
