
const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const https = require('https');

// Simple isDev check without external dependency
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

  // Load the correct URL based on environment
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the built files
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    console.log('Loading index.html from:', indexPath);
    mainWindow.loadFile(indexPath);
  }
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function checkPythonInstallation() {
  return new Promise((resolve) => {
    // Try python first, then python3
    exec('python --version', { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        exec('python3 --version', { timeout: 5000 }, (error, stdout, stderr) => {
          if (error) {
            console.log('Python not found with python3 command');
            resolve(false);
          } else {
            console.log('Python found with python3:', stdout);
            resolve(true);
          }
        });
      } else {
        console.log('Python found with python:', stdout);
        resolve(true);
      }
    });
  });
}

async function downloadPython() {
  return new Promise((resolve, reject) => {
    const pythonUrl = 'https://www.python.org/ftp/python/3.11.0/python-3.11.0-amd64.exe';
    const pythonPath = path.join(process.cwd(), 'python-installer.exe');
    
    console.log('Downloading Python from:', pythonUrl);
    
    const file = fs.createWriteStream(pythonPath);
    
    https.get(pythonUrl, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('Python downloaded successfully');
        resolve(pythonPath);
      });
    }).on('error', (err) => {
      fs.unlink(pythonPath, () => {}); // Delete the file async
      reject(err);
    });
  });
}

async function installPython(installerPath) {
  return new Promise((resolve, reject) => {
    console.log('Installing Python...');
    
    // Install Python silently with PATH addition
    const installer = spawn(installerPath, [
      '/quiet',
      'InstallAllUsers=1',
      'PrependPath=1',
      'Include_test=0'
    ], { stdio: 'pipe' });
    
    installer.on('close', (code) => {
      console.log('Python installation finished with code:', code);
      // Clean up installer
      fs.unlink(installerPath, () => {});
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Python installation failed with code: ${code}`));
      }
    });
    
    installer.on('error', (error) => {
      reject(error);
    });
  });
}

async function installPythonDependencies() {
  const requirementsPath = isDev 
    ? path.join(__dirname, 'backend', 'requirements.txt')
    : path.join(process.resourcesPath, 'backend', 'requirements.txt');
    
  console.log('Installing Python dependencies from:', requirementsPath);
    
  return new Promise((resolve, reject) => {
    // Try pip first, then pip3
    const pip = spawn('pip', ['install', '-r', requirementsPath], {
      stdio: 'pipe',
      timeout: 60000
    });
    
    let output = '';
    pip.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pip.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    pip.on('close', (code) => {
      console.log('Pip install output:', output);
      if (code === 0) {
        resolve();
      } else {
        // Try with pip3 if pip failed
        const pip3 = spawn('pip3', ['install', '-r', requirementsPath], {
          stdio: 'pipe',
          timeout: 60000
        });
        
        pip3.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Both pip and pip3 failed. Last exit code: ${code}`));
          }
        });
        
        pip3.on('error', (error) => {
          reject(new Error(`Pip3 error: ${error.message}`));
        });
      }
    });
    
    pip.on('error', (error) => {
      console.log('Pip error, trying pip3:', error.message);
    });
  });
}

