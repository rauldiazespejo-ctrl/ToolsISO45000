const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;
let serverPort = null;

/** Carga .env de la raíz del repo (desarrollo) sin dependencia dotenv. */
function loadEnvFromProjectRoot() {
  const root = path.join(__dirname, '..');
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFromProjectRoot();

function getStandaloneRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'standalone');
  }
  return path.join(__dirname, '../.next/standalone');
}

function resolveDatabaseUrlForServer() {
  const u = process.env.DATABASE_URL;
  if (u) return u;
  if (app.isPackaged) {
    throw new Error(
      'DATABASE_URL no está definida. Configura la variable de entorno del sistema con la URL de PostgreSQL (Neon), o coloca un .env junto a la app con DATABASE_URL=...'
    );
  }
  throw new Error(
    'DATABASE_URL no está definida. Crea un archivo .env en la raíz del proyecto con la URL de PostgreSQL (Neon).'
  );
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      const p = typeof addr === 'object' && addr ? addr.port : null;
      s.close(() => (p != null ? resolve(p) : reject(new Error('No port'))));
    });
  });
}

function waitForHttpOk(port, maxAttempts = 80, delayMs = 250) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tryOnce = () => {
      const req = http.get(
        { hostname: '127.0.0.1', port, path: '/', timeout: 5000 },
        (res) => {
          res.resume();
          resolve();
        }
      );
      req.on('error', () => {
        n += 1;
        if (n >= maxAttempts) reject(new Error(`El servidor no respondió en el puerto ${port}`));
        else setTimeout(tryOnce, delayMs);
      });
      req.on('timeout', () => {
        req.destroy();
        n += 1;
        if (n >= maxAttempts) reject(new Error('Timeout esperando al servidor'));
        else setTimeout(tryOnce, delayMs);
      });
    };
    tryOnce();
  });
}

function appendServerLog(userData, chunk) {
  try {
    fs.appendFileSync(path.join(userData, 'server.log'), chunk);
  } catch (_) {
    /* ignore */
  }
}

async function ensurePackagedServer(standaloneRoot) {
  if (serverProcess && serverPort != null) return serverPort;

  const userData = app.getPath('userData');
  const uploadsDir = path.join(userData, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  const port = await getFreePort();
  const databaseUrl = resolveDatabaseUrlForServer();

  const serverPath = path.join(standaloneRoot, 'server.js');
  if (!fs.existsSync(serverPath)) {
    throw new Error(`No se encontró el servidor embebido: ${serverPath}`);
  }

  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    DATABASE_URL: databaseUrl,
    PULSO_USER_DATA: userData,
  };

  serverProcess = fork(serverPath, [], {
    cwd: standaloneRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  serverProcess.stdout?.on('data', (d) => appendServerLog(userData, d));
  serverProcess.stderr?.on('data', (d) => appendServerLog(userData, d));
  serverProcess.on('exit', (code) => {
    if (code && code !== 0) {
      appendServerLog(userData, Buffer.from(`\n[exit] proceso servidor código ${code}\n`));
    }
  });

  try {
    await waitForHttpOk(port);
  } catch (err) {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
    throw err;
  }
  serverPort = port;
  return port;
}

function resolveWindowIcon() {
  const candidates = [
    path.join(__dirname, '../public/pulso-ai-creator-logo.png'),
    path.join(__dirname, '../public/logo.svg'),
    path.join(__dirname, '../public/pulso-ai-logo-transparent.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

async function createWindow() {
  const iconPath = resolveWindowIcon();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    ...(iconPath ? { icon: iconPath } : {}),
    title: 'TOOLS45000 PRO',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  const isDev = !app.isPackaged;

  try {
    if (isDev) {
      await waitForHttpOk(3000);
      await mainWindow.loadURL('http://127.0.0.1:3000');
    } else {
      const standaloneRoot = getStandaloneRoot();
      const port = await ensurePackagedServer(standaloneRoot);
      await mainWindow.loadURL(`http://127.0.0.1:${port}`);
    }
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head>
<body style="font-family:system-ui;background:#111;color:#eee;padding:2rem;">
<h1>No se pudo iniciar la aplicación</h1>
<p>${msg.replace(/</g, '&lt;')}</p>
<p>En modo desarrollo, ejecuta <code>npm run dev</code> antes de abrir Electron.</p>
<p>Para el .exe: define <code>DATABASE_URL</code> (PostgreSQL) y revisa <code>%APPDATA%\\${app.getName()}\\server.log</code>.</p>
</body></html>`;
    await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});

app.whenReady().then(() => {
  createWindow().catch(console.error);
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow().catch(console.error);
});
