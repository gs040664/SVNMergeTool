import { useState, useEffect } from 'react';
import { PRESET_PROFILES } from '../types/config';
import type { Profile, PathConfig } from '../types/config';

const STORAGE_KEY_PROFILES = 'svn_merge_profiles';
const STORAGE_KEY_ACTIVE_ID = 'svn_merge_active_profile_id';
const STORAGE_KEY_LEGACY = 'svn_merge_config';

export const useProfiles = () => {
    const [profiles, setProfiles] = useState<Record<string, Profile>>(() => {
        try {
            const savedProfiles = localStorage.getItem(STORAGE_KEY_PROFILES);
            let initialProfiles: Record<string, Profile> = savedProfiles ? JSON.parse(savedProfiles) : {};

            // 如果沒有 Profiles，嘗試遷移舊版 Config 或載入預設值
            if (Object.keys(initialProfiles).length === 0) {
                const legacyConfig = localStorage.getItem(STORAGE_KEY_LEGACY);
                const defaultProfile = { ...PRESET_PROFILES['default'] };

                if (legacyConfig) {
                    try {
                        const parsed: PathConfig = JSON.parse(legacyConfig);
                        defaultProfile.environments.svn = { ...defaultProfile.environments.svn, ...parsed.svn };
                        defaultProfile.environments.local = { ...defaultProfile.environments.local, ...parsed.local };
                    } catch (e) {
                        console.error('Failed to migrate legacy config', e);
                    }
                }
                initialProfiles['default'] = defaultProfile;
                initialProfiles['japan'] = { ...PRESET_PROFILES['japan'] };
                initialProfiles['china'] = { ...PRESET_PROFILES['china'] };
            }
            return initialProfiles;
        } catch (e) {
            console.error('Failed to initialize profiles', e);
            return PRESET_PROFILES; // Fallback
        }
    });

    const [activeProfileId, setActiveProfileId] = useState<string>(() => {
        const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
        return savedActiveId && profiles[savedActiveId] ? savedActiveId : 'default';
    });

    // 儲存變更
    useEffect(() => {
        if (Object.keys(profiles).length > 0) {
            localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
        }
    }, [profiles]);

    useEffect(() => {
        if (activeProfileId) {
            localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeProfileId);
        }
    }, [activeProfileId]);

    const activeProfile = profiles[activeProfileId] || PRESET_PROFILES['default'];

    const switchProfile = (id: string) => {
        if (profiles[id]) {
            setActiveProfileId(id);
        }
    };

    const updateProfile = (id: string, updates: Partial<Profile>) => {
        setProfiles(prev => ({
            ...prev,
            [id]: { ...prev[id], ...updates }
        }));
    };

    const updateEnvironment = (profileId: string, type: 'svn' | 'local', key: string, field: 'root' | 'name', value: string) => {
        setProfiles(prev => {
            const profile = prev[profileId];
            if (!profile) return prev;

            const existingEnv = profile.environments[type][key] || { root: '' };

            return {
                ...prev,
                [profileId]: {
                    ...profile,
                    environments: {
                        ...profile.environments,
                        [type]: {
                            ...profile.environments[type],
                            [key]: {
                                ...existingEnv,
                                [field]: value
                            }
                        }
                    }
                }
            };
        });
    };

    const createProfile = (name: string, baseProfileId: string = 'default') => {
        const id = crypto.randomUUID();
        const base = profiles[baseProfileId] || PRESET_PROFILES['default'];

        const newProfile: Profile = {
            ...base,
            id,
            name,
            description: `複製自 ${base.name}`,
            // 複製時清空路徑，避免混淆，或者保留？這裡選擇清空 root 但保留結構
            environments: JSON.parse(JSON.stringify(base.environments))
        };

        // 清空 root
        Object.keys(newProfile.environments.svn).forEach(k => newProfile.environments.svn[k].root = '');
        Object.keys(newProfile.environments.local).forEach(k => newProfile.environments.local[k].root = '');

        setProfiles(prev => ({ ...prev, [id]: newProfile }));
        setActiveProfileId(id);
    };

    const deleteProfile = (id: string) => {
        if (Object.keys(profiles).length <= 1) {
            alert('至少需保留一個設定檔');
            return;
        }

        setProfiles(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });

        if (activeProfileId === id) {
            const remaining = Object.keys(profiles).filter(k => k !== id);
            setActiveProfileId(remaining[0] || 'default');
        }
    };

    const resetProfile = (id: string) => {
        if (PRESET_PROFILES[id]) {
            setProfiles(prev => ({
                ...prev,
                [id]: { ...PRESET_PROFILES[id] }
            }));
        } else {
            alert('此設定檔非預設樣板，無法重設。');
        }
    };

    return {
        profiles,
        activeProfileId,
        activeProfile,
        switchProfile,
        updateProfile,
        updateEnvironment,
        createProfile,
        deleteProfile,
        resetProfile
    };
};