async function setupPythonEnvironment() {
  try {
    console.log('Checking Python installation...');
    let pythonInstalled = await checkPythonInstallation();
    
    if (!pythonInstalled) {
      const response = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['Install Automatically', 'Cancel'],
        defaultId: 0,
        title: 'Python Required',
        message: 'Python is not installed on your system.',
        detail: 'This application requires Python to run. Would you like to install Python automatically?'
      });
      
      if (response.response === 0) {
        try {
          // Show progress dialog
          const progressDialog = new BrowserWindow({
            width: 400,
            height: 200,
            parent: mainWindow,
            modal: true,
            show: false,
            frame: false,
            webPreferences: {
              nodeIntegration: true,
              contextIsolation: false
            }
          });
          
          progressDialog.loadURL('data:text/html,<html><body style="font-family:Arial;padding:20px;text-align:center;"><h2>Installing Python...</h2><p>Please wait while Python is being downloaded and installed.</p></body></html>');
          progressDialog.show();
          
          // Download and install Python
          const installerPath = await downloadPython();
          await installPython(installerPath);
          
          progressDialog.close();
          
          await dialog.showMessageBox(mainWindow, {
            type: 'info',
            buttons: ['OK'],
            title: 'Installation Complete',
            message: 'Python has been installed successfully!',
            detail: 'The application will now continue starting up.'
          });
          
          // Recheck Python installation
          pythonInstalled = await checkPythonInstallation();
        } catch (error) {
          console.error('Error installing Python:', error);
          await dialog.showMessageBox(mainWindow, {
            type: 'error',
            buttons: ['OK'],
            title: 'Installation Failed',
            message: 'Failed to install Python automatically.',
            detail: `Error: ${error.message}\n\nPlease install Python manually from python.org`
          });
          app.quit();
          return;
        }
      } else {
        app.quit();
        return;
      }
    }
    
    if (!pythonInstalled) {
      app.quit();
      return;
    }
    
    console.log('Python found, installing dependencies...');
    // Install Python dependencies
    await installPythonDependencies();
    console.log('Dependencies installed, starting Flask...');
    startFlask();
    
  } catch (error) {
    console.error('Error setting up Python environment:', error);
    
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      buttons: ['OK'],
      title: 'Setup Error', 
      message: 'Failed to set up Python environment.',
      detail: `Error: ${error.message}\n\nTrying to start Flask anyway...`
    });
    
    // Try to start Flask anyway in case it's a dependency issue
    startFlask();
  }
}

function startFlask() {
  // Determine Python command and script path
  const pythonCmd = 'python'; // Try python first
  const flaskScript = isDev
    ? path.join(__dirname, 'backend', 'run.py')
    : path.join(process.resourcesPath, 'backend', 'run.py');

  const workingDir = isDev 
    ? path.join(__dirname, 'backend')
    : path.join(process.resourcesPath, 'backend');

  console.log('Starting Flask with:');
  console.log('Command:', pythonCmd);
  console.log('Script:', flaskScript);
  console.log('Working directory:', workingDir);

  // Check if the script exists
  if (!fs.existsSync(flaskScript)) {
    console.error('Flask script not found at:', flaskScript);
    return;
  }

  flaskProcess = spawn(pythonCmd, [flaskScript], {
    cwd: workingDir,
    stdio: isDev ? 'inherit' : 'pipe',
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });
  
  if (!isDev) {
    flaskProcess.stdout.on('data', (data) => {
      console.log('Flask stdout:', data.toString());
    });
    
    flaskProcess.stderr.on('data', (data) => {
      console.error('Flask stderr:', data.toString());
    });
  }
  
  flaskProcess.on('error', (err) => {
    console.error('Failed to start Flask:', err);
    
    // Try with python3 if python failed
    if (pythonCmd === 'python') {
      console.log('Retrying with python3...');
      const flaskProcess3 = spawn('python3', [flaskScript], {
        cwd: workingDir,
        stdio: isDev ? 'inherit' : 'pipe',
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });
      
      flaskProcess3.on('error', (err) => {
        console.error('Failed to start Flask with python3:', err);
      });
    }
  });

  flaskProcess.on('close', (code) => {
    console.log(`Flask process exited with code ${code}`);
  });
}

async function waitForFlask(url = "http://127.0.0.1:5000/health", timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', retry);
    };
    const retry = () => {
      if (Date.now() - start >= timeout) {
        reject(new Error("Flask backend did not become ready in time."));
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

app.whenReady().then(async () => {
  createWindow(); // Create the window (hidden initially)

  // Load frontend immediately, regardless of backend state
  if (isDev) {
    mainWindow.loadURL("http://localhost:8080");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "dist", "index.html");
    console.log("Loading index.html from:", indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Show window as soon as the frontend is loaded
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Start backend in the background
  try {
    await setupPythonEnvironment(); // Start Flask
    // await waitForFlask();        // Optional: wait if needed
    console.log("Backend started successfully.");
  } catch (err) {
    console.error("Backend failed to start:", err.message);
    dialog.showErrorBox("Backend Error", "Flask server could not start.\n\nYou can still use the UI, but some features may not work.\n\nError: " + err.message);
  }
});



