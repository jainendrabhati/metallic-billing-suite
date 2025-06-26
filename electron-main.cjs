const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = require('electron-is-dev');

let flaskProcess = null;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev,
    },
    show: false,
    icon: path.join(__dirname, 'assets/icon.png'),
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.error('index.html not found:', indexPath);
    }
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, errorDescription);
  });
}

function startFlask() {
  const flaskExePath = isDev
    ? path.join(__dirname, 'backend', 'dist', 'run.exe')  // PyInstaller EXE in dev
    : path.join(process.resourcesPath, 'backend', 'run.exe');  // Embedded in prod

  console.log('Starting backend:', flaskExePath);

  flaskProcess = spawn(flaskExePath, [], {
    cwd: path.dirname(flaskExePath),
    stdio: isDev ? 'inherit' : 'ignore'
  });

  flaskProcess.on('error', (err) => {
    console.error('Failed to start Flask:', err);
  });

  flaskProcess.on('close', (code) => {
    console.log(`Flask process exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  createWindow();

  // Start Flask backend first
  setTimeout(() => {
    startFlask();
  }, 1000);
});

app.on('window-all-closed', () => {
  if (flaskProcess) flaskProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (flaskProcess) flaskProcess.kill();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
