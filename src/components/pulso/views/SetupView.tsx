"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app-store';
import { CATEGORIES, DOCUMENT_CODES, ALL_DOCUMENTS } from '@/lib/sst-documents';
import { SstDocumentItem, BrandingMode } from '@/types/sst';
import { resolveClientLogoUrl } from '@/lib/client-logo-url';
import { APP_PRODUCT_NAME } from '@/lib/product-brand';
import { CreatorCredit } from '@/components/pulso/CreatorCredit';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Building2, ChevronRight, ChevronLeft, ImagePlus, Loader2, Upload, Trash2, ImageIcon, AlertTriangle, Sparkles, Zap } from 'lucide-react';

export default function SetupView() {
  const { setCompany, setCompanyBranding, company } = useAppStore();
  const [form, setForm] = useState({
    name: '', rut: '', business: '', address: '',
    size: 'MIPYME' as 'MIPYME' | 'Mediana' | 'Grande',
    workerCount: '1', sector: ''
  });
  const [step, setStep] = useState(1);
  const [brandingMode, setBrandingMode] = useState<BrandingMode>(company?.brandingMode || 'pulso');
  const [logoData, setLogoData] = useState<string | null>(company?.logoData || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!form.name || !form.rut || !form.business) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    
    setUploadingLogo(true);
    try {
      const resp = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          logoData,
          brandingMode,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setCompany(data.company);
        toast.success('Empresa guardada en el repositorio');
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setLogoData(data.path);
        toast.success('Logo subido correctamente');
      } else {
        toast.error(data.error || 'Error al subir logo');
      }
    } catch {
      toast.error('Error de conexión al subir logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateForm = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 circuit-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#112240] border border-[#1E3A5F] mb-4"
          >
            <Shield className="w-10 h-10 text-[#00D4AA]" />
          </motion.div>
          <h1 className="text-4xl font-bold gradient-text mb-2">{APP_PRODUCT_NAME}</h1>
          <p className="text-[#94A3B8] text-lg">Sistema de Gestión SG-SST</p>
          <p className="text-[#64748B] text-sm mt-1">ISO 45001:2018 &bull; Decreto Supremo N° 44/2024 Chile</p>
        </div>

        {/* Form Card */}
        <Card className="bg-[#112240]/80 backdrop-blur-md border-[#1E3A5F]">
          <CardHeader>
            <CardTitle className="text-[#00D4AA] flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Configuración de la Empresa
            </CardTitle>
            <CardDescription className="text-[#94A3B8]">
              Ingresa los datos de tu empresa para personalizar los documentos SST
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`flex items-center gap-2 ${step >= s ? 'text-[#00D4AA]' : 'text-[#475569]'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    step >= s ? 'border-[#00D4AA] bg-[#00D4AA]/10' : 'border-[#334155]'
                  }`}>{s}</div>
                  <span className="text-sm hidden sm:inline">{s === 1 ? 'Datos Empresa' : s === 2 ? 'Identidad Visual' : 'Confirmar'}</span>
                  {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-[#00D4AA]' : 'bg-[#334155]'}`} />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label className="text-[#94A3B8]">Razón Social *</Label>
                      <Input value={form.name} onChange={e => updateForm('name', e.target.value)}
                        placeholder="Empresa SpA" className="bg-[#0A1929]/50 border-[#1E3A5F] text-white focus:border-[#00D4AA]" />
                    </div>
                    <div>
                      <Label className="text-[#94A3B8]">RUT *</Label>
                      <Input value={form.rut} onChange={e => updateForm('rut', e.target.value)}
                        placeholder="12.345.678-9" className="bg-[#0A1929]/50 border-[#1E3A5F] text-white focus:border-[#00D4AA]" />
                    </div>
                    <div>
                      <Label className="text-[#94A3B8]">Giro *</Label>
                      <Input value={form.business} onChange={e => updateForm('business', e.target.value)}
                        placeholder="Construcción, Minería..." className="bg-[#0A1929]/50 border-[#1E3A5F] text-white focus:border-[#00D4AA]" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[#94A3B8]">Dirección</Label>
                      <Input value={form.address} onChange={e => updateForm('address', e.target.value)}
                        placeholder="Av. Ejemplo 1234, Santiago" className="bg-[#0A1929]/50 border-[#1E3A5F] text-white focus:border-[#00D4AA]" />
                    </div>
                    <div>
                      <Label className="text-[#94A3B8]">Tamaño Empresa</Label>
                      <Select value={form.size} onValueChange={v => updateForm('size', v)}>
                        <SelectTrigger className="bg-[#0A1929]/50 border-[#1E3A5F] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#112240] border-[#1E3A5F]">
                          <SelectItem value="MIPYME">MIPYME (1-25 trabajadores)</SelectItem>
                          <SelectItem value="Mediana">Mediana (26-99 trabajadores)</SelectItem>
                          <SelectItem value="Grande">Grande (100+ trabajadores)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[#94A3B8]">N° Trabajadores</Label>
                      <Input type="number" value={form.workerCount} onChange={e => updateForm('workerCount', e.target.value)}
                        placeholder="25" className="bg-[#0A1929]/50 border-[#1E3A5F] text-white focus:border-[#00D4AA]" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[#94A3B8]">Sector Económico</Label>
                      <Select value={form.sector} onValueChange={v => updateForm('sector', v)}>
                        <SelectTrigger className="bg-[#0A1929]/50 border-[#1E3A5F] text-white">
                          <SelectValue placeholder="Seleccionar sector" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#112240] border-[#1E3A5F]">
                          <SelectItem value="construccion">Construcción</SelectItem>
                          <SelectItem value="mineria">Minería</SelectItem>
                          <SelectItem value="manufactura">Manufactura</SelectItem>
                          <SelectItem value="transporte">Transporte</SelectItem>
                          <SelectItem value="agricultura">Agricultura</SelectItem>
                          <SelectItem value="silvicultura">Silvicultura</SelectItem>
                          <SelectItem value="pesca">Pesca y Acuicultura</SelectItem>
                          <SelectItem value="comercio">Comercio</SelectItem>
                          <SelectItem value="servicios">Servicios</SelectItem>
                          <SelectItem value="salud">Salud</SelectItem>
                          <SelectItem value="educacion">Educación</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setStep(2)} className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888]">
                      Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              ) : step === 2 ? (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  {/* Logo Upload */}
                  <div className="bg-[#0A1929]/50 rounded-xl p-4 border border-[#1E3A5F] space-y-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-[#00D4AA]" />
                      Logo de la Empresa (Opcional)
                    </h3>
                    <p className="text-sm text-[#94A3B8]">
                      Sube el logo de tu empresa para incluirlo en los documentos generados.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-3">
                      {logoData ? (
                        <div className="relative group">
                          <div className="w-32 h-32 rounded-xl bg-[#112240] border border-[#1E3A5F] flex items-center justify-center p-2">
                            <img
                              src={resolveClientLogoUrl(logoData)}
                              alt="Logo empresa"
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute -top-2 -right-2 bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30 h-7 w-7 p-0 rounded-full"
                            onClick={handleRemoveLogo}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="w-32 h-32 rounded-xl bg-[#112240] border-2 border-dashed border-[#1E3A5F] hover:border-[#00D4AA]/50 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {uploadingLogo ? (
                            <Loader2 className="w-6 h-6 text-[#00D4AA] animate-spin" />
                          ) : (
                            <ImagePlus className="w-6 h-6 text-[#475569]" />
                          )}
                          <span className="text-[10px] text-[#475569]">Subir Logo</span>
                        </button>
                      )}
                      {!logoData && !uploadingLogo && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#1E3A5F] text-[#94A3B8]"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-3 h-3 mr-1" /> Seleccionar archivo
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Branding Mode Selection */}
                  <div className="bg-[#0A1929]/50 rounded-xl p-4 border border-[#1E3A5F] space-y-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#00D4AA]" />
                      Identidad Visual en Documentos
                    </h3>
                    <p className="text-sm text-[#94A3B8]">
                      Elige qué logos aparecerán en la cabecera y pie de los documentos generados.
                    </p>
                    <RadioGroup value={brandingMode} onValueChange={(v) => setBrandingMode(v as BrandingMode)} className="space-y-3">
                      <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        brandingMode === 'pulso' ? 'border-[#00D4AA]/50 bg-[#00D4AA]/5' : 'border-[#1E3A5F] hover:border-[#334155]'
                      }`}>
                        <RadioGroupItem value="pulso" className="mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-[#112240] flex items-center justify-center">
                              <Shield className="w-4 h-4 text-[#00D4AA]" />
                            </div>
                            <span className="font-medium text-white text-sm">Solo {APP_PRODUCT_NAME}</span>
                          </div>
                          <p className="text-xs text-[#64748B] mt-1">Marca del producto ({APP_PRODUCT_NAME}) en portada y pie</p>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        brandingMode === 'soldesp' ? 'border-[#00D4AA]/50 bg-[#00D4AA]/5' : 'border-[#1E3A5F] hover:border-[#334155]'
                      }`}>
                        <RadioGroupItem value="soldesp" className="mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-[#112240] flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-[#F59E0B]" />
                            </div>
                            <span className="font-medium text-white text-sm">Solo Logo Empresa</span>
                          </div>
                          <p className="text-xs text-[#64748B] mt-1">Solo se mostrará el logo de tu empresa en los documentos</p>
                          {!logoData && brandingMode === 'soldesp' && (
                            <p className="text-xs text-[#F59E0B] mt-1">Debes subir un logo primero</p>
                          )}
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        brandingMode === 'both' ? 'border-[#00D4AA]/50 bg-[#00D4AA]/5' : 'border-[#1E3A5F] hover:border-[#334155]'
                      }`}>
                        <RadioGroupItem value="both" className="mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                              <div className="w-8 h-8 rounded bg-[#112240] flex items-center justify-center">
                                <Shield className="w-4 h-4 text-[#00D4AA]" />
                              </div>
                              <div className="w-8 h-8 rounded bg-[#112240] flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-[#F59E0B]" />
                              </div>
                            </div>
                            <span className="font-medium text-white text-sm">Ambos Logos</span>
                          </div>
                          <p className="text-xs text-[#64748B] mt-1">Logo de tu empresa y marca {APP_PRODUCT_NAME} en los documentos</p>
                          {!logoData && brandingMode === 'both' && (
                            <p className="text-xs text-[#F59E0B] mt-1">Debes subir un logo primero</p>
                          )}
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)} className="border-[#1E3A5F] text-[#94A3B8]">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
                    </Button>
                    <Button onClick={() => setStep(3)} className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888]">
                      Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="bg-[#0A1929]/50 rounded-xl p-4 border border-[#1E3A5F] space-y-3">
                    <h3 className="font-semibold text-white">Resumen de Configuración</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-[#64748B]">Empresa:</span><span className="text-white">{form.name}</span>
                      <span className="text-[#64748B]">RUT:</span><span className="text-white">{form.rut}</span>
                      <span className="text-[#64748B]">Giro:</span><span className="text-white">{form.business}</span>
                      <span className="text-[#64748B]">Tamaño:</span><span className="text-[#00D4AA]">{form.size}</span>
                      <span className="text-[#64748B]">Trabajadores:</span><span className="text-white">{form.workerCount}</span>
                      {form.sector && <><span className="text-[#64748B]">Sector:</span><span className="text-white capitalize">{form.sector}</span></>}
                    </div>
                  </div>
                  {/* Branding summary */}
                  <div className="bg-[#0A1929]/50 rounded-xl p-4 border border-[#1E3A5F] space-y-3">
                    <h3 className="font-semibold text-white">Identidad Visual</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-[#64748B]">Modo:</span>
                      <span className="text-white">{
                        brandingMode === 'pulso' ? `Solo ${APP_PRODUCT_NAME}` :
                        brandingMode === 'soldesp' ? 'Solo Logo Empresa' : 'Ambos Logos'
                      }</span>
                      <span className="text-[#64748B]">Logo Empresa:</span>
                      <span className="text-white">{logoData ? 'Cargado' : 'No cargado'}</span>
                    </div>
                    {logoData && (
                      <div className="flex items-center gap-3 mt-2 p-2 bg-[#112240] rounded-lg">
                        <div className="w-12 h-12 rounded bg-[#0A1929] flex items-center justify-center p-1">
                          <img src={resolveClientLogoUrl(logoData)} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                        <span className="text-xs text-[#94A3B8] truncate">Logo de {form.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-[#0A1929]/50 rounded-xl p-4 border border-[#1E3A5F]">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                      <div className="text-sm text-[#94A3B8]">
                        <p className="text-[#F59E0B] font-semibold mb-1">Aviso Legal Importante</p>
                        Los documentos generados por {APP_PRODUCT_NAME} son herramientas de apoyo que deben ser revisados y aprobados por profesionales competentes en Seguridad y Salud en el Trabajo antes de su implementación oficial.
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#0A1929]/50 rounded-xl p-4 border border-[#1E3A5F]">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-[#00D4AA] shrink-0 mt-0.5" />
                      <div className="text-sm text-[#94A3B8]">
                        <p className="text-[#00D4AA] font-semibold mb-1">Generación con Inteligencia Artificial</p>
                        Los 46 documentos del SG-SST se generarán utilizando IA especializada en normativa chilena de seguridad laboral, adaptados específicamente para tu empresa.
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)} className="border-[#1E3A5F] text-[#94A3B8]">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
                    </Button>
                    <Button onClick={handleSubmit} className="bg-[#00D4AA] text-[#0A1929] hover:bg-[#00A888] font-semibold">
                      <Zap className="w-4 h-4 mr-1" /> Iniciar {APP_PRODUCT_NAME}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-col items-center gap-4">
          <CreatorCredit variant="footer" />
          <p className="text-center text-[#475569] text-xs">
            {APP_PRODUCT_NAME} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
