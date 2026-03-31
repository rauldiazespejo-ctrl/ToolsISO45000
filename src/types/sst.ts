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
}

export type BrandingMode = 'pulso' | 'soldesp' | 'both';

export interface CompanyData {
  name: string;
  rut: string;
  business: string;
  address: string;
  size: 'MIPYME' | 'Mediana' | 'Grande';
  workerCount: number;
  sector: string;
  logoPath?: string;
  clientLogoPath?: string;
  brandingMode: BrandingMode;
}

export type ViewType = 'setup' | 'dashboard' | 'document' | 'generate' | 'fuf' | 'settings' | 'adapt';

export interface AppSettings {
  apiProvider: 'openai' | 'claude' | 'auto';
  model: string;
  temperature: number;
  language: 'es' | 'en';
}
