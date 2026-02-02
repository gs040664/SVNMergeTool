// 子目錄映射配置
export interface SubDirMap {
    internal: string;
    others: string;
}

export interface EnvironmentPaths {
    root: string;
    name?: string; // 環境顯示名稱，用於提交訊息
}

export interface MergeStepConfig {
    id: string;
    name: string;
    source: string; // key of environments or 'internal'
    target: string; // key of environments
    type: 'manual' | 'auto';
    isHotfix?: boolean;
}

export interface Profile {
    id: string;
    name: string;
    description: string;
    directories: SubDirMap[];
    steps: MergeStepConfig[];
    environments: {
        svn: Record<string, EnvironmentPaths>;
        local: Record<string, EnvironmentPaths>;
    };
}

// 預設 (國際版)
const DEFAULT_DIRS: SubDirMap[] = [
    { internal: 'Client/Assets/Game/art', others: 'Client/Assets/Game/art' },
    { internal: 'Client/Assets/Game/audio', others: 'Client/Assets/Game/audio' },
    { internal: 'Client/Assets/Game/data_en', others: 'Client/Assets/Game/data' },
    { internal: 'Client/Assets/Game/design_en', others: 'Client/Assets/Game/design' },
    { internal: 'Client/Assets/Game/ngui', others: 'Client/Assets/Game/ngui' },
    { internal: 'Client/BundleBuild/Pandora', others: 'Client/BundleBuild/Pandora' },
    { internal: 'Server/Data_en', others: 'Server/Data' },
    { internal: 'Server/Design_en', others: 'Server/Design' },
];

const DEFAULT_STEPS: MergeStepConfig[] = [
    { id: '1', name: '內版 >>> Release', source: 'internal', target: 'release', type: 'manual' },
    { id: '2', name: 'Release >>> Stable', source: 'release', target: 'stable', type: 'auto' },
    { id: '3', name: 'Stable >>> Stable2022', source: 'stable', target: 'stable2022', type: 'auto' },
    { id: '4', name: 'Stable >>> Hotfix', source: 'stable', target: 'hotfix', type: 'auto', isHotfix: true },
    { id: '5', name: 'Hotfix >>> Hotfix2022', source: 'stable2022', target: 'hotfix2022', type: 'auto', isHotfix: true },
];

// 日版/陸版通用目錄 (通常沒有 _en 後綴)
const NO_SUFFIX_DIRS: SubDirMap[] = [
    { internal: 'Client/Assets/Game/art', others: 'Client/Assets/Game/art' },
    { internal: 'Client/Assets/Game/audio', others: 'Client/Assets/Game/audio' },
    { internal: 'Client/Assets/Game/data', others: 'Client/Assets/Game/data' },
    { internal: 'Client/Assets/Game/design', others: 'Client/Assets/Game/design' },
    { internal: 'Client/Assets/Game/ngui', others: 'Client/Assets/Game/ngui' },
    { internal: 'Client/BundleBuild/Pandora', others: 'Client/BundleBuild/Pandora' },
    { internal: 'Server/Data', others: 'Server/Data' },
    { internal: 'Server/Design', others: 'Server/Design' },
];

// 陸版目錄 (_cn 後綴)
const CHINA_DIRS: SubDirMap[] = [
    { internal: 'Client/Assets/Game/art', others: 'Client/Assets/Game/art' },
    { internal: 'Client/Assets/Game/audio', others: 'Client/Assets/Game/audio' },
    { internal: 'Client/Assets/Game/data_cn', others: 'Client/Assets/Game/data' },
    { internal: 'Client/Assets/Game/design_cn', others: 'Client/Assets/Game/design' },
    { internal: 'Client/Assets/Game/ngui', others: 'Client/Assets/Game/ngui' },
    { internal: 'Client/BundleBuild/Pandora', others: 'Client/BundleBuild/Pandora' },
    { internal: 'Server/Data_cn', others: 'Server/Data' },
    { internal: 'Server/Design_cn', others: 'Server/Design' },
];

