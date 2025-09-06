const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let flaskProcess = null;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false
  });

  // Hide menu bar for production look
  Menu.setApplicationMenu(null);

  // Load the React app 
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000'); // Vite dev server
  } else {
    mainWindow.loadURL('http://localhost:5000'); // Production build served by Flask
  }
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startFlask() {
  // Start Flask server
  const flaskScript = path.join(__dirname, 'backend', 'run.py');
  flaskProcess = spawn('python', [flaskScript], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit', // Don't inherit stdio to prevent detaching // Ensure process stays attached to parent
  });
  
  flaskProcess.on('error', (err) => {
    console.error('Failed to start Flask:', err);
  });

  // Ensure Flask process is killed when parent process exits
  process.on('exit', () => {
    if (flaskProcess && !flaskProcess.killed) {
      flaskProcess.kill('SIGTERM');
    }
  });
}

app.whenReady().then(() => {
  startFlask();
  
  // Wait for Flask to start, then create window
  setTimeout(() => {
    createWindow();
  }, 3000);
});

app.on('window-all-closed', () => {
  if (flaskProcess && !flaskProcess.killed) {
    flaskProcess.kill('SIGTERM');
    flaskProcess = null;
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  };
});

app.on('before-quit', () => {
  if (flaskProcess && !flaskProcess.killed) {
    flaskProcess.kill('SIGTERM');
    flaskProcess = null;
  }
});