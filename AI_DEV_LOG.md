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
