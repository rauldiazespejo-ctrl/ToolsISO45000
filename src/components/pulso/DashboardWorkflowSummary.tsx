'use client';

import { useAppStore } from '@/store/app-store';
import { areSignatoriesComplete } from '@/lib/signatory-validation';
import { Bot, ClipboardCheck, PenLine, Layers } from 'lucide-react';

export function DashboardWorkflowSummary() {
  const store = useAppStore();
  const wf = store.getWorkflowStats();
  const sig = areSignatoriesComplete(store.company?.signatories);

  const rows = [
    { icon: Bot, label: 'Con contenido IA', value: wf.withContent, color: 'text-[#94A3B8]' },
    { icon: Bot, label: 'Aprobados por agentes', value: wf.aiApproved, color: 'text-[#00D4AA]' },
    { icon: Bot, label: 'Pend. corrección IA', value: wf.awaitingAi, color: 'text-[#F59E0B]' },
    { icon: ClipboardCheck, label: 'Checklist listo', value: wf.checklistReady, color: 'text-[#8B5CF6]' },
  ];

  return (
    <div className="bg-[#0A1929]/80 rounded-lg border border-[#1E3A5F] p-2 space-y-1.5 mb-3">
      <p className="text-[10px] text-[#475569] uppercase tracking-wider px-1">Flujo profesional</p>
      {rows.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center justify-between text-xs px-1">
          <span className="flex items-center gap-1.5 text-[#94A3B8]">
            <Icon className="w-3 h-3" />
            {label}
          </span>
          <span className={`font-semibold ${color}`}>{value}</span>
        </div>
      ))}
      <div className="flex items-center justify-between text-xs px-1 pt-1 border-t border-[#1E3A5F]">
        <span className="flex items-center gap-1.5 text-[#94A3B8]">
          <PenLine className="w-3 h-3" />
          Firmas
        </span>
        <span className={sig.ok ? 'text-[#00D4AA] font-semibold' : 'text-[#F59E0B]'}>
          {sig.ok ? 'OK' : 'Incompletas'}
        </span>
      </div>
      {wf.withContent > 1 && (
        <p className="text-[10px] text-[#64748B] px-1 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Use Revisar previos para alinear el paquete
        </p>
      )}
    </div>
  );
}
