import type { CompanySignatories } from '@/types/sst';
import { DEFAULT_SIGNATORIES } from '@/types/sst';

export function areSignatoriesComplete(signatories?: CompanySignatories): {
  ok: boolean;
  missing: string[];
} {
  const s = signatories ?? DEFAULT_SIGNATORIES;
  const missing: string[] = [];
  if (!s.elaborado.fullName.trim()) missing.push('Elaborado');
  if (!s.revisado.fullName.trim()) missing.push('Revisado');
  if (!s.aprobado.fullName.trim()) missing.push('Aprobado');
  return { ok: missing.length === 0, missing };
}
