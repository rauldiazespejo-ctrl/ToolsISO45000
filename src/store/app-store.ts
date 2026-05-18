import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompanyData, ViewType, SstDocumentItem, AppSettings, BrandingMode } from '@/types/sst';
import type { BowtieAnalysisRecord } from '@/lib/bowtie/types';
import { ALL_DOCUMENTS } from '@/lib/sst-documents';
import { getAuditChecklistForDocument, getAuditChecklistProgress } from '@/lib/audit-checklist';
import { syncDocumentToServer } from '@/lib/sync-persistence';

function persistDocSnapshot(
  companyId: string | undefined,
  doc: SstDocumentItem | undefined
) {
  if (!doc) return;
  void syncDocumentToServer(companyId, doc);
}

interface AppState {
  // Current view
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Selected document
  selectedDocNumber: number | null;
  setSelectedDocNumber: (num: number | null) => void;
  /** Tab a abrir al entrar al detalle (se consume una vez) */
  pendingDocumentTab: string | null;
  openDocumentWorkflow: (number: number, tab?: string) => void;
  consumePendingDocumentTab: () => string | null;

  // Company data
  company: CompanyData | null;
  companies: CompanyData[];
  setCompany: (data: CompanyData) => void;
  setCompanies: (data: CompanyData[]) => void;
  setCompanyBranding: (branding: {
    clientLogoPath?: string;
    brandingMode?: BrandingMode;
    brandPalette?: CompanyData['brandPalette'];
    logoData?: string;
  }) => void;
  isCompanyConfigured: boolean;

  // Documents
  documents: SstDocumentItem[];
  setDocuments: (docs: SstDocumentItem[]) => void;
  updateDocumentStatus: (number: number, status: SstDocumentItem['status']) => void;
  updateDocumentContent: (number: number, content: string) => void;
  updateAuditCheck: (number: number, itemId: string, checked: boolean) => void;
  updateDocumentAiReview: (
    number: number,
    review: { approved: boolean; score: number; summary: string } | null
  ) => void;
  getAuditProgressForDoc: (number: number) => { done: number; total: number; percent: number; complete: boolean };
  finalizeDocument: (number: number, opts?: { forceWithoutAi?: boolean }) => boolean;
  canFinalizeDocument: (number: number, opts?: { forceWithoutAi?: boolean }) => boolean;
  getWorkflowStats: () => {
    withContent: number;
    aiApproved: number;
    awaitingAi: number;
    checklistReady: number;
  };

  // Filters
  filterCategory: string;
  filterPriority: string;
  filterStatus: string;
  searchQuery: string;
  setFilterCategory: (c: string) => void;
  setFilterPriority: (p: string) => void;
  setFilterStatus: (s: string) => void;
  setSearchQuery: (q: string) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Generation
  isGenerating: boolean;
  setIsGenerating: (g: boolean) => void;
  generationProgress: number;
  setGenerationProgress: (p: number) => void;

  // Computed helpers
  getFilteredDocuments: () => SstDocumentItem[];
  getProgressStats: () => { total: number; completed: number; inProgress: number; pending: number; notApplicable: number; percentage: number };
  getDocumentsByCategory: () => Record<string, SstDocumentItem[]>;

  // Bowtie — riesgos críticos
  bowtieRecords: BowtieAnalysisRecord[];
  setBowtieRecords: (records: BowtieAnalysisRecord[]) => void;
  upsertBowtieRecord: (record: BowtieAnalysisRecord) => void;
  removeBowtieRecord: (id: string) => void;
  syncBowtiesFromApi: () => Promise<void>;
  persistBowtieToApi: (record: BowtieAnalysisRecord) => Promise<string | undefined>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // View
      currentView: 'companies',
      setCurrentView: (view) => set({ currentView: view }),

      // Selected document
      selectedDocNumber: null,
      setSelectedDocNumber: (num) => set({ selectedDocNumber: num }),
      pendingDocumentTab: null,
      openDocumentWorkflow: (number, tab = 'info') =>
        set({
          selectedDocNumber: number,
          currentView: 'document',
          pendingDocumentTab: tab,
        }),
      consumePendingDocumentTab: () => {
        const tab = get().pendingDocumentTab;
        if (tab) set({ pendingDocumentTab: null });
        return tab;
      },

