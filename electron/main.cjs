const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

// 啟動後端 Express 服務
// 這裡我們直接 require server.cjs，它會啟動在 3001 埠
try {
    require('../server.cjs');
    console.log('Express backend started via Electron main process');
} catch (err) {
    console.error('Failed to start Express backend:', err);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        title: 'SVN Merge Tool',
        icon: path.join(__dirname, '../public/vite.svg'), // 暫用 vite 圖示
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // 隱藏預設選單
    win.setMenuBarVisibility(false);

    if (isDev) {
        // 開發環境：載入 Vite 開發伺服器
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // 生產環境：載入 build 後的 index.html
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