export const PRESET_PROFILES: Record<string, Profile> = {
    'default': {
        id: 'default',
        name: '國際版 (International)',
        description: '標準國際版流程 (_en 後綴, Release -> Stable -> Stable2022)',
        directories: DEFAULT_DIRS,
        steps: DEFAULT_STEPS,
        environments: {
            svn: {
                internal: { root: '', name: 'MobileAnime' },
                release: { root: '', name: 'Release' },
                stable: { root: '', name: 'Stable' },
                stable2022: { root: '', name: 'Stable2022' },
                hotfix: { root: '', name: 'Hotfix' },
                hotfix2022: { root: '', name: 'Hotfix2022' },
            },
            local: {
                release: { root: '' },
                stable: { root: '' },
                stable2022: { root: '' },
                hotfix: { root: '' },
                hotfix2022: { root: '' },
            }
        }
    },
    'japan': {
        id: 'japan',
        name: '日版 (Japan)',
        description: '日版流程 (無 _en 後綴, Release -> Stable2022)',
        directories: NO_SUFFIX_DIRS,
        steps: [
            { id: '1', name: '內版 >>> Release', source: 'internal', target: 'release', type: 'manual' },
            { id: '2', name: 'Release >>> Stable2022', source: 'release', target: 'stable2022', type: 'auto' },
            { id: '3', name: 'Stable2022 >>> Hotfix2022', source: 'stable2022', target: 'hotfix2022', type: 'auto', isHotfix: true },
        ],
        environments: {
            svn: {
                internal: { root: '', name: 'MobileAnime_JP' },
                release: { root: '', name: 'Release_JP' },
                stable2022: { root: '', name: 'Stable2022_JP' },
                hotfix2022: { root: '', name: 'Hotfix2022_JP' },
            },
            local: {
                release: { root: '' },
                stable2022: { root: '' },
                hotfix2022: { root: '' },
            }
        }
    },
    'china': {
        id: 'china',
        name: '陸版 (China)',
        description: '陸版流程 (_cn 後綴, 自定義流程)',
        directories: CHINA_DIRS,
        steps: [
            { id: '1', name: '內版 >>> Release', source: 'internal', target: 'release', type: 'manual' },
            { id: '2', name: 'Release >>> Stable', source: 'release', target: 'stable', type: 'auto' },
            { id: '3', name: 'Stable >>> Hotfix', source: 'stable', target: 'hotfix', type: 'auto', isHotfix: true },
        ],
        environments: {
            svn: {
                internal: { root: '', name: 'MobileAnime_CN' },
                release: { root: '', name: 'Release_CN' },
                stable: { root: '', name: 'Stable_CN' },
                hotfix: { root: '', name: 'Hotfix_CN' },
            },
            local: {
                release: { root: '' },
                stable: { root: '' },
                hotfix: { root: '' },
            }
        }
    }
};

// 相容性: 舊版 Config 介面 (用於遷移)
export interface PathConfig {
    local: {
        release: EnvironmentPaths;
        stable: EnvironmentPaths;
        stable2022: EnvironmentPaths;
        hotfix: EnvironmentPaths;
        hotfix2022: EnvironmentPaths;
    };
    svn: {
        internal: EnvironmentPaths; // 內版環境
        release: EnvironmentPaths;
        stable: EnvironmentPaths;
        stable2022: EnvironmentPaths;
        hotfix: EnvironmentPaths;
        hotfix2022: EnvironmentPaths;
    };
}

export const defaultConfig: PathConfig = {
    local: {
        release: { root: '' },
        stable: { root: '' },
        stable2022: { root: '' },
        hotfix: { root: '' },
        hotfix2022: { root: '' },
    },
    svn: {
        internal: { root: '' },
        release: { root: '' },
        stable: { root: '' },
        stable2022: { root: '' },
        hotfix: { root: '' },
        hotfix2022: { root: '' },
    },
};

// 為了相容現有的 imports，暫時保留 SUB_DIRECTORIES_MAP，但標記為 Deprecated
export const SUB_DIRECTORIES_MAP = DEFAULT_DIRS;
