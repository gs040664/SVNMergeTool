# AI Development Log
This file tracks project evolution for AI context retrieval.

## [2026-02-02] v1.3.0 - Git Initialization & Release Config

### 🤖 AI Summary (Technical Context)
- **Objective**: Initialize version control and configure release artifacts.
- **Changes**:
    - `git init`: Repository initialized.
    - `.gitignore`: Excluded `release/` directory.
    - `package.json`: Added `"artifactName": "${productName}_${version}.${ext}"` to `build`.
- **Key Decisions**: `release/` folder removed from git tracking to avoid large binary files (GH001 warning).
- **Context**: Project uses Electron-builder.

### 👤 Natural Language Summary (User Facing)
> **English**
> Initialized Git version control and configured .gitignore to exclude build artifacts. Updated package.json settings to automatically append the version number to the output filename (e.g., SVN Merge Tool_1.3.0.exe).
>
> **繁體中文**
> 初始化了 Git 版本控制，並設定了 .gitignore 排除打包檔案。調整了 package.json 設定，讓打包出來的執行檔名稱自動帶上版本號 (例如 SVN Merge Tool_1.3.0.exe)。

---

## [2026-02-02] v1.2.1 - Hotfix Settings & Bug Fixes

### 🤖 AI Summary (Technical Context)
- **Objective**: Address urgent hotfix workflow needs and UI bugs.
- **Changes**:
    - **Feature**: Added "Hotfix" checkbox in Path Settings to mark specific steps.
    - **Fix**: Resolved issue where "Add Merge Environment" button was unresponsive (replaced with inline input).
    - **UX**: Removed redundant placeholder text in input fields.

### 👤 Natural Language Summary (User Facing)
> **English**
> Added a "Hotfix" checkbox to path settings for marking critical steps. Fixed the unresponsive "Add Merge Environment" button and cleaned up input field placeholders.
>
> **繁體中文**
> 路徑設定新增「Hotfix」勾選框，可明確標記特定步驟為熱修流程。修復「新增合版環境」按鈕無反應的問題，並優化輸入欄位提示。

---

## [2026-02-02] v1.2.0 - UI & Experience Optimization

### 🤖 AI Summary (Technical Context)
- **Objective**: Enhance user interface labeling and profile management.
- **Changes**:
    - **UI**: Renamed "Path Configuration" to "Detailed Settings" and "Add Environment" to "Add Merge Environment".
    - **UX**: Integreted Profile selector into the main workspace.
    - **Style**: Optimized dropdown and button interactive styles.

### 👤 Natural Language Summary (User Facing)
> **English**
> Renamed key UI elements for clarity (e.g., "Detailed Settings"). Integrated the profile selector into the main workspace for easier access and polished button/dropdown styles.
>
> **繁體中文**
> 全面調整介面用語 (如：詳細設定)，將 Profile 選擇器整合至主工作區提升操作流暢度，並優化了按鈕與下拉選單的視覺樣式。

---

## [2026-01-30] v1.1.1 - Fixes & Optimization

### 🤖 AI Summary (Technical Context)
- **Objective**: Fix post-merge state cleanup and type errors.
- **Changes**:
    - **Fix**: Revision input field now clears automatically after merge.
    - **Fix**: Corrected TypeScript type definitions.

### 👤 Natural Language Summary (User Facing)
> **English**
> Fixed an issue where the revision input was not clearing after a merge. Corrected various TypeScript type errors.
>
> **繁體中文**
> 修正合併流程完成後，Revision 輸入框沒有自動清空的問題，並修復了部分 TypeScript 類型定義錯誤。

---

## [2026-01-30] v1.1.0 - Feature Completion

### 🤖 AI Summary (Technical Context)
- **Objective**: Implement safety checks and better selection UI.
- **Changes**:
    - **New**: Added "Commit Confirmation Modal" for editing messages before commit.
    - **New**: Added "Revision Picker Modal" for a wider view of log history.
    - **Refactor**: Refactored frontend data flow for state synchronization.

### 👤 Natural Language Summary (User Facing)
> **English**
> Introduced a Commit Confirmation Modal and a Revision Picker Modal for better control and visibility. Refactored internal data flow for better stability.
>
> **繁體中文**
> 新增提交確認視窗 (Commit Confirmation Modal) 與版號挑選器視窗 (Revision Picker Modal)，並重構前端資料流確保狀態同步。

---

## [2026-01-30] v1.0.0 - Initial Release

### 🤖 AI Summary (Technical Context)
- **Objective**: Initial project setup and core functionality.
- **Changes**:
    - **Init**: Project initialization with Vite + React + Electron.
    - **Feature**: Basic SVN merge functionality implemented.
    - **Feature**: Multi-environment path configuration.
    - **UI**: Dark Theme design system.

### 👤 Natural Language Summary (User Facing)
> **English**
> Initial release with core SVN merge functionality, multi-environment configuration, and a dark theme UI.
>
> **繁體中文**
> 專案初始化，實作基礎 SVN 合併功能、多環境路徑配置，並導入 Dark Theme 暗色主題設計。
