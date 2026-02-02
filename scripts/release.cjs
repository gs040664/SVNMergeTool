const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const docsPath = path.resolve(__dirname, '../PROJECT_DOCS_ZH.md');
const releaseJsonPath = path.resolve(__dirname, '../release.json');

// 1. 讀取設定
let releaseConfig = { active: false, type: 'patch', notes: [] };
if (fs.existsSync(releaseJsonPath)) {
    try {
        releaseConfig = JSON.parse(fs.readFileSync(releaseJsonPath, 'utf8'));
    } catch (e) {
        console.warn('[Release] Failed to parse release.json, using default patch.');
    }
}

// 2. 讀取並更新 package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.').map(Number); // [Major, Minor, Patch]

// 決定版本升級邏輯
if (releaseConfig.active) {
    if (releaseConfig.type === 'major') {
        versionParts[0] += 1;
        versionParts[1] = 0;
        versionParts[2] = 0;
    } else if (releaseConfig.type === 'minor') {
        versionParts[1] += 1;
        versionParts[2] = 0;
    } else {
        // pattern or unknown fallback to patch
        versionParts[2] += 1;
    }
} else {
    // 預設行為: 如果沒有特別指定，則 Patch + 1
    versionParts[2] += 1;
}

const newVersion = versionParts.join('.');
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`[Release] Version bumped: ${currentVersion} -> ${newVersion} (${releaseConfig.active ? releaseConfig.type : 'auto-patch'})`);

// 3. 更新 PROJECT_DOCS_ZH.md
if (fs.existsSync(docsPath)) {
    let docsContent = fs.readFileSync(docsPath, 'utf8');
    const date = new Date().toISOString().split('T')[0]; // 定位插入點 (行基模)
    const lines = docsContent.split(/\r?\n/);
    const anchorIndex = lines.findIndex(line => line.includes('本專案之開發歷程與變更紀錄整理如下：'));

    if (anchorIndex !== -1) {
        let notesContent = '';
        if (releaseConfig.active && releaseConfig.notes && releaseConfig.notes.length > 0) {
            notesContent = releaseConfig.notes.map(note => `- ${note}`).join('\n');
        } else {
            notesContent = '- **[Auto Build]** 自動建置與版本推進。';
        }

        const newEntryLines = [
            '',
            `### v${newVersion} - ${releaseConfig.title || '自動發布'} (${date})`,
            notesContent
        ];

        // 插入在 anchorIndex + 1 (即下一行，通常是空行或下一個標題)
        // 為了保持格式，我們在 anchorIndex + 1 的位置插入
        lines.splice(anchorIndex + 1, 0, ...newEntryLines);

        fs.writeFileSync(docsPath, lines.join('\n'), 'utf8');
        console.log(`[Release] Release notes updated in PROJECT_DOCS_ZH.md`);
    } else {
        console.warn(`[Release] Could not find anchor for release notes in PROJECT_DOCS_ZH.md`);
    }
} else {
    console.warn(`[Release] PROJECT_DOCS_ZH.md not found`);
}

// 4. 重置 release.json (防止重複套用)
if (releaseConfig.active) {
    const resetConfig = {
        active: false,
        type: 'patch',
        notes: []
    };
    fs.writeFileSync(releaseJsonPath, JSON.stringify(resetConfig, null, 2));
    console.log('[Release] release.json has been reset to inactive.');
}
