import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { DOCUMENT_CODES } from '@/lib/sst-documents';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  FileDown,
  ClipboardCheck,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
  Upload,
  FileText,
  Wrench,
  Target,
  XCircle,
  Shield,
  Building2,
  GitCompare,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

export default function AdaptDocumentView() {
  const store = useAppStore();
  const company = store.company;
  const selectedDoc = store.documents.find(d => d.number === store.selectedDocNumber);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputTab, setInputTab] = useState<'file' | 'paste'>('file');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pastedContent, setPastedContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    gapReport: string;
    originalContent: string;
    updatedContent: string;
    changes: { id: number; section: string; original: string; proposed: string; accepted: boolean }[];
  } | null>(null);
  const [resultTab, setResultTab] = useState('gaps');
  const [isDragOver, setIsDragOver] = useState(false);

  const acceptedExtensions = ['.docx', '.pdf', '.odt', '.txt'];

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedExtensions.includes(ext)) {
      toast.error('Formato no soportado. Use .docx, .pdf, .odt o .txt');
      return;
    }
    setUploadedFile(file);
    toast.success(`Archivo "${file.name}" cargado correctamente`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleAnalyze = async () => {
    if (!selectedDoc || !company) {
      toast.error('Debe seleccionar un documento y tener empresa configurada');
      return;
    }
    if (inputTab === 'file' && !uploadedFile) {
      toast.error('Debe subir un archivo primero');
      return;
    }
    if (inputTab === 'paste' && !pastedContent.trim()) {
      toast.error('Debe pegar el contenido del documento');
      return;
    }
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('docNumber', String(selectedDoc.number));
      formData.append('docName', selectedDoc.name);
      formData.append('companyName', company.name);
      formData.append('rut', company.rut);
      formData.append('business', company.business);
      formData.append('size', company.size);
      formData.append('workerCount', String(company.workerCount));
      formData.append('sector', company.sector);

      if (inputTab === 'file' && uploadedFile) {
        formData.append('file', uploadedFile);
      } else {
        formData.append('content', pastedContent);
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.result);
        setResultTab('gaps');
        toast.success('Análisis completado exitosamente');
      } else {
        toast.error(data.error || 'Error al analizar el documento');
      }
    } catch {
      toast.error('Error de conexión al analizar');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleChange = (changeId: number) => {
    if (!analysisResult) return;
    setAnalysisResult({
      ...analysisResult,
      changes: analysisResult.changes.map(c =>
        c.id === changeId ? { ...c, accepted: !c.accepted } : c
      ),
    });
  };

  const handleAcceptAll = () => {
    if (!analysisResult) return;
    setAnalysisResult({
      ...analysisResult,
      changes: analysisResult.changes.map(c => ({ ...c, accepted: true })),
    });
  };

  const handleRejectAll = () => {
    if (!analysisResult) return;
    setAnalysisResult({
      ...analysisResult,
      changes: analysisResult.changes.map(c => ({ ...c, accepted: false })),
    });
  };

  const handleSaveAsUpdated = () => {
    if (!analysisResult || !selectedDoc) return;
    const acceptedChanges = analysisResult.changes.filter(c => c.accepted);
    if (acceptedChanges.length === 0) {
      toast.error('No hay cambios aceptados para guardar');
      return;
    }
    store.updateDocumentContent(selectedDoc.number, analysisResult.updatedContent);
    store.updateDocumentStatus(selectedDoc.number, 'Completado');
    toast.success('Documento actualizado guardado exitosamente');
    store.setCurrentView('document');
  };

  const renderMarkdown = (md: string) => {
    const lines = md.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      if (trimmed.startsWith('### '))
        return <h3 key={i} className="text-base font-semibold text-[#00D4AA] mt-4 mb-2">{trimmed.slice(4)}</h3>;
      if (trimmed.startsWith('## '))
        return <h2 key={i} className="text-lg font-semibold text-[#00D4AA] mt-6 mb-3">{trimmed.slice(3)}</h2>;
      if (trimmed.startsWith('# '))
        return <h1 key={i} className="text-xl font-bold text-white mt-6 mb-4">{trimmed.slice(2)}</h1>;
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li
            key={i}
            className="text-sm text-[#CBD5E1] ml-4 list-disc"
            dangerouslySetInnerHTML={{
              __html: trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>'),
            }}
          />
        );
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <li
            key={i}
            className="text-sm text-[#CBD5E1] ml-4 list-decimal"
            dangerouslySetInnerHTML={{
              __html: trimmed.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>'),
            }}
          />
        );
      }
      if (trimmed.startsWith('---')) return <hr key={i} className="border-[#1E3A5F] my-4" />;
      return (
        <p
          key={i}
          className="text-sm text-[#CBD5E1] leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: trimmed
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>'),
          }}
        />
      );
    });
  };

  if (!selectedDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center circuit-bg">
        <p className="text-[#64748B]">No se ha seleccionado un documento</p>
      </div>
    );
  }

  const acceptedCount = analysisResult?.changes.filter(c => c.accepted).length ?? 0;
  const totalChanges = analysisResult?.changes.length ?? 0;

  return (
    <div className="min-h-screen circuit-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A1929]/95 backdrop-blur border-b border-[#1E3A5F]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" className="text-[#94A3B8]" onClick={() => store.setCurrentView('document')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Documento
          </Button>
          <Separator orientation="vertical" className="h-6 bg-[#1E3A5F]" />
          <Wrench className="w-5 h-5 text-[#00D4AA]" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-white">Adaptar Documento Existente</h1>
            <p className="text-xs text-[#64748B] truncate">
              {selectedDoc.number}. {selectedDoc.name}
            </p>
          </div>
          {analysisResult && (
            <Badge className="bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/30">
              {acceptedCount}/{totalChanges} cambios aceptados
            </Badge>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Current Document Info */}
        <Card className="bg-[#112240] border-[#1E3A5F]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0A1929] border border-[#1E3A5F] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#00D4AA]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{selectedDoc.name}</p>
                <p className="text-xs text-[#64748B]">
                  {DOCUMENT_CODES[selectedDoc.number]} • {company?.name || 'Empresa'} • {company?.rut || ''}
                </p>
              </div>
              <Badge variant="outline" className="border-[#1E3A5F] text-[#94A3B8]">
                {selectedDoc.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {!analysisResult ? (
          // Upload Section
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-[#112240] border-[#1E3A5F]">
              <CardHeader>
                <CardTitle className="text-[#00D4AA] flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Cargar Documento a Adaptar
                </CardTitle>
                <CardDescription className="text-[#94A3B8]">
                  Suba un documento existente o pegue su contenido para que la IA lo analice y adapte a la normativa SST vigente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={inputTab} onValueChange={v => setInputTab(v as 'file' | 'paste')}>
                  <TabsList className="bg-[#0A1929] border border-[#1E3A5F]">
                    <TabsTrigger
                      value="file"
                      className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#00D4AA] text-[#94A3B8]"
                    >
                      <Upload className="w-4 h-4 mr-1" /> Subir Archivo
                    </TabsTrigger>
                    <TabsTrigger
                      value="paste"
                      className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#00D4AA] text-[#94A3B8]"
                    >
                      <ClipboardCheck className="w-4 h-4 mr-1" /> Pegar Contenido
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="file" className="mt-4">
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                        isDragOver
                          ? 'border-[#00D4AA] bg-[#00D4AA]/5'
                          : uploadedFile
                          ? 'border-[#00D4AA]/50 bg-[#00D4AA]/5'
                          : 'border-[#1E3A5F] hover:border-[#334155] bg-[#0A1929]'
                      }`}
                      onDragOver={e => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={acceptedExtensions.join(',')}
                        className="hidden"
                        onChange={e => handleFileSelect(e.target.files)}
                      />
                      {uploadedFile ? (
                        <div className="space-y-2">
                          <CheckCircle2 className="w-12 h-12 text-[#00D4AA] mx-auto" />
                          <p className="text-sm font-medium text-white">{uploadedFile.name}</p>
                          <p className="text-xs text-[#64748B]">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#1E3A5F] text-[#94A3B8] mt-2"
                            onClick={e => {
                              e.stopPropagation();
                              setUploadedFile(null);
                            }}
                          >
                            <X className="w-3 h-3 mr-1" /> Cambiar archivo
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-12 h-12 text-[#475569] mx-auto" />
                          <p className="text-sm text-[#94A3B8]">Arrastre un archivo aquí o haga clic para seleccionar</p>
                          <p className="text-xs text-[#64748B]">Formatos soportados: .docx, .pdf, .odt, .txt</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="paste" className="mt-4">
                    <Textarea
                      value={pastedContent}
                      onChange={e => setPastedContent(e.target.value)}
                      placeholder="Pegue aquí el contenido de su documento existente..."
                      className="min-h-[200px] bg-[#0A1929] border border-[#1E3A5F] text-white placeholder:text-[#475569] resize-y focus:border-[#00D4AA] focus:ring-0"
                    />
                  </TabsContent>
                </Tabs>

                {/* Analyze Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleAnalyze}
                    disabled={
                      analyzing ||
                      (inputTab === 'file' && !uploadedFile) ||
                      (inputTab === 'paste' && !pastedContent.trim())
                    }
                    className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888] font-semibold"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" /> Analizar con IA
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          // Results Section
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="border-[#1E3A5F] text-[#94A3B8]" onClick={() => setAnalysisResult(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Nuevo Análisis
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="border-[#00D4AA]/30 text-[#00D4AA] hover:bg-[#00D4AA]/10"
                onClick={handleAcceptAll}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Aceptar Todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/10"
                onClick={handleRejectAll}
              >
                <XCircle className="w-4 h-4 mr-1" /> Rechazar Todo
              </Button>
              <Button
                size="sm"
                className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888]"
                onClick={handleSaveAsUpdated}
              >
                <FileDown className="w-4 h-4 mr-1" /> Guardar como Versión Actualizada
              </Button>
            </div>

            {/* Result Tabs */}
            <Tabs value={resultTab} onValueChange={setResultTab}>
              <TabsList className="bg-[#112240] border border-[#1E3A5F]">
                <TabsTrigger
                  value="gaps"
                  className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#00D4AA] text-[#94A3B8]"
                >
                  <Target className="w-4 h-4 mr-1" /> Informe de Brechas
                </TabsTrigger>
                <TabsTrigger
                  value="compare"
                  className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#00D4AA] text-[#94A3B8]"
                >
                  <GitCompare className="w-4 h-4 mr-1" /> Original vs Propuesta
                </TabsTrigger>
                <TabsTrigger
                  value="updated"
                  className="data-[state=active]:bg-[#1A3050] data-[state=active]:text-[#00D4AA] text-[#94A3B8]"
                >
                  <FileCheck className="w-4 h-4 mr-1" /> Documento Actualizado
                </TabsTrigger>
              </TabsList>

              {/* Gap Report Tab */}
              <TabsContent value="gaps" className="mt-4">
                <Card className="bg-[#112240] border-[#1E3A5F]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-[#00D4AA]" />
                      Informe de Brechas Normativas
                    </CardTitle>
                    <CardDescription className="text-[#94A3B8]">
                      Análisis de las diferencias entre el documento original y los requisitos de la normativa SST vigente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[calc(100vh-350px)]">
                      <div className="prose prose-invert max-w-none">{renderMarkdown(analysisResult.gapReport)}</div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Comparison Tab */}
              <TabsContent value="compare" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Original */}
                  <Card className="bg-[#112240] border-[#1E3A5F]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#F59E0B]" />
                        Documento Original
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[calc(100vh-350px)]">
                        <div className="prose prose-invert max-w-none">{renderMarkdown(analysisResult.originalContent)}</div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Updated */}
                  <Card className="bg-[#112240] border-[#00D4AA]/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-[#00D4AA]" />
                        Documento Propuesto
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[calc(100vh-350px)]">
                        <div className="prose prose-invert max-w-none">{renderMarkdown(analysisResult.updatedContent)}</div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Changes List */}
                <Card className="bg-[#112240] border-[#1E3A5F] mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-[#00D4AA]" /> Cambios Propuestos ({totalChanges})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-96 overflow-y-auto">
                      <div className="space-y-2">
                        {analysisResult.changes.map(change => (
                          <div
                            key={change.id}
                            className={`rounded-lg border p-3 transition-all ${
                              change.accepted ? 'bg-[#00D4AA]/5 border-[#00D4AA]/30' : 'bg-[#0A1929] border-[#1E3A5F]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-[#00D4AA] mb-1">{change.section}</p>
                                <p className="text-xs text-[#F59E0B] line-clamp-2 mb-1">
                                  <span className="text-[#64748B]">Original: </span>{change.original}
                                </p>
                                <p className="text-xs text-[#00D4AA] line-clamp-2">
                                  <span className="text-[#64748B]">Propuesto: </span>{change.proposed}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant={change.accepted ? 'default' : 'outline'}
                                  className={
                                    change.accepted
                                      ? 'bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888] h-7 w-7 p-0'
                                      : 'border-[#1E3A5F] text-[#94A3B8] h-7 w-7 p-0 hover:bg-[#00D4AA]/10 hover:text-[#00D4AA]'
                                  }
                                  onClick={() => handleToggleChange(change.id)}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={!change.accepted ? 'default' : 'outline'}
                                  className={
                                    !change.accepted
                                      ? 'bg-red-500/80 text-white hover:bg-red-500 h-7 w-7 p-0'
                                      : 'border-[#1E3A5F] text-[#94A3B8] h-7 w-7 p-0 hover:bg-red-500/10 hover:text-red-400'
                                  }
                                  onClick={() => handleToggleChange(change.id)}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Updated Document Tab */}
              <TabsContent value="updated" className="mt-4">
                <Card className="bg-[#112240] border-[#00D4AA]/30">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-[#00D4AA]" />
                      Documento Actualizado
                    </CardTitle>
                    <Button
                      size="sm"
                      className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888]"
                      onClick={handleSaveAsUpdated}
                    >
                      <FileDown className="w-4 h-4 mr-1" /> Guardar como Versión Actualizada
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[calc(100vh-350px)]">
                      <div className="prose prose-invert max-w-none">{renderMarkdown(analysisResult.updatedContent)}</div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </div>
  );
}
