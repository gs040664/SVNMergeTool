# SVN Merge Tool

A desktop application designed to simplify and visualize the SVN merge workflow across different environments.

> **Note**: For the complete documentation and user guide (Traditional Chinese), please refer to [PROJECT_DOCS_ZH.md](./PROJECT_DOCS_ZH.md).
>
> **注意**: 完整的繁體中文使用說明與版本紀錄，請參閱 [PROJECT_DOCS_ZH.md](./PROJECT_DOCS_ZH.md)。

## Features
- **Visual Log Picker**: Easily select revisions to merge.
- **Smart Automation**: Define merge chains (e.g., Internal -> Release) and execute them automatically.
- **Conflict Handling**: Built-in prompts for manual conflict resolution.
- **Merge Info Integration**: Automatically grays out already merged revisions.
- **Electron App**: packaged as a standalone `.exe`.

## Quick Start (Dev)

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Development Server**
    ```bash
    npm run dev
    npm run server
    # Or run electron app directly
    npm run electron:dev
    ```

3.  **Build**
    ```bash
    npm run dist
    ```
