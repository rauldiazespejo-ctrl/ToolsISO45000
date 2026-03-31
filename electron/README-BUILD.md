# Pulso AI - Build Desktop (.exe)

## Prerequisites
- Node.js 18+
- Windows 10/11 (for building)

## Steps

### 1. Build the Next.js app
```
cd /home/z/my-project
bun run build
```

### 2. Install Electron dependencies
```
cd electron
npm install
```

### 3. Build the .exe
```
npm run build
```

The installer will be in `dist-electron/Pulso AI Setup X.X.X.exe`

## Development (with hot reload)
1. Start Next.js dev server: `cd .. && bun run dev`
2. In another terminal: `cd electron && NODE_ENV=development npm start`

## Notes
- The app connects to localhost:3000 in development mode
- In production, it loads from the static export
- API keys are stored locally using AES-256 encryption
- Documents are generated locally - no external servers
