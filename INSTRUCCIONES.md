# Pulso AI - Sistema de Gestión SG-SST
## ISO 45001:2018 & Decreto Supremo N° 44/2024 Chile

---

## 📦 Instalación

### Requisitos previos
- **Node.js** 18+ o **Bun** runtime
- **npm** o **bun** package manager

### Pasos

```bash
# 1. Instalar dependencias
npm install
# o con bun:
bun install

# 2. Configurar base de datos (SQLite)
npx prisma db push
# o con bun:
bun run db:push

# 3. Ejecutar en modo desarrollo
npm run dev
# o con bun:
bun run dev
```

La app estará disponible en `http://localhost:3000`

---

## 🖥️ Versión Desktop (.exe para Windows)

### Requisitos adicionales
- **Node.js** 18+
- **npm**
- Acceso a internet (para instalar Electron)

### Pasos para compilar

```bash
# 1. Compilar la app Next.js para producción
npm run build
# o: bun run build

# 2. Entrar a la carpeta de Electron
cd electron

# 3. Instalar dependencias de Electron
npm install

# 4. Compilar el ejecutable
npm run build
```

El instalador `.exe` se generará en:
```
electron/dist/Pulso AI Setup.exe
```

### Estructura de Electron
```
electron/
├── main.js          # Proceso principal de Electron
├── package.json     # Configuración de Electron Builder
└── README-BUILD.md  # Instrucciones detalladas de compilación
```

---

## 📁 Estructura del Proyecto

```
pulso-ai-project/
├── src/
│   ├── app/                  # App Router de Next.js
│   │   ├── page.tsx          # Página principal (dashboard, setup, splash)
│   │   ├── layout.tsx        # Layout raíz
│   │   ├── globals.css       # Estilos globales + tema Pulso AI
│   │   └── api/              # Rutas API
│   │       ├── generate/     # Generación de documentos con IA
│   │       ├── generate-docx/ # Generación de archivos .docx
│   │       ├── analyze/      # Análisis de documentos existentes
│   │       ├── excel/        # Parseo de archivos Excel
│   │       ├── upload-logo/  # Subida de logos
│   │       └── download/     # Descarga del proyecto
│   ├── components/
│   │   ├── splash/           # Pantalla de splash animada
│   │   └── ui/               # Componentes shadcn/ui
│   ├── store/                # Zustand store
│   ├── lib/                  # Lógica de negocio
│   └── types/                # Definiciones TypeScript
├── prisma/
│   └── schema.prisma         # Esquema de base de datos SQLite
├── electron/                  # Wrapper para versión desktop
├── public/                    # Archivos estáticos (logos, imágenes)
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🎨 Funcionalidades

1. **Dashboard** con progreso de los 46 documentos SG-SST
2. **Generación IA** de documentos según ISO 45001:2018 y DS 44/2024
3. **Adecuación** de documentos existentes desactualizados
4. **Validador FUF** - Formulario Único de Fiscalización DS 44
5. **Descarga .docx** con logos y formato profesional
6. **Pantalla splash** animada con logo de Pulso AI

---

## 🛡️ Marca Pulso AI

- **Turquesa**: #00D4AA
- **Azul oscuro**: #0A1929
- **Logo**: Archivo en `/public/pulso-logo-splash.jpg`

---

## ⚖️ Licencia

Los documentos generados son herramientas de apoyo y deben ser revisados por profesionales competentes en SST.
