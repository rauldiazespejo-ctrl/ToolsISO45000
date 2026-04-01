import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompanyData, ViewType, SstDocumentItem, AppSettings, BrandingMode } from '@/types/sst';
import { ALL_DOCUMENTS } from '@/lib/sst-documents';

interface AppState {
  // Current view
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Selected document
  selectedDocNumber: number | null;
  setSelectedDocNumber: (num: number | null) => void;

  // Company data
  company: CompanyData | null;
  companies: CompanyData[];
  setCompany: (data: CompanyData) => void;
  setCompanies: (data: CompanyData[]) => void;
  setCompanyBranding: (branding: { clientLogoPath?: string; brandingMode: BrandingMode }) => void;
  isCompanyConfigured: boolean;

  // Documents
  documents: SstDocumentItem[];
  setDocuments: (docs: SstDocumentItem[]) => void;
  updateDocumentStatus: (number: number, status: SstDocumentItem['status']) => void;
  updateDocumentContent: (number: number, content: string) => void;

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
      updateDocumentStatus: (number, status) =>
        set((state) => ({
          documents: state.documents.map((d) =>
            d.number === number ? { ...d, status } : d
          ),
        })),
      updateDocumentContent: (number, content) =>
        set((state) => ({
          documents: state.documents.map((d) =>
            d.number === number ? { ...d, generatedContent: content, status: 'Completado' as const } : d
          ),
        })),

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
    }),
    {
      name: 'pulso-ai-storage',
      partialize: (state) => ({
        company: state.company,
        companies: state.companies,
        isCompanyConfigured: state.isCompanyConfigured,
        documents: state.documents,
        settings: state.settings,
      }),
    }
  )
);