      // Company
      company: null,
      companies: [],
      setCompany: (data) => set({ 
        company: { ...data, brandingMode: data.brandingMode || 'pulso' }, 
        isCompanyConfigured: true, 
        currentView: 'dashboard' 
      }),
      setCompanies: (data) => set({ companies: data }),
      setCompanyBranding: (branding) => set((state) => ({
        company: state.company ? { ...state.company, ...branding } : null,
      })),
      isCompanyConfigured: false,

      // Documents
      documents: ALL_DOCUMENTS,
      setDocuments: (docs) => set({ documents: docs }),
      updateDocumentStatus: (number, status) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.number === number ? { ...d, status } : d
          ),
        }));
        persistDocSnapshot(get().company?.id, get().documents.find((d) => d.number === number));
      },
      updateDocumentContent: (number, content) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.number === number
              ? { ...d, generatedContent: content, status: 'En Proceso' as const }
              : d
          ),
        }));
        persistDocSnapshot(get().company?.id, get().documents.find((d) => d.number === number));
      },
      canFinalizeDocument: (number, opts) => {
        const doc = get().documents.find((d) => d.number === number);
        const progress = get().getAuditProgressForDoc(number);
        if (!progress.complete) return false;
        if (
          doc?.generatedContent &&
          doc.aiReview &&
          !doc.aiReview.approved &&
          !opts?.forceWithoutAi
        ) {
          return false;
        }
        return true;
      },
      finalizeDocument: (number, opts) => {
        if (!get().canFinalizeDocument(number, opts)) return false;
        set((state) => ({
          documents: state.documents.map((d) =>
            d.number === number ? { ...d, status: 'Completado' as const } : d
          ),
        }));
        persistDocSnapshot(get().company?.id, get().documents.find((d) => d.number === number));
        return true;
      },
      updateAuditCheck: (number, itemId, checked) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.number === number
              ? {
                  ...d,
                  auditChecks: { ...(d.auditChecks ?? {}), [itemId]: checked },
                }
              : d
          ),
        }));
        persistDocSnapshot(get().company?.id, get().documents.find((d) => d.number === number));
      },
      updateDocumentAiReview: (number, review) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.number === number
              ? {
                  ...d,
                  aiReview: review
                    ? { ...review, revisedAt: new Date().toISOString() }
                    : undefined,
                }
              : d
          ),
        }));
        persistDocSnapshot(get().company?.id, get().documents.find((d) => d.number === number));
      },
      getAuditProgressForDoc: (number) => {
        const doc = get().documents.find((d) => d.number === number);
        if (!doc) return { done: 0, total: 0, percent: 0, complete: false };
        const items = getAuditChecklistForDocument(doc);
        return getAuditChecklistProgress(items, doc.auditChecks);
      },
      getWorkflowStats: () => {
        const docs = get().documents;
        const withContent = docs.filter((d) => d.generatedContent?.trim()).length;
        const aiApproved = docs.filter((d) => d.aiReview?.approved).length;
        const awaitingAi = docs.filter(
          (d) => d.generatedContent?.trim() && d.aiReview && !d.aiReview.approved
        ).length;
        const checklistReady = docs.filter((d) => {
          if (!d.generatedContent?.trim()) return false;
          return get().getAuditProgressForDoc(d.number).complete;
        }).length;
        return { withContent, aiApproved, awaitingAi, checklistReady };
      },

      // Filters
      filterCategory: 'all',
      filterPriority: 'all',
      filterStatus: 'all',
      searchQuery: '',
      setFilterCategory: (c) => set({ filterCategory: c }),
      setFilterPriority: (p) => set({ filterPriority: p }),
      setFilterStatus: (s) => set({ filterStatus: s }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      // Settings
      settings: {
        apiProvider: 'auto',
        model: 'default',
        temperature: 0.7,
        language: 'es',
      },
      updateSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),

      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Generation
      isGenerating: false,
      setIsGenerating: (g) => set({ isGenerating: g }),
      generationProgress: 0,
      setGenerationProgress: (p) => set({ generationProgress: p }),

      // Computed
      getFilteredDocuments: () => {
        const state = get();
        return state.documents.filter((d) => {
          if (state.filterCategory !== 'all' && d.category !== state.filterCategory) return false;
          if (state.filterPriority !== 'all' && d.priority !== state.filterPriority) return false;
          if (state.filterStatus !== 'all' && d.status !== state.filterStatus) return false;
          if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            return d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
          }
          return true;
        });
      },

      getProgressStats: () => {
        const docs = get().documents;
        const total = docs.length;
        const completed = docs.filter((d) => d.status === 'Completado').length;
        const inProgress = docs.filter((d) => d.status === 'En Proceso').length;
        const pending = docs.filter((d) => d.status === 'Pendiente').length;
        const notApplicable = docs.filter((d) => d.status === 'No Aplica').length;
        const eligible = total - notApplicable;
        const percentage = eligible > 0 ? Math.round((completed / eligible) * 100) : 0;
        return { total, completed, inProgress, pending, notApplicable, percentage };
      },

      getDocumentsByCategory: () => {
        const docs = get().documents;
        const grouped: Record<string, SstDocumentItem[]> = {};
        docs.forEach((d) => {
          if (!grouped[d.category]) grouped[d.category] = [];
          grouped[d.category].push(d);
        });
        return grouped;
      },

      bowtieRecords: [],
      setBowtieRecords: (records) => set({ bowtieRecords: records }),
      upsertBowtieRecord: (record) =>
        set((state) => {
          const idx = state.bowtieRecords.findIndex((r) => r.id === record.id);
          if (idx >= 0) {
            const next = [...state.bowtieRecords];
            next[idx] = record;
            return { bowtieRecords: next };
          }
          return { bowtieRecords: [record, ...state.bowtieRecords] };
        }),
      removeBowtieRecord: (id) =>
        set((state) => ({
          bowtieRecords: state.bowtieRecords.filter((r) => r.id !== id),
        })),
      syncBowtiesFromApi: async () => {
        const companyId = get().company?.id;
        if (!companyId) return;
        try {
          const res = await fetch(`/api/bowtie?companyId=${encodeURIComponent(companyId)}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.items)) {
            const records: BowtieAnalysisRecord[] = data.items.map(
              (item: {
                id: string;
                companyId: string;
                model: BowtieAnalysisRecord['model'];
                markdown?: string;
                status: BowtieAnalysisRecord['status'];
                createdAt: string;
                updatedAt: string;
              }) => ({
                id: item.id,
                companyId: item.companyId,
                model: item.model,
                markdown: item.markdown,
                status: item.status,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              })
            );
            set({ bowtieRecords: records });
          }
        } catch {
          /* local store sigue disponible */
        }
      },
      persistBowtieToApi: async (record) => {
        const companyId = get().company?.id;
        if (!companyId) return undefined;
        try {
          const res = await fetch('/api/bowtie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              id: record.id.startsWith('local-') ? undefined : record.id,
              model: record.model,
              markdown: record.markdown,
              status: record.status,
            }),
          });
          const data = await res.json();
          if (data.success && data.item) {
            const saved: BowtieAnalysisRecord = {
              id: data.item.id,
              companyId: data.item.companyId,
              model: data.item.model,
              markdown: data.item.markdown,
              svgDiagram: record.svgDiagram,
              status: data.item.status,
              createdAt: data.item.createdAt,
              updatedAt: data.item.updatedAt,
            };
            get().upsertBowtieRecord(saved);
            return saved.id;
          }
        } catch {
          /* ignore */
        }
        return undefined;
      },
    }),
    {
      name: 'pulso-ai-storage',
      partialize: (state) => ({
        company: state.company,
        companies: state.companies,
        isCompanyConfigured: state.isCompanyConfigured,
        documents: state.documents,
        bowtieRecords: state.bowtieRecords,
        settings: state.settings,
      }),
    }
  )
);
