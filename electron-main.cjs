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
let backendPath = null;

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
    ? 'http://127.0.0.1:8080'
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

// Copy backend files to completely hidden app data directory
async function setupBackendFiles() {
  if (isDev) {
    backendPath = path.join(__dirname, 'backend');
    return;
  }

  // Use app data directory with hidden folder name
  const appDataPath = app.getPath('userData');
  backendPath = path.join(appDataPath, '.silvertally-backend');
  
  // Source is now in ASAR archive - use __dirname since backend is packed in ASAR
  const sourceBackendPath = path.join(__dirname, 'backend');

  // Check if source backend exists
  if (!fs.existsSync(sourceBackendPath)) {
    throw new Error(`Backend source not found at ${sourceBackendPath}`);
  }

  // Check if backend already exists and is up to date
  const versionFile = path.join(backendPath, '.version');
  const lockFile = path.join(backendPath, '.installed');
  const currentVersion = app.getVersion();
  
  let needsCopy = true;
  if (fs.existsSync(versionFile) && fs.existsSync(lockFile)) {
    try {
      const existingVersion = fs.readFileSync(versionFile, 'utf8').trim();
      if (existingVersion === currentVersion && fs.existsSync(path.join(backendPath, 'run.py'))) {
        needsCopy = false;
        console.log('Backend files are up to date, skipping copy');
      }
    } catch (e) {
      console.log('Version check failed, will copy backend files');
    }
  }

  if (needsCopy) {
    console.log('Extracting backend files from ASAR to hidden AppData location...');
    
    // Remove old backend if exists
    if (fs.existsSync(backendPath)) {
      try {
        fs.rmSync(backendPath, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to remove old backend:', e.message);
      }
    }

    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(backendPath), { recursive: true });

    // Copy backend files from ASAR to app data
    await copyDirectory(sourceBackendPath, backendPath);
    
    // Write version and lock files
    fs.writeFileSync(versionFile, currentVersion);
    fs.writeFileSync(lockFile, new Date().toISOString());
    
    // On Windows, hide the backend folder and make it system folder
    if (process.platform === 'win32') {
      try {
        exec(`attrib +h +s "${backendPath}"`, (error) => {
          if (error) console.warn('Failed to hide backend folder:', error.message);
          else console.log('Backend folder hidden successfully');
        });
      } catch (e) {
        console.warn('Could not hide backend folder:', e.message);
      }
    }
    
    console.log('Backend files extracted successfully to:', backendPath);
  }
}

// Helper function to copy directory recursively
async function copyDirectory(src, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dest, { recursive: true }, (err) => {
      if (err) return reject(err);
      
      fs.readdir(src, (err, files) => {
        if (err) return reject(err);
        
        let pending = files.length;
        if (pending === 0) return resolve();
        
        files.forEach((file) => {
          const srcPath = path.join(src, file);
          const destPath = path.join(dest, file);
          
          fs.stat(srcPath, (err, stats) => {
            if (err) return reject(err);
            
            if (stats.isDirectory()) {
              copyDirectory(srcPath, destPath).then(() => {
                if (--pending === 0) resolve();
              }).catch(reject);
            } else {
              fs.copyFile(srcPath, destPath, (err) => {
                if (err) return reject(err);
                if (--pending === 0) resolve();
              });
            }
          });
        });
      });
    });
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
  const reqPath = path.join(backendPath, 'requirements.txt');
  
  // Check if requirements.txt exists
  if (!fs.existsSync(reqPath)) {
    console.log('No requirements.txt found, skipping dependency installation');
    return;
  }

  return new Promise((resolve, reject) => {
    // Try different pip commands in order of preference
    const pipCommands = ['pip', 'pip3', 'python -m pip', 'python3 -m pip'];
    let currentCommand = 0;

    const tryPipInstall = () => {
      if (currentCommand >= pipCommands.length) {
        return reject(new Error('All pip installation attempts failed'));
      }

      const pipCmd = pipCommands[currentCommand].split(' ');
      const command = pipCmd[0];
      const args = [...pipCmd.slice(1), 'install', '-r', reqPath, '--user', '--no-warn-script-location'];

      console.log(`Attempting pip install with: ${pipCommands[currentCommand]}`);
      
      const pip = spawn(command, args, {
        stdio: isDev ? 'inherit' : 'pipe',
        shell: true, // Important for Windows compatibility
        cwd: backendPath
      });

      let errorOutput = '';
      
      if (pip.stderr) {
        pip.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      }

      pip.on('close', (code) => {
        if (code === 0) {
          console.log('Dependencies installed successfully');
          resolve();
        } else {
          console.log(`pip command failed with code ${code}, trying next...`);
          console.log('Error output:', errorOutput);
          currentCommand++;
          setTimeout(tryPipInstall, 1000); // Wait a bit before trying next
        }
      });

      pip.on('error', (err) => {
        console.log(`pip command error: ${err.message}, trying next...`);
        currentCommand++;
        setTimeout(tryPipInstall, 1000);
      });
    };

    tryPipInstall();
  });
}

