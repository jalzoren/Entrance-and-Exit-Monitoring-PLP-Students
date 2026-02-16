const { app, BrowserWindow } = require("electron");
//npm run start to start
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: true,           // keeps OS toolbar with X, minimize, maximize
    fullscreenable: false, // optional: prevent true fullscreen
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    
  });
  win.setMenuBarVisibility(false);


  // Load your Vite app
  win.loadURL("http://localhost:5173");

  // Maximize window to fill screen but keep toolbar
  win.maximize();
}

// Create window when app is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
