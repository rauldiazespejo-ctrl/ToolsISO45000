'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_PRODUCT_NAME } from '@/lib/product-brand';
import { CreatorCredit } from '@/components/pulso/CreatorCredit';
import { Shield } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

// Particle ring component for the logo glow
function ParticleRing({ size }: { size: number }) {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    angle: (i * 360) / 24,
    delay: i * 0.05,
    distance: size * 0.55 + (i % 3) * 8,
  }));

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: p.id % 3 === 0 ? '#00D4AA' : p.id % 3 === 1 ? '#0EA5E9' : '#00D4AA',
            left: '50%',
            top: '50%',
          }}
          initial={{
            x: 0,
            y: 0,
            opacity: 0,
            scale: 0,
          }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
            opacity: [0, 1, 1, 0.4, 0.8],
            scale: [0, 1.5, 1, 0.8, 1.2],
          }}
          transition={{
            duration: 2,
            delay: p.delay,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Circuit lines that animate outward from center
function CircuitGrid() {
  const lines = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    isHorizontal: i % 2 === 0,
    position: (i + 1) * 8,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {lines.map((line) => (
        <motion.div
          key={line.id}
          className="absolute bg-[#00D4AA]"
          style={{
            width: line.isHorizontal ? '100%' : '1px',
            height: line.isHorizontal ? '1px' : '100%',
            left: line.isHorizontal ? 0 : `${line.position}%`,
            top: line.isHorizontal ? `${line.position}%` : 0,
          }}
          initial={{ scaleX: line.isHorizontal ? 0 : 1, scaleY: line.isHorizontal ? 1 : 0 }}
          animate={{
            scaleX: line.isHorizontal ? [0, 1, 0.6, 1] : 1,
            scaleY: line.isHorizontal ? 1 : [0, 1, 0.6, 1],
            opacity: [0, 0.5, 0.2, 0.4],
          }}
          transition={{
            duration: 2.5,
            delay: line.id * 0.1,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Animated scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00D4AA] to-transparent"
        initial={{ top: '100%' }}
        animate={{ top: ['-10%', '110%'] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 1,
          ease: 'linear',
        }}
      />

      {/* Corner accent nodes */}
      {[
        { top: '10%', left: '10%' },
        { top: '10%', right: '10%' },
        { bottom: '10%', left: '10%' },
        { bottom: '10%', right: '10%' },
      ].map((pos, i) => (
        <motion.div
          key={`corner-${i}`}
          className="absolute w-2 h-2 rounded-full bg-[#00D4AA]"
          style={pos}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.8, 0.3, 0.7], scale: [0, 1.5, 1, 1.2] }}
          transition={{
            duration: 2,
            delay: 0.5 + i * 0.2,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Hexagonal frame around the logo
function HexFrame({ size }: { size: number }) {
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    return {
      x: 50 + 45 * Math.cos(angle),
      y: 50 + 45 * Math.sin(angle),
    };
  });

  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute pointer-events-none"
      style={{ width: size * 1.3, height: size * 1.3 }}
      initial={{ opacity: 0, rotate: -30 }}
      animate={{ opacity: 1, rotate: 0 }}
      transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
    >
      <motion.polygon
        points={hexPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#00D4AA"
        strokeWidth="0.5"
        strokeDasharray="4 2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.6, 0.3, 0.5] }}
        transition={{ duration: 2, delay: 0.8, ease: 'easeOut' }}
      />
      {/* Outer hex */}
      <motion.polygon
        points={hexPoints.map(p => {
          const angle = (hexPoints.indexOf(p) * 60 - 90) * (Math.PI / 180);
          return `${50 + 52 * Math.cos(angle)},${50 + 52 * Math.sin(angle)}`;
        }).join(' ')}
        fill="none"
        stroke="#0EA5E9"
        strokeWidth="0.3"
        strokeDasharray="2 4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.3, 0.15, 0.25], rotate: 360 }}
        transition={{
          pathLength: { duration: 2.5, delay: 1 },
          opacity: { duration: 2.5, delay: 1 },
          rotate: { duration: 30, repeat: Infinity, ease: 'linear' },
        }}
      />
    </motion.svg>
  );
}

// Glitch text effect
function GlitchText({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.span
      className="relative inline-block"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1, delay }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{
            opacity: 0,
            y: -20,
            filter: 'blur(8px)',
          }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
          }}
          transition={{
            duration: 0.4,
            delay: delay + i * 0.06,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Animated loading bar
function LoadingBar({ progress }: { progress: number }) {
  return (
    <div className="w-64 h-1 bg-[#1E3A5F] rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{
          background: 'linear-gradient(90deg, #00D4AA, #0EA5E9, #00D4AA)',
          backgroundSize: '200% 100%',
        }}
        initial={{ width: '0%' }}
        animate={{
          width: `${progress}%`,
          backgroundPosition: ['0% 0%', '100% 0%'],
        }}
        transition={{
          width: { duration: 0.3, ease: 'linear' },
          backgroundPosition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
        }}
      />
    </div>
  );
}

// Deterministic pseudo-random seeded by index (avoids hydration mismatch)
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  /** Partículas solo en cliente: evita mismatch de hidratación (Framer Motion + estilos). */
  const [particlesReady, setParticlesReady] = useState(false);

  // Pre-compute particle positions deterministically (avoids hydration mismatch)
  const bgParticles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      width: seededRandom(i * 4) * 3 + 1,
      height: seededRandom(i * 4 + 1) * 3 + 1,
      left: seededRandom(i * 4 + 2) * 100,
      top: seededRandom(i * 4 + 3) * 100,
      duration: 3 + seededRandom(i * 3 + 100) * 2,
      delay: seededRandom(i * 3 + 200) * 2,
    })),
  []
  );

  const finishSplash = useCallback(() => {
    setFadeOut(true);
    setTimeout(onComplete, 800);
  }, [onComplete]);

  useEffect(() => {
    setParticlesReady(true);
  }, []);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Phase 0: Background fade in
    timers.push(setTimeout(() => setPhase(1), 300));

    // Phase 1: Circuit grid appears
    timers.push(setTimeout(() => setPhase(2), 800));

    // Phase 2: Logo appears with glow
    timers.push(setTimeout(() => setPhase(3), 1500));

    // Phase 3: Text appears
    timers.push(setTimeout(() => setPhase(4), 2200));

    // Phase 4: Loading progress starts
    timers.push(setTimeout(() => setPhase(5), 3000));

    return () => timers.forEach(clearTimeout);
  }, []);

  // Loading progress animation
  useEffect(() => {
    if (phase < 5) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          finishSplash();
          return 100;
        }
        // Varying speed for realistic feel
        const increment = prev < 30 ? 3 : prev < 70 ? 2 : prev < 90 ? 1.5 : 0.5;
        return Math.min(prev + increment + Math.random() * 2, 100);
      });
    }, 80);

    return () => clearInterval(interval);
  }, [phase, finishSplash]);

  return (
    <AnimatePresence>
      {!fadeOut ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ backgroundColor: '#0A1929' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Background effects */}
          <CircuitGrid />

          {/* Radial gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(0, 212, 170, 0.06) 0%, transparent 70%)',
            }}
          />

          {/* Floating particles background (solo tras montar en cliente → sin error de hidratación) */}
          {particlesReady ? (
            <div className="absolute inset-0 pointer-events-none">
              {bgParticles.map((p) => (
                <motion.div
                  key={`bg-particle-${p.id}`}
                  className="absolute rounded-full"
                  style={{
                    width: `${p.width.toFixed(2)}px`,
                    height: `${p.height.toFixed(2)}px`,
                    left: `${p.left.toFixed(2)}%`,
                    top: `${p.top.toFixed(2)}%`,
                    backgroundColor: p.id % 2 === 0 ? '#00D4AA' : '#0EA5E9',
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0, 0.6, 0],
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          ) : null}

          {/* Logo container */}
          <div className="relative flex items-center justify-center mb-8">
            {/* Glow ring behind logo */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 180,
                height: 180,
                background: 'conic-gradient(from 0deg, transparent, #00D4AA, transparent, #0EA5E9, transparent)',
              }}
              initial={{ opacity: 0, rotate: 0, scale: 0.5 }}
              animate={phase >= 2 ? {
                opacity: [0, 0.4, 0.15, 0.3],
                rotate: 360,
                scale: 1,
              } : {}}
              transition={{
                rotate: { duration: 6, repeat: Infinity, ease: 'linear', delay: 1.5 },
                opacity: { duration: 1.5, delay: 1.5 },
                scale: { duration: 0.8, delay: 1.5, ease: 'easeOut' },
              }}
            />

            {/* Hex frame */}
            {phase >= 2 && <HexFrame size={140} />}

            {/* Particle ring */}
            {phase >= 3 && <ParticleRing size={140} />}

            {/* Logo image */}
            <motion.div
              className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden"
              style={{
                boxShadow: phase >= 3
                  ? '0 0 40px rgba(0, 212, 170, 0.3), 0 0 80px rgba(0, 212, 170, 0.1)'
                  : 'none',
              }}
              initial={{ opacity: 0, scale: 0.3, rotate: -10 }}
              animate={phase >= 2 ? {
                opacity: 1,
                scale: 1,
                rotate: 0,
              } : {}}
              transition={{
                duration: 0.8,
                delay: 1.8,
                ease: [0.16, 1, 0.3, 1], // spring-like ease
              }}
            >
              <motion.div
                className="w-full h-full bg-[#0D2137] rounded-2xl flex items-center justify-center border border-[#1E3A5F] p-2"
                initial={{ borderColor: '#1E3A5F' }}
                animate={phase >= 3 ? {
                  borderColor: ['#00D4AA', '#0EA5E9', '#00D4AA'],
                } : {}}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <img
                  src="/logo.svg"
                  alt={APP_PRODUCT_NAME}
                  className="w-full h-full object-contain rounded-lg p-2"
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Title text */}
          <div className="relative z-10 text-center mb-4">
            <motion.h1
              className="text-4xl sm:text-5xl font-bold tracking-wider splash-title"
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={phase >= 3 ? {
                opacity: 1,
                letterSpacing: '0.15em',
              } : {}}
              transition={{
                duration: 1,
                delay: 2.2,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <GlitchText text={APP_PRODUCT_NAME} delay={2.2} />
            </motion.h1>

            {/* Decorative line under title */}
            <motion.div
              className="mx-auto mt-2 h-[2px] rounded-full overflow-hidden"
              style={{ width: 0 }}
              initial={{ width: 0 }}
              animate={phase >= 4 ? { width: 160 } : { width: 0 }}
              transition={{ duration: 0.8, delay: 2.8, ease: 'easeOut' }}
            >
              <div className="w-full h-full bg-gradient-to-r from-transparent via-[#00D4AA] to-transparent" />
            </motion.div>
          </div>

          {/* Subtitle */}
          <motion.div
            className="relative z-10 text-center mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 3 }}
          >
            <p className="text-[#94A3B8] text-sm sm:text-base tracking-wide">
              Sistema de Gestión SG-SST
            </p>
            <p className="text-[#64748B] text-xs mt-1 tracking-wider">
              ISO 45001:2018 &bull; Decreto Supremo N° 44/2024
            </p>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={phase >= 5 ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 3.2 }}
          >
            <LoadingBar progress={progress} />
            <motion.p
              className="text-[10px] text-[#475569] tracking-widest uppercase"
              initial={{ opacity: 0 }}
              animate={phase >= 5 ? { opacity: 1 } : {}}
              transition={{ delay: 3.4 }}
            >
              Cargando sistema...
            </motion.p>
          </motion.div>

          {/* Creador: Pulso AI */}
          <motion.div
            className="absolute bottom-5 left-1/2 -translate-x-1/2 max-w-[90vw]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.8, duration: 0.8 }}
          >
            <CreatorCredit variant="splash" />
            <p className="text-center text-[9px] text-[#475569] tracking-widest uppercase mt-2">
              {APP_PRODUCT_NAME}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