function startFlask() {
  // Try different Python commands
  const pythonCommands = ['python', 'python3', 'py'];
  const script = path.join(backendPath, 'run.py');

  // Check if run.py exists
  if (!fs.existsSync(script)) {
    console.error('Flask script not found:', script);
    dialog.showErrorBox('Backend Error', `Flask script not found at ${script}`);
    return;
  }

  let pythonCmd = 'python';
  
  // Find working Python command
  for (const cmd of pythonCommands) {
    try {
      require('child_process').execSync(`${cmd} --version`, { timeout: 5000 });
      pythonCmd = cmd;
      break;
    } catch (e) {
      continue;
    }
  }

  console.log(`Starting Flask with: ${pythonCmd} ${script}`);
  console.log(`Working directory: ${backendPath}`);

  flaskProcess = spawn(pythonCmd, [script], {
    cwd: backendPath,
    stdio: isDev ? 'inherit' : 'pipe',
    env: { 
      ...process.env, 
      PYTHONUNBUFFERED: '1',
      PYTHONPATH: backendPath // Ensure Python can find modules
    },
    shell: process.platform === 'win32' // Use shell on Windows
  });

  if (!isDev && flaskProcess.stdout) {
    flaskProcess.stdout.on('data', (data) => {
      console.log(`[Flask]: ${data.toString().trim()}`);
    });
  }
  
  if (!isDev && flaskProcess.stderr) {
    flaskProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.error(`[Flask Error]: ${message}`);
      
      // Show critical errors to user
      if (message.includes('ModuleNotFoundError') || message.includes('ImportError')) {
        dialog.showErrorBox('Flask Error', `Missing Python module: ${message}`);
      }
    });
  }

  flaskProcess.on('close', (code) => {
    console.log(`Flask exited with code ${code}`);
    if (code !== 0 && code !== null) {
      dialog.showErrorBox('Flask Error', `Flask server stopped unexpectedly (code: ${code})`);
    }
  });

  flaskProcess.on('error', (err) => {
    console.error('Flask failed to start:', err.message);
    dialog.showErrorBox('Flask Error', `Failed to start Flask: ${err.message}`);
  });

  // Give Flask some time to start
  setTimeout(() => {
    console.log('Flask should be running now');
  }, 2000);
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
  console.log('Setting up Python environment...');
  
  const pythonExists = await checkPythonInstallation();
  if (!pythonExists) {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Install', 'Cancel'],
      message: 'Python is required.',
      detail: 'Install Python 3.11.0 automatically?',
    });

    if (result.response === 0) {
      try {
        const installerPath = await downloadPython();
        await installPython(installerPath);
        
        // Wait a bit for Python to be available in PATH
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        throw new Error(`Failed to install Python: ${error.message}`);
      }
    } else {
      app.quit();
      return;
    }
  }

  // Install dependencies
  console.log('Installing Python dependencies...');
  try {
    await installPythonDependencies();
  } catch (error) {
    console.error('Failed to install dependencies:', error.message);
    
    // Show error but continue - some apps might work without all dependencies
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Continue Anyway', 'Quit'],
      message: 'Failed to install Python dependencies',
      detail: `Error: ${error.message}\n\nThe app may not work correctly. Continue anyway?`,
    });
    
    if (result.response === 1) {
      app.quit();
      return;
    }
  }

  console.log('Starting Flask server...');
  startFlask();
}

// --- Main app startup ---

app.whenReady().then(async () => {
  createWindow();
  try {
    await setupBackendFiles(); // Setup backend files first
    await setupPythonEnvironment();
    // await waitForFlask(); // optionally wait
    console.log("Backend running from hidden location (extracted from ASAR):", backendPath);
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

// Clean up on app quit
app.on('before-quit', () => {
  if (flaskProcess) {
    flaskProcess.kill('SIGTERM');
  }
});