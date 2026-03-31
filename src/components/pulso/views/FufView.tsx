import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ArrowLeft, ClipboardCheck, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function FufView() {
  const store = useAppStore();
  const stats = store.getProgressStats();

  const sections = [
    { name: 'A. Fundamentos (1-6)', docs: store.documents.filter(d => d.category === 'A') },
    { name: 'B. Instrumentos de Gestión (7-11)', docs: store.documents.filter(d => d.category === 'B') },
    { name: 'C. Operación y Control (12-19)', docs: store.documents.filter(d => d.category === 'C') },
    { name: 'D. Participación y Organización (20-24)', docs: store.documents.filter(d => d.category === 'D') },
    { name: 'E. Documentación (25-27)', docs: store.documents.filter(d => d.category === 'E') },
    { name: 'F. Emergencias (28-30)', docs: store.documents.filter(d => d.category === 'F') },
    { name: 'G. Vigilancia (31-32)', docs: store.documents.filter(d => d.category === 'G') },
    { name: 'H. Incidentes (33-35)', docs: store.documents.filter(d => d.category === 'H') },
    { name: 'I. Formación (36-37)', docs: store.documents.filter(d => d.category === 'I') },
    { name: 'J. Comunicación (38-39)', docs: store.documents.filter(d => d.category === 'J') },
    { name: 'K. Evaluación (40-44)', docs: store.documents.filter(d => d.category === 'K') },
    { name: 'L. Fiscalización (45-46)', docs: store.documents.filter(d => d.category === 'L') },
  ];

  return (
    <div className="min-h-screen circuit-bg">
      <header className="sticky top-0 z-50 bg-[#0A1929]/95 backdrop-blur border-b border-[#1E3A5F]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" className="text-[#94A3B8]" onClick={() => store.setCurrentView('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <Separator orientation="vertical" className="h-6 bg-[#1E3A5F]" />
          <ClipboardCheck className="w-5 h-5 text-[#00D4AA]" />
          <h1 className="text-lg font-semibold text-white">Autoevaluación FUF DS 44</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Overall Score */}
        <Card className="bg-[#112240] border-[#1E3A5F]">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1E3A5F" strokeWidth={8} />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#00D4AA" strokeWidth={8}
                    strokeDasharray={`${stats.percentage * 2.64} 264`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#00D4AA]">{stats.percentage}%</span>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold text-white mb-1">Nivel de Cumplimiento</h2>
                <p className="text-sm text-[#94A3B8] mb-3">Formulario Único de Fiscalización - DS 44</p>
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <div className="text-center px-3"><div className="text-lg font-bold text-[#00D4AA]">{stats.completed}</div><div className="text-[10px] text-[#64748B]">Cumple</div></div>
                  <div className="text-center px-3"><div className="text-lg font-bold text-[#F59E0B]">{stats.inProgress}</div><div className="text-[10px] text-[#64748B]">En Proceso</div></div>
                  <div className="text-center px-3"><div className="text-lg font-bold text-[#475569]">{stats.pending}</div><div className="text-[10px] text-[#64748B]">Pendiente</div></div>
                  <div className="text-center px-3"><div className="text-lg font-bold text-[#64748B]">{stats.notApplicable}</div><div className="text-[10px] text-[#64748B]">No Aplica</div></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections Checklist */}
        {sections.map(section => {
          const completed = section.docs.filter(d => d.status === 'Completado').length;
          const total = section.docs.length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          return (
            <Card key={section.name} className="bg-[#112240] border-[#1E3A5F]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-white">{section.name}</CardTitle>
                  <span className={`text-sm font-bold ${pct === 100 ? 'text-[#00D4AA]' : pct > 0 ? 'text-[#F59E0B]' : 'text-[#475569]'}`}>
                    {completed}/{total} ({pct}%)
                  </span>
                </div>
                <Progress value={pct} className="h-1.5 bg-[#1A3050] mt-2" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {section.docs.map(doc => (
                    <div key={doc.number} className="flex items-center gap-2 py-1 text-xs">
                      {doc.status === 'Completado' ? <CheckCircle2 className="w-4 h-4 text-[#00D4AA] shrink-0" /> :
                        doc.status === 'No Aplica' ? <XCircle className="w-4 h-4 text-[#475569] shrink-0" /> :
                          doc.status === 'En Proceso' ? <Loader2 className="w-4 h-4 text-[#F59E0B] shrink-0" /> :
                            <div className="w-4 h-4 rounded border border-[#334155] shrink-0" />}
                      <span className={`flex-1 ${doc.status === 'Completado' ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                        {doc.number}. {doc.name}
                      </span>
                      {doc.status === 'Pendiente' && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-[#00D4AA]"
                          onClick={() => { store.setSelectedDocNumber(doc.number); store.setCurrentView('document'); }}>
                          Generar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Disclaimer */}
        <div className="bg-[#0A1929] rounded-xl p-4 border border-[#F59E0B]/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
            <div className="text-sm text-[#94A3B8]">
              <p className="text-[#F59E0B] font-semibold mb-1">Nota Importante</p>
              Esta autoevaluación es una herramienta de apoyo. Los documentos generados deben ser revisados por profesionales competentes en SST antes de su implementación.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
