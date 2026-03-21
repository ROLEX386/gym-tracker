const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const extract = require('extract-zip');
const os = require('os');

function createWindow () {
  const win = new BrowserWindow({
    width: 600,
    height: 480,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Simplifies IPC for this specific custom installer scope
    },
    resizable: false,
    autoHideMenuBar: true
  });
  
  win.setMenu(null);
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

// IPC handler for decryption & extraction
ipcMain.handle('decrypt-and-install', async (event, { aesKey, aesIv }) => {
    try {
        const payloadPath = path.join(__dirname, 'payloads', 'gym_tracker_payload.enc');
        
        // We will extract it to the user's Desktop
        const installDir = path.join(os.homedir(), 'Desktop', 'Installed_Gym_Tracker');
        const tempZipPath = path.join(os.tmpdir(), 'gym_tracker_temp.zip');
        
        if (!fs.existsSync(payloadPath)) {
            throw new Error(`Payload missing at ${payloadPath}`);
        }

        // 1. Decrypt from .enc to temp .zip
        const key = Buffer.from(aesKey, 'hex');
        const iv = Buffer.from(aesIv, 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const inputStr = fs.createReadStream(payloadPath);
        const outputStr = fs.createWriteStream(tempZipPath);
        
        await new Promise((resolve, reject) => {
            inputStr.pipe(decipher).pipe(outputStr)
                .on('finish', resolve)
                .on('error', reject);
        });

        // 2. Extract into user Desktop directory
        if (!fs.existsSync(installDir)) {
            fs.mkdirSync(installDir, { recursive: true });
        }
        
        await extract(tempZipPath, { dir: installDir });
        
        // 3. Cleanup temp zip
        if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
        
        return { success: true, path: installDir };
    } catch (err) {
        console.error("Installation failed", err);
        return { success: false, error: err.message };
    }
});
