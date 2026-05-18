'use client';

import type { AgentStepLog } from '@/lib/agents/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, XCircle, Circle, Bot } from 'lucide-react';

function StatusIcon({ status }: { status: AgentStepLog['status'] }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="w-4 h-4 text-[#00D4AA] shrink-0" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-[#F59E0B] animate-spin shrink-0" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    default:
      return <Circle className="w-4 h-4 text-[#475569] shrink-0" />;
  }
}

interface AgentPipelineLogProps {
  steps: AgentStepLog[];
  title?: string;
}

export function AgentPipelineLog({ steps, title = 'Pipeline multiagente' }: AgentPipelineLogProps) {
  if (!steps.length) return null;
  return (
    <Card className="bg-[#112240] border-[#1E3A5F]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#00D4AA]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={`${step.agent}-${i}`}
            className="flex items-start gap-2 text-xs rounded-lg border border-[#1E3A5F] bg-[#0A1929]/50 px-3 py-2"
          >
            <StatusIcon status={step.status} />
            <div className="min-w-0 flex-1">
              <p className="text-[#CBD5E1] font-medium">{step.label}</p>
              {step.message && <p className="text-[#64748B] mt-0.5">{step.message}</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
