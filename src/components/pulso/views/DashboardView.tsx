"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app-store';
import { CATEGORIES, DOCUMENT_CODES } from '@/lib/sst-documents';
import { resolveClientLogoUrl } from '@/lib/client-logo-url';
import { APP_PRODUCT_NAME } from '@/lib/product-brand';
import { CreatorCredit } from '@/components/pulso/CreatorCredit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Building2, Users, Search, Filter, Download, RefreshCw, ChevronRight, ChevronLeft, CheckCircle2, Clock, AlertTriangle, XCircle, Sparkles, Menu, X, Eye, Loader2, Zap, FileText, FileDown, Target, TrendingUp, Upload, ClipboardCheck, Wrench, ImageIcon, ImagePlus, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardView() {
  const store = useAppStore();
  const company = store.company;
  const stats = store.getProgressStats();
  const filteredDocs = store.getFilteredDocuments();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [generatingDoc, setGeneratingDoc] = useState<number | null>(null);

  const handleGenerate = async (doc) => {
    if (!company) return;
    setGeneratingDoc(doc.number);
    store.setIsGenerating(true);
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
        toast.success(`"${doc.name}" generado exitosamente`);
      } else {
        store.updateDocumentStatus(doc.number, 'Pendiente');
        toast.error(`Error: ${data.error}`);
      }
    } catch {
      store.updateDocumentStatus(doc.number, 'Pendiente');
      toast.error('Error de conexión al generar documento');
    } finally {
      setGeneratingDoc(null);
      store.setIsGenerating(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: (doc as any).generatedContent || '',
          docName: doc.name,
          docCode: DOCUMENT_CODES[doc.number] || `DOC-${doc.number}`,
          companyName: company?.name || '',
          rut: company?.rut || '',
          version: 1,
          brandingMode: company?.brandingMode || 'pulso',
          clientLogoPath: company?.clientLogoPath || '',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${DOCUMENT_CODES[doc.number] || `DOC-${doc.number}`}_${doc.name.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Documento descargado');
    } catch {
      toast.error('Error al descargar documento');
    }
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'Completado': return <CheckCircle2 className="w-4 h-4 text-[#00D4AA]" />;
      case 'En Proceso': return <Loader2 className="w-4 h-4 text-[#F59E0B] animate-spin" />;
      case 'No Aplica': return <XCircle className="w-4 h-4 text-[#64748B]" />;
      default: return <Clock className="w-4 h-4 text-[#475569]" />;
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'Completado': return 'bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/30';
      case 'En Proceso': return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30';
      case 'No Aplica': return 'bg-[#475569]/10 text-[#64748B] border-[#475569]/30';
      default: return 'bg-[#334155]/10 text-[#64748B] border-[#334155]/30';
    }
  };

  const getCategoryColor = (catId) => CATEGORIES.find(c => c.id === catId)?.color || '#00D4AA';

  return (
    <div className="min-h-screen circuit-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A1929]/95 backdrop-blur border-b border-[#1E3A5F]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="lg:hidden text-[#94A3B8]" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {company?.brandingMode !== 'soldesp' && (
                <>
                  <Shield className="w-6 h-6 text-[#00D4AA]" />
                  <span className="font-bold text-white text-lg hidden sm:inline">{APP_PRODUCT_NAME}</span>
                </>
              )}
              {company?.brandingMode === 'soldesp' && !company?.clientLogoPath && (
                <>
                  <Shield className="w-6 h-6 text-[#00D4AA]" />
                  <span className="font-bold text-white text-lg hidden sm:inline">{APP_PRODUCT_NAME}</span>
                </>
              )}
              {company?.brandingMode === 'both' && company?.clientLogoPath && (
                <Separator orientation="vertical" className="h-6 bg-[#1E3A5F] mx-1" />
              )}
              {(company?.brandingMode === 'soldesp' || company?.brandingMode === 'both') && company?.clientLogoPath && (
                <img src={resolveClientLogoUrl(company.clientLogoPath)} alt="Logo empresa" className="h-6 w-auto object-contain rounded" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Badge variant="outline" className="border-[#1E3A5F] text-[#94A3B8] hidden sm:flex">{company?.name || 'Empresa'}</Badge>
            <Badge variant="outline" className="border-[#1E3A5F] text-[#94A3B8] hidden md:flex">{company?.rut}</Badge>
            <Button variant="outline" size="sm" className="border-[#1E3A5F] text-[#94A3B8]" onClick={() => store.setCurrentView('fuf')}>
              <ClipboardCheck className="w-4 h-4 mr-1" /> FUF
            </Button>
            <Button size="sm" className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888] font-semibold" onClick={() => {
              const a = document.createElement('a');
              a.href = '/api/download';
              a.download = 'tools45000-pro-project.zip';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}>
              <FileDown className="w-4 h-4 mr-1" /> Descargar Proyecto
            </Button>
            <Button variant="outline" size="sm" className="border-[#1E3A5F] text-[#94A3B8]" onClick={() => store.setCurrentView('setup')}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-[57px] left-0 z-40 w-64 h-[calc(100vh-57px)] bg-[#0A1929] border-r border-[#1E3A5F] transition-transform lg:flex lg:flex-col shrink-0 overflow-hidden`}
        >
          <div className="p-4 space-y-2 flex-1 overflow-y-auto min-h-0">
            {/* Stats Cards */}
            <div className="bg-[#112240] rounded-xl p-3 border border-[#1E3A5F] mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#64748B] uppercase tracking-wider">Progreso General</span>
                <span className="text-lg font-bold text-[#00D4AA]">{stats.percentage}%</span>
              </div>
              <Progress value={stats.percentage} className="h-2 bg-[#1A3050]" />
              <div className="flex justify-between mt-2 text-xs text-[#64748B]">
                <span>{stats.completed} completados</span>
                <span>{stats.pending} pendientes</span>
              </div>
            </div>
            {/* Category Navigation */}
            <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-2 px-1">Categorías</div>
            {CATEGORIES.map(cat => {
              const catDocs = store.documents.filter(d => d.category === cat.id);
              const catDone = catDocs.filter(d => d.status === 'Completado').length;
              return (
                <button key={cat.id} onClick={() => store.setFilterCategory(store.filterCategory === cat.id ? 'all' : cat.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all ${store.filterCategory === cat.id ? 'bg-[#1A3050] text-white' : 'text-[#94A3B8] hover:bg-[#112240]'}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-left truncate text-xs">{cat.name}</span>
                  <span className="text-[10px] text-[#64748B]">{catDone}/{catDocs.length}</span>
                </button>
              );
            })}
            <Separator className="my-3 bg-[#1E3A5F]" />
            {/* Quick Filters */}
            <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-2 px-1">Filtros Rápidos</div>
            {[{label:'Todos',value:'all'},{label:'Alta Prioridad',value:'Alta'},{label:'Pendientes',value:'Pendiente'},{label:'Completados',value:'Completado'}].map(f => (
              <button key={f.value} onClick={() => {
                if (['Pendiente','Completado'].includes(f.value)) { store.setFilterStatus(f.value); store.setFilterPriority('all'); }
                else if (f.value === 'Alta') { store.setFilterPriority('Alta'); store.setFilterStatus('all'); }
                else { store.setFilterStatus('all'); store.setFilterPriority('all'); }
              }} className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-[#94A3B8] hover:bg-[#112240] transition-all">
                {f.label}
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-[#1E3A5F] bg-[#0A1929]/80 shrink-0">
            <CreatorCredit variant="inline" className="opacity-85 hover:opacity-100 transition-opacity" />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          {/* Search & Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <Input placeholder="Buscar documento..." value={store.searchQuery} onChange={e => store.setSearchQuery(e.target.value)} className="pl-10 bg-[#112240] border-[#1E3A5F] text-white placeholder:text-[#475569]" />
            </div>
            <div className="flex gap-2">
              <Select value={store.filterPriority} onValueChange={v => store.setFilterPriority(v)}>
                <SelectTrigger className="w-32 bg-[#112240] border-[#1E3A5F] text-white text-xs"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                <SelectContent className="bg-[#112240] border-[#1E3A5F]"><SelectItem value="all">Todas</SelectItem><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Media">Media</SelectItem></SelectContent>
              </Select>
              <Select value={store.filterStatus} onValueChange={v => store.setFilterStatus(v)}>
                <SelectTrigger className="w-36 bg-[#112240] border-[#1E3A5F] text-white text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent className="bg-[#112240] border-[#1E3A5F]"><SelectItem value="all">Todos</SelectItem><SelectItem value="Pendiente">Pendiente</SelectItem><SelectItem value="En Proceso">En Proceso</SelectItem><SelectItem value="Completado">Completado</SelectItem><SelectItem value="No Aplica">No Aplica</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#64748B]">{filteredDocs.length} de {store.documents.length} documentos</p>
            {(store.filterCategory !== 'all' || store.filterPriority !== 'all' || store.filterStatus !== 'all' || store.searchQuery) && (
              <Button variant="ghost" size="sm" className="text-[#00D4AA] text-xs h-7" onClick={() => { store.setFilterCategory('all'); store.setFilterPriority('all'); store.setFilterStatus('all'); store.setSearchQuery(''); }}>
                <X className="w-3 h-3 mr-1" /> Limpiar filtros
              </Button>
            )}
          </div>

          {/* Document List */}
          <div className="space-y-2">
            <AnimatePresence>
              {filteredDocs.map((doc, idx) => (
                <motion.div key={doc.number} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.02, 0.3) }}>
                  <Card className="bg-[#112240] border-[#1E3A5F] card-hover cursor-pointer group" onClick={() => { store.setSelectedDocNumber(doc.number); store.setCurrentView('document'); }}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <div className="hidden sm:flex flex-col items-center gap-1 pt-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(doc.category) }} />
                          <span className="text-[9px] text-[#475569]">{doc.category}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-[#475569] font-mono">{DOCUMENT_CODES[doc.number]}</span>
                            <Badge variant="outline" className={statusColor(doc.status)}>{statusIcon(doc.status)}<span className="ml-1 hidden sm:inline">{doc.status}</span></Badge>
                            {doc.priority === 'Alta' && (<Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">Alta</Badge>)}
                          </div>
                          <h3 className="text-sm font-medium text-white truncate group-hover:text-[#00D4AA] transition-colors">{doc.number}. {doc.name}</h3>
                          <p className="text-xs text-[#64748B] line-clamp-1 mt-1">{doc.description}</p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {doc.status === 'Pendiente' && (
                            <Button size="sm" className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888] text-xs h-7 px-2" disabled={generatingDoc === doc.number} onClick={() => handleGenerate(doc)}>
                              {generatingDoc === doc.number ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              <span className="hidden sm:inline ml-1">Generar</span>
                            </Button>
                          )}
                          {doc.status === 'Completado' && (
                            <>
                              <Button size="sm" variant="outline" className="border-[#1E3A5F] text-[#94A3B8] text-xs h-7 px-2" onClick={() => handleDownload(doc)}>
                                <FileDown className="w-3 h-3" />
                                <span className="hidden sm:inline ml-1">.docx</span>
                              </Button>
                              <Button size="sm" variant="ghost" className="text-[#64748B] text-xs h-7 px-2" onClick={() => { store.setSelectedDocNumber(doc.number); store.setCurrentView('document'); }}>
                                <Eye className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredDocs.length === 0 && (
              <div className="text-center py-12"><Search className="w-12 h-12 text-[#334155] mx-auto mb-4" /><p className="text-[#64748B]">No se encontraron documentos</p></div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
