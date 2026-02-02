const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// 請求日誌中介軟體
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// 健康檢查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// 通用指令執行函數 (處理編碼與路徑)
const runSvn = (command, cwd, callback) => {
    // 檢查 command 是否包含潛在的換行符或隱含的注入
    const sanitizedCommand = command.replace(/[\r\n]/g, ' ');

    // 使用 chcp 65001 強制輸出 UTF-8，並設置 Node.js 讀取 buffer
    const fullCommand = `chcp 65001 > nul && ${sanitizedCommand}`;

    // 輸出到伺服器日誌以便偵錯
    console.log(`[SVN EXEC] ${sanitizedCommand}${cwd ? ` (CWD: ${cwd})` : ''}`);

    exec(fullCommand, { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[SVN ERROR] code: ${error.code}, message: ${error.message}`);
            if (stderr) console.error(`[SVN STDERR] ${stderr}`);
        }
        callback(error, stdout, stderr);
    });
};

// 合併
app.post('/api/merge', (req, res) => {
    const { sourcePath, targetPath, revision } = req.body;
    if (!sourcePath || !targetPath || !revision) {
        return res.status(400).json({ error: '缺少參數' });
    }

    const isUrl = /^(svn|http|https|file):\/\//i.test(sourcePath);
    const normalizedPath = isUrl ? sourcePath : path.normalize(sourcePath).replace(/\\/g, '/');

    // 嘗試解析原始路徑的 URL 以確保合併指力正確
    if (!isUrl) {
        const infoCommand = `svn info "${normalizedPath}" --xml --non-interactive`;
        runSvn(infoCommand, null, (infoErr, infoStdout) => {
            let targetForMerge = normalizedPath;
            if (!infoErr) {
                const urlMatch = infoStdout.match(/<url>(.*?)<\/url>/);
                if (urlMatch && urlMatch[1]) {
                    targetForMerge = urlMatch[1];
                    console.log(`[Merge Request] Resolved local path to URL: ${targetForMerge}`);
                }
            }
            const command = `svn merge -c ${revision} "${targetForMerge}" "${targetPath}" --non-interactive`;
            runSvn(command, null, (error, stdout, stderr) => {
                let output = (stdout || '') + (stderr ? `\nSTDERR: ${stderr}` : '');

                // 擴充衝突偵測
                const lines = (stdout || '').split(/\r?\n/);
                const conflicts = [];
                // 匹配兩種常見衝突模式:
                // 1. "C    path/to/file" (svn merge output)
                // 2. "Tree conflict on 'path/to/file'" or similar text (summary conflicts)
                lines.forEach(line => {
                    const match = line.match(/^C\s+(.+)$/);
                    if (match) {
                        conflicts.push(match[1].trim());
                    } else if (line.includes('Tree conflict') || line.includes('conflict discovered')) {
                        // 嘗試提取路徑，若太複雜則由 svn status 確認，這裡簡單提取這行作為提示
                        conflicts.push(line.trim());
                    }
                });

                if (error && error.code !== 1) { // code 1 可能是因為衝突導致的非零退出碼，視為成功但有衝突
                    return res.status(500).json({ success: false, error: error.message, output: output });
                }

                // 如果有衝突，回傳 conflicts 陣列
                res.json({ success: true, output: output, conflicts: conflicts.length > 0 ? conflicts : undefined });
            });
        });
    } else {
        const command = `svn merge -c ${revision} "${normalizedPath}" "${targetPath}" --non-interactive`;
        runSvn(command, null, (error, stdout, stderr) => {
            let output = (stdout || '') + (stderr ? `\nSTDERR: ${stderr}` : '');

            // 擴充衝突偵測
            const lines = (stdout || '').split(/\r?\n/);
            const conflicts = [];
            lines.forEach(line => {
                const match = line.match(/^C\s+(.+)$/);
                if (match) {
                    conflicts.push(match[1].trim());
                } else if (line.includes('Tree conflict') || line.includes('conflict discovered')) {
                    conflicts.push(line.trim());
                }
            });

            if (error && error.code !== 1) {
                return res.status(500).json({ success: false, error: error.message, output: output });
            }
            res.json({ success: true, output: output, conflicts: conflicts.length > 0 ? conflicts : undefined });
        });
    }
});

// 更新
app.post('/api/update', (req, res) => {
    const { path: targetPath } = req.body;
    const command = `svn update --non-interactive`;
    runSvn(command, targetPath, (error, stdout, stderr) => {
        let output = (stdout || '') + (stderr ? `\nSTDERR: ${stderr}` : '');
        if (error) return res.status(500).json({ success: false, error: error.message, output: output });
        res.json({ success: true, output: output });
    });
});

// 還原
app.post('/api/revert', (req, res) => {
    const { path: targetPath } = req.body;
    const command = `svn revert -R . --non-interactive`;
    runSvn(command, targetPath, (error, stdout, stderr) => {
        let output = (stdout || '') + (stderr ? `\nSTDERR: ${stderr}` : '');
        if (error) return res.status(500).json({ success: false, error: error.message, output: output });
        res.json({ success: true, output: output });
    });
});

// 提交
app.post('/api/commit', (req, res) => {
    const { path: targetPath, message } = req.body;

    // 在 Electron 環境下使用 userData 目錄，否則使用當前目錄
    const baseDir = (process.versions.electron)
        ? path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config'), 'svnmergetool')
        : __dirname;

    if (process.versions.electron && !fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    const msgFile = path.resolve(baseDir, 'svn_commit_msg.tmp');
    try {
        // 重要：確保以帶有 BOM 的 UTF-8 或單純 UTF-8 寫入，這裡使用純 UTF-8
        fs.writeFileSync(msgFile, message, 'utf8');
        console.log(`[提交訊息已寫入暫存檔] 長度: ${message.length}`);
    } catch (e) {
        return res.status(500).json({ success: false, error: '寫入暫存訊息檔失敗: ' + e.message });
    }

    // 在目標目錄下執行提交，並顯式指定暫存檔編碼
    const command = `svn commit -F "${msgFile}" --encoding UTF-8 --non-interactive`;

    runSvn(command, targetPath, (error, stdout, stderr) => {
        let output = (stdout || '') + (stderr ? `\nSTDERR: ${stderr}` : '');

        // 嘗試刪除暫存檔
        try { if (fs.existsSync(msgFile)) fs.unlinkSync(msgFile); } catch (e) { }

        if (error) return res.status(500).json({ success: false, error: error.message, output: output });
        res.json({ success: true, output: output });
    });
});



// 解決衝突
app.post('/api/resolve', (req, res) => {
    const { path: targetPath, file, choice } = req.body;

    // 驗證選項
    const validChoices = ['base', 'working', 'mine-conflict', 'theirs-conflict', 'mine-full', 'theirs-full', 'postpone'];
    if (!validChoices.includes(choice)) {
        return res.status(400).json({ success: false, error: `Invalid choice: ${choice}` });
    }

    // 建構指令: svn resolve --accept [choice] [file]
    // 必須在 targetPath (Working Copy Root) 下執行，或指定絕對路徑
    // file 參數通常是相對路徑或絕對路徑，建議傳入絕對路徑以避免 CWD 問題

    let filePath = file;
    // 簡單的防呆，如果 file 是相對路徑，且有傳入 targetPath，嘗試組合
    // (注意：前端通常會傳來完整路徑或相對於 root 的路徑，這裡假設前端會處理好或傳絕對路徑)

    // 這裡我們假設 file 若不是絕對路徑，則是相對於 targetPath
    if (!path.isAbsolute(file) && targetPath) {
        filePath = path.join(targetPath, file);
    }

    const command = `svn resolve --accept ${choice} "${filePath}" --non-interactive`;

    // 如果已有絕對路徑，CWD 可以是 null，或是 targetPath
    runSvn(command, targetPath || null, (error, stdout, stderr) => {
        let output = (stdout || '') + (stderr ? `\nSTDERR: ${stderr}` : '');
        if (error) return res.status(500).json({ success: false, error: error.message, output: output });
        res.json({ success: true, output: output });
    });
});
app.post('/api/status', (req, res) => {
    const { path: targetPath } = req.body;
    const command = `svn status`;

    runSvn(command, targetPath, (error, stdout, stderr) => {
        if (error && error.code !== 1) { // 這裡 error.code 1 有可能是正常的狀態輸出
            return res.status(500).json({ success: false, error: error.message });
        }
        res.json({ success: true, output: stdout || '' });
    });
});

// 獲取日誌訊息 (增加詳細資訊)
app.get('/api/logs-list', (req, res) => {
    const { path: sourcePath, limit = 50 } = req.query;
    console.log(`[Log List Request] Path: ${sourcePath}, Limit: ${limit}`);

    if (!sourcePath) return res.status(400).json({ success: false, error: '缺少路徑' });

    const isUrl = /^(svn|http|https|file):\/\//i.test(sourcePath);
    const normalizedPath = isUrl ? sourcePath : path.normalize(sourcePath).replace(/\\/g, '/');

    // 如果是本地路徑，先嘗試透過 svn info 取得其 URL，以確保抓到 HEAD 最新資訊
    if (!isUrl) {
        const infoCommand = `svn info "${normalizedPath}" --xml --non-interactive`;
        runSvn(infoCommand, null, (infoErr, infoStdout) => {
            let targetForLog = normalizedPath;
            if (!infoErr) {
                const urlMatch = infoStdout.match(/<url>(.*?)<\/url>/);
                if (urlMatch && urlMatch[1]) {
                    targetForLog = urlMatch[1];
                    console.log(`[Log List Request] Resolved local path to URL: ${targetForLog}`);
                }
            }
            fetchLogs(targetForLog, limit, res);
        });
    } else {
        fetchLogs(normalizedPath, limit, res);
    }
});

// 提取 Log 抓取邏輯為獨立函式
const fetchLogs = (target, limit, res) => {
    // 使用 --xml -v 獲取詳細資訊 (包含異動檔案)
    const command = `svn log "${target}" --limit ${limit} --xml --verbose --non-interactive`;

    runSvn(command, null, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ success: false, error: error.message });

        try {
            const logs = [];
            const logEntries = stdout.split('<logentry');

            for (let i = 1; i < logEntries.length; i++) {
                const entry = logEntries[i];
                const revision = entry.match(/revision="(\d+)"/)?.[1];
                const author = entry.match(/<author>(.*?)<\/author>/)?.[1] || 'Unknown';
                const date = entry.match(/<date>(.*?)<\/date>/)?.[1] || '';
                let msg = entry.match(/<msg>(.*?)<\/msg>/s)?.[1] || '';
                msg = msg.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

                // 解析異動檔案列表
                const changedFiles = [];
                const pathMatches = entry.match(/<path[\s\S]*?>([\s\S]*?)<\/path>/g);
                if (pathMatches) {
                    pathMatches.forEach(p => {
                        const action = p.match(/action="(.)"/)?.[1] || '?';
                        const filePath = p.match(/>(.*?)<\/path>/)?.[1] || '';
                        changedFiles.push({ action, path: filePath });
                    });
                }

                logs.push({ revision, author, date, msg, changedFiles });
            }

            res.json({ success: true, logs });
        } catch (e) {
            res.status(500).json({ success: false, error: '解析 Log 失敗: ' + e.message });
        }
    });
};

// 獲取合併資訊 (已合併哪些版號)
app.get('/api/mergeinfo', (req, res) => {
    const { source, target } = req.query;
    if (!source || !target) return res.status(400).json({ success: false, error: '缺少 source 或 target' });

    // 檢查 merged 版號
    const command = `svn mergeinfo --show-revs merged "${source}" "${target}"`;

    runSvn(command, null, (error, stdout, stderr) => {
        // svn mergeinfo 如果完全沒合併過可能會報錯或沒輸出，視為正常
        const revisions = (stdout || '')
            .split(/[\r\n]+/)
            .map(line => line.trim().replace(/^r/, ''))
            .filter(line => line && /^\d+$/.test(line));

        res.json({ success: true, revisions });
    });
});

app.get('/api/last-message', (req, res) => {
    const { path: targetPath, revision } = req.query;

    // 使用 --xml 獲取日誌，這在任何環境下都會回傳 UTF-8 編碼內容
    const revArg = revision ? `-r ${revision}` : '-l 1';
    const command = `svn log ${revArg} --xml "${targetPath}"`;

    runSvn(command, null, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // 解析 XML 中的 <msg> 内容
        const msgMatch = stdout.match(/<msg>([\s\S]*?)<\/msg>/);
        let message = msgMatch ? msgMatch[1] : '';

        // 還原基本的 XML 實體
        message = message
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");

        console.log(`[日誌解析] 版號 ${revision || 'latest'}: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`);
        res.json({ success: true, message: message.trim() || 'No message found' });
    });
});

app.use((req, res) => {
    console.error(`[404 NOT FOUND] ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`SVN 後端服務 (繁體中文強化版) 已啟動`);
    console.log(`路徑: http://127.0.0.1:${port}`);
    console.log(`-----------------------------------------`);
    console.log(`1. 已啟動 UTF-8 編碼強制 (chcp 65001)`);
    console.log(`2. 已開啟提交編碼指定 (--encoding UTF-8)`);
    console.log(`3. 已啟用 XML 日誌解析模式`);
    console.log(`=========================================\n`);
});
