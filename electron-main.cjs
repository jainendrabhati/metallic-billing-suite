const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Detect dev mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

  const indexPath = isDev
    ? 'http://localhost:8080'
    : `file://${path.join(__dirname, 'dist', 'index.html')}`;

  mainWindow.loadURL(indexPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (flaskProcess) flaskProcess.kill();
  });
}

// --- Python environment checks and setup ---

async function checkPythonInstallation() {
  return new Promise((resolve) => {
    exec('python --version', { timeout: 5000 }, (error) => {
      if (error) {
        exec('python3 --version', { timeout: 5000 }, (error2) => {
          resolve(!error2);
        });
      } else {
        resolve(true);
      }
    });
  });
}

async function downloadPython() {
  const url = 'https://www.python.org/ftp/python/3.11.0/python-3.11.0-amd64.exe';
  const dest = path.join(process.cwd(), 'python-installer.exe');

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function installPython(installerPath) {
  return new Promise((resolve, reject) => {
    const installer = spawn(installerPath, [
      '/quiet',
      'InstallAllUsers=1',
      'PrependPath=1',
      'Include_test=0',
    ]);

    installer.on('close', (code) => {
      fs.unlink(installerPath, () => {});
      if (code === 0) resolve();
      else reject(new Error(`Python install failed: exit code ${code}`));
    });

    installer.on('error', reject);
  });
}

async function installPythonDependencies() {
  const reqPath = isDev
    ? path.join(__dirname, 'backend', 'requirements.txt')
    : path.join(process.resourcesPath, 'backend', 'requirements.txt');

  return new Promise((resolve, reject) => {
    const pip = spawn('pip', ['install', '-r', reqPath]);
    pip.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pip failed with code ${code}`));
    });
    pip.on('error', reject);
  });
}

function startFlask() {
  const python = 'python';
  const script = isDev
    ? path.join(__dirname, 'backend', 'run.py')
    : path.join(process.resourcesPath, 'backend', 'run.py');

  const cwd = isDev
    ? path.join(__dirname, 'backend')
    : path.join(process.resourcesPath, 'backend');

  flaskProcess = spawn(python, [script], {
    cwd,
    stdio: isDev ? 'inherit' : 'pipe',
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });

  flaskProcess.stdout?.on('data', (data) => {
    console.log(`[Flask]: ${data}`);
  });
  flaskProcess.stderr?.on('data', (data) => {
    console.error(`[Flask Error]: ${data}`);
  });
  flaskProcess.on('close', (code) => {
    console.log(`Flask exited with code ${code}`);
  });
  flaskProcess.on('error', (err) => {
    console.error('Flask failed to start:', err.message);
  });
}

// Optional: Wait until Flask is ready (hit /health route)
function waitForFlask(url = "http://127.0.0.1:5000/health", timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http.get(url, (res) => {
        res.statusCode === 200 ? resolve(true) : retry();
      }).on('error', retry);
    };
    const retry = () => {
      if (Date.now() - start >= timeout) {
        reject(new Error("Flask backend did not become ready in time."));
      } else {
        setTimeout(attempt, 500);
      }
    };
    attempt();
  });
}

async function setupPythonEnvironment() {
  const pythonExists = await checkPythonInstallation();
  if (!pythonExists) {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Install', 'Cancel'],
      message: 'Python is required.',
      detail: 'Install Python 3.11.0 automatically?',
    });

    if (result.response === 0) {
      const installerPath = await downloadPython();
      await installPython(installerPath);
    } else {
      app.quit();
      return;
    }
  }

  await installPythonDependencies();
  startFlask();
}

// --- Main app startup ---

app.whenReady().then(async () => {
  createWindow();
  try {
    await setupPythonEnvironment();
    // await waitForFlask(); // optionally wait
    console.log("Backend running.");
  } catch (err) {
    console.error("Backend failed:", err.message);
    dialog.showErrorBox("Flask Error", err.message);
  }
});

// Kill backend when app quits
app.on('window-all-closed', () => {
  if (flaskProcess) flaskProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
