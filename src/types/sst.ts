export interface SstDocumentItem {
  number: number;
  category: string;
  categoryName: string;
  name: string;
  description: string;
  responsible: string;
  priority: string;
  normSource: string;
  normRef: string;
  status: 'Pendiente' | 'En Proceso' | 'Completado' | 'No Aplica';
  generatedContent?: string;
  /** Checklist anti-devolución auditoría (id ítem → verificado) */
  auditChecks?: Record<string, boolean>;
  /** Última revisión multiagente */
  aiReview?: {
    approved: boolean;
    score: number;
    summary: string;
    revisedAt?: string;
  };
  /** Trazabilidad legal chilena para auditoría/fiscalización */
  complianceTrace?: {
    legalReferences: Array<{
      body: string;
      article: string;
      title: string;
      version: string;
      effectiveDate?: string;
    }>;
    requiredEvidence: Array<{
      id: string;
      name: string;
      frequency: string;
      ownerRole: string;
      retention: string;
    }>;
    minimumAuditCriteria: string[];
  };
}

export type BrandingMode = 'pulso' | 'soldesp' | 'both';

export type SignatoryRole = 'ELABORADO' | 'REVISADO' | 'APROBADO';

export interface SignatoryConfig {
  role: SignatoryRole;
  fullName: string;
  jobTitle: string;
  initials: string;
  styleId: string;
}

export interface CompanySignatories {
  elaborado: SignatoryConfig;
  revisado: SignatoryConfig;
  aprobado: SignatoryConfig;
}

export const EMPTY_SIGNATORY = (role: SignatoryRole): SignatoryConfig => ({
  role,
  fullName: '',
  jobTitle: '',
  initials: '',
  styleId: 'docusign-1',
});

export const DEFAULT_SIGNATORIES: CompanySignatories = {
  elaborado: { ...EMPTY_SIGNATORY('ELABORADO'), jobTitle: 'Encargado(a) SST' },
  revisado: { ...EMPTY_SIGNATORY('REVISADO'), jobTitle: 'Jefe de Área / Operaciones' },
  aprobado: { ...EMPTY_SIGNATORY('APROBADO'), jobTitle: 'Gerente General / Alta Dirección' },
};

export interface DocBrandPalette {
  primary: string;
  navy: string;
  accent: string;
  textDark: string;
  textMedium: string;
  lightGray: string;
  tableBorder: string;
  white: string;
}

export interface CompanyData {
  id?: string;
  name: string;
  rut: string;
  business: string;
  address: string;
  size: 'MIPYME' | 'Mediana' | 'Grande';
  workerCount: number;
  sector: string;
  logoData?: string;
  clientLogoPath?: string;
  brandPalette?: DocBrandPalette;
  signatories?: CompanySignatories;
  brandingMode: BrandingMode;
}

export type ViewType =
  | 'setup'
  | 'dashboard'
  | 'document'
  | 'generate'
  | 'fuf'
  | 'settings'
  | 'adapt'
  | 'companies'
  | 'bowtie'
  | 'revise';

export interface AppSettings {
  apiProvider: 'openai' | 'claude' | 'auto';
  model: string;
  temperature: number;
  language: 'es' | 'en';
}
