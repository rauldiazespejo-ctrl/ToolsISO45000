'use client';

import type { AgentReviewResult } from '@/lib/agents/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface AgentReviewPanelProps {
  review: AgentReviewResult | null;
  loading?: boolean;
}

const severityStyle = {
  bloqueante: 'bg-red-500/10 text-red-300 border-red-500/30',
  mayor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  menor: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

export function AgentReviewPanel({ review, loading }: AgentReviewPanelProps) {
  if (loading) {
    return (
      <Card className="bg-[#112240] border-[#1E3A5F] animate-pulse">
        <CardContent className="py-8 text-center text-sm text-[#64748B]">
          Agentes revisor y corrector en ejecución…
        </CardContent>
      </Card>
    );
  }
  if (!review) return null;

  return (
    <Card className={`bg-[#112240] border ${review.approved ? 'border-[#00D4AA]/40' : 'border-[#F59E0B]/40'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            {review.approved ? (
              <ShieldCheck className="w-5 h-5 text-[#00D4AA]" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            )}
            Revisión multiagente
          </CardTitle>
          <Badge
            className={
              review.approved
                ? 'bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/30'
                : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
            }
          >
            {review.approved ? 'Aprobado' : 'Pendiente corrección'}
          </Badge>
        </div>
        <Progress value={review.score} className="h-2 mt-2 bg-[#0A1929]" />
        <p className="text-xs text-[#64748B] mt-1">Score auditoría: {review.score}%</p>
        <p className="text-xs text-[#94A3B8] mt-2">{review.summary}</p>
      </CardHeader>
      {review.findings.length > 0 && (
        <CardContent className="space-y-2 max-h-48 overflow-y-auto">
          {review.findings.map((f) => (
            <div key={f.id} className="rounded-lg border border-[#1E3A5F] bg-[#0A1929]/40 p-2 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={severityStyle[f.severity]}>{f.severity}</Badge>
                <span className="text-[#64748B]">{f.category}</span>
              </div>
              <p className="text-[#CBD5E1]">{f.message}</p>
              {f.suggestion && <p className="text-[#00D4AA]/80 mt-1">→ {f.suggestion}</p>}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
