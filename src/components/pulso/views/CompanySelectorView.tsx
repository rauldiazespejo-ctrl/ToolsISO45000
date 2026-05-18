"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus, ArrowRight, Loader2, Shield } from 'lucide-react';
import { APP_PRODUCT_NAME } from '@/lib/product-brand';
import { CreatorCredit } from '@/components/pulso/CreatorCredit';
import { CompanyData } from '@/types/sst';

export default function CompanySelectorView() {
  const { setCompany, setCompanies, companies, setCurrentView } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch('/api/companies');
        const data = await res.json();
        if (data.success) {
          setCompanies(data.companies);
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, [setCompanies]);

  const handleSelectCompany = async (comp: CompanyData) => {
    if (!comp.id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${comp.id}/documents`);
      const data = await res.json();
      if (data.success) {
        // setDocuments before setCompany so the dashboard renders with correct docs
        useAppStore.getState().setDocuments(data.documents);
        // setCompany already sets currentView → 'dashboard' internally
        setCompany({ ...comp, brandingMode: comp.brandingMode || 'pulso' });
      }
    } catch (error) {
      console.error('Failed to load company documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentView('setup');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 circuit-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#112240] border border-[#1E3A5F] mb-4">
            <Shield className="w-8 h-8 text-[#00D4AA]" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">{APP_PRODUCT_NAME}</h1>
          <p className="text-[#94A3B8]">Panel de Gestión Multi-Empresa</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create New Card */}
          <Card 
            className="bg-[#112240]/40 backdrop-blur-md border-[#1E3A5F] border-dashed cursor-pointer hover:border-[#00D4AA]/50 transition-all flex flex-col items-center justify-center p-8 group"
            onClick={handleCreateNew}
          >
            <div className="w-16 h-16 rounded-full bg-[#00D4AA]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-[#00D4AA]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Nueva Empresa</h3>
            <p className="text-[#64748B] text-center text-sm">
              Configura los datos base de un nuevo cliente y genera su SG-SST completo.
            </p>
            <Button variant="ghost" className="mt-4 text-[#00D4AA] hover:text-[#00D4AA] hover:bg-[#00D4AA]/10">
              Comenzar Configuración <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>

          {/* List Companies */}
          <div className="space-y-4">
            <h2 className="text-[#94A3B8] font-semibold text-sm uppercase tracking-widest px-2">Empresas Activas</h2>
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#475569]">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span>Cargando empresas...</span>
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-[#1E3A5F] bg-[#112240]/20">
                  <Building2 className="w-8 h-8 text-[#1E3A5F] mx-auto mb-2" />
                  <p className="text-[#64748B]">No hay empresas registradas aún.</p>
                </div>
              ) : (
                companies.map((comp) => (
                  <motion.div
                    key={comp.id}
                    whileHover={{ x: 5 }}
                    className="p-4 bg-[#112240]/60 border border-[#1E3A5F] rounded-xl hover:border-[#0EA5E9]/50 transition-all cursor-pointer flex items-center justify-between group"
                    onClick={() => handleSelectCompany(comp)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[#0A1929] flex items-center justify-center overflow-hidden border border-[#1E3A5F]">
                        {comp.logoData ? (
                          <img src={comp.logoData} alt={comp.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Building2 className="w-6 h-6 text-[#94A3B8]" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-medium group-hover:text-[#0EA5E9] transition-colors">{comp.name}</h4>
                        <p className="text-xs text-[#64748B]">{comp.rut} • {comp.size}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#475569] group-hover:text-[#0EA5E9]" />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <CreatorCredit variant="footer" />
          <p className="text-center text-[#475569] text-[10px] tracking-[0.2em] uppercase">
            Portal de Control {APP_PRODUCT_NAME} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
