# SVN Merge Tool 專案完整說明文件

## 📖 專案簡介
**SVN Merge Tool** 是一個專為簡化 Subversion (SVN) 合併流程而設計的現代化桌面應用程式。
旨在解決繁瑣的跨分支合併痛點，提供直觀的視覺化介面，協助開發者在不同環境（如 Internal, Release, Stable, Hotfix）之間高效且準確地進行程式碼合併。

---

## ✨ 核心功能

1.  **智慧型版號挑選 (Smart Log Picker)**
    - 自動抓取最新的 SVN Log。
    - 視覺化勾選需要合併的 Revision。
    - 自動串接 `svn mergeinfo`，已合併過的版號會自動反灰，防止重複合併。
    - 支援即時預覽異動檔案清單。

2.  **一鍵式多階段合併 (Multi-Stage Automation)**
    - 設定一次，自動執行後續流程。
    - 支援自定義合併鏈路 (例如: `Internal` -> `Release` -> `Stable`)。
    - 每一階段合併前提供 `Commit Message` 預覽與二次確認。

3.  **靈活的路徑配置 (Path Configuration)**
    - 支援多專案/多分支路徑設定。
    - 內建目錄映射功能 (`SUB_DIRECTORIES_MAP`)，解決不同分支目錄結構不一致的問題。

4.  **安全機制**
    - 合併完成後自動防呆 (清空輸入框)。
    - 合併前檢查工作目錄狀態。

---

## 📅 版本變更紀錄 (Version History)

本專案之開發歷程與變更紀錄整理如下：

### v1.3.0 - 自動發布 (2026-02-02)
- **[Feature]** 路徑設定新增「Hotfix」勾選框，可明確標記特定步驟為熱修流程。
- **[Fix]** 修復「新增合版環境」按鈕無反應的問題 (改用行內輸入框)。
- **[UX]** 優化輸入欄位提示，移除多餘的範例文字。


### v1.2.1 - 熱修設定與問題修正 (2026-02-02)
- **[Feature]** 路徑設定新增「Hotfix」勾選框，可明確標記特定步驟為熱修流程。
- **[Fix]** 修復「新增合版環境」按鈕無反應的問題 (改用行內輸入框)。
- **[UX]** 優化輸入欄位提示，移除多餘的範例文字。

### v1.2.0 - UI 與體驗優化 (2026-02-02)
- **[UI 優化]** 全面調整介面用語，提升專業度與易讀性：
    - 「Path Configuration」更名為「詳細設定 (Detailed Settings)」。
    - 「Add Environment」更名為「新增合併環境 (Add Merge Environment)」。
- **[UX 改進]** 將 Profile (設定檔) 選擇器整合至主工作區，切換專案更順手。
- **[樣式調整]** 優化下拉選單與按鈕的互動樣式。

### v1.1.1 - 修正與優化 (2026-01-30)
- **[Fix]** 修正合併流程完成後，Revision 輸入框沒有自動清空的問題。
- **[Fix]** 修正部分 TypeScript 類型定義錯誤。

### v1.1.0 - 功能完善 (2026-01-30)
- **[New]** 新增提交確認視窗 (Commit Confirmation Modal)，允許使用者在提交前修改訊息。
- **[New]** 新增版號挑選器視窗 (Revision Picker Modal)，提供更寬寬的檢視空間。
- **[Refactor]** 重構前端資料流，確保狀態同步。

### v1.0.0 - 初始發布 (2026-01-30)
- **[Init]** 專案初始化。
- **[Feature]** 基礎 SVN 合併功能實作。
- **[Feature]** 支援多環境路徑配置。
- **[Feature]** 整合 Electron 桌面框架。
- **[UI]** 導入 Dark Theme (暗色主題) 設計系統。

---

## 🛠️ 開發與安裝指南

###系統需求
- Node.js (v18+)
- SVN Command Line Tools (需加入系統 PATH)
- Windows OS (建議)

### 安裝步驟
1.  **下載專案**
    ```bash
    git clone <repository-url>
    cd SVNMergeTool
    ```

2.  **安裝依賴**
    ```bash
    npm install
    ```

3.  **啟動開發模式**
    ```bash
    # 同時啟動前端 Vite 與後端 Express Server
    npm run dev
    npm run server
    # 或直接啟動 Electron 開發視窗
    npm run electron:dev
    ```

4.  **打包應用程式**
    ```bash
    npm run dist
    ```
    打包後的執行檔位於 `release/` 資料夾中。

---

## 📂 專案結構說明

- **electron/**: Electron 主程序邏輯 (Main Process)。
- **src/**: React 前端介面原始碼 (Renderer Process)。
    - **components/**: UI 元件 (如 `MergeWorkspace`, `PathSettings`)。
    - **services/**: 負責與後端通訊的 API 服務 (`svnService.ts`)。
- **server.cjs**: 本地後端伺服器，負責實際執行 `svn` 系統指令。
- **release/**: 應用程式打包輸出目錄。

---
*文件產生日期: 2026-02-02*
