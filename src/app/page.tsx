'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app-store';
import SplashScreen from '@/components/splash/SplashScreen';

// UI Components
import SetupView from '@/components/pulso/views/SetupView';
import DashboardView from '@/components/pulso/views/DashboardView';
import FufView from '@/components/pulso/views/FufView';
import AdaptDocumentView from '@/components/pulso/views/AdaptDocumentView';
import DocumentDetailView from '@/components/pulso/views/DocumentDetailView';
import CompanySelectorView from '@/components/pulso/views/CompanySelectorView';
import BowtieView from '@/components/pulso/views/BowtieView';
import ReviseDocumentsView from '@/components/pulso/views/ReviseDocumentsView';

// Icons for the Loading State
import { Shield } from 'lucide-react';

export default function Home() {
  const store = useAppStore();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <AnimatePresence mode="wait">
      {store.currentView === 'setup' && (
        <motion.div 
          key="setup" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="min-h-screen"
        >
          <SetupView />
        </motion.div>
      )}
      
      {store.currentView === 'dashboard' && (
        <motion.div 
          key="dashboard" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="min-h-screen"
        >
          <DashboardView />
        </motion.div>
      )}
      
      {store.currentView === 'document' && (
        <motion.div 
          key="document" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="min-h-screen"
        >
          <DocumentDetailView />
        </motion.div>
      )}
      
      {store.currentView === 'fuf' && (
        <motion.div 
          key="fuf" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="min-h-screen"
        >
          <FufView />
        </motion.div>
      )}
      
      {store.currentView === 'adapt' && (
        <motion.div 
          key="adapt" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="min-h-screen"
        >
          <AdaptDocumentView />
        </motion.div>
      )}

      {store.currentView === 'companies' && (
        <motion.div 
          key="companies" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="min-h-screen"
        >
          <CompanySelectorView />
        </motion.div>
      )}

      {store.currentView === 'bowtie' && (
        <motion.div
          key="bowtie"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen"
        >
          <BowtieView />
        </motion.div>
      )}

      {store.currentView === 'revise' && (
        <motion.div
          key="revise"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen"
        >
          <ReviseDocumentsView />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
