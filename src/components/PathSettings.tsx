import React, { useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { Folder, CheckCircle, Smartphone, Server as ServerIcon, MoveRight, Layers, Plus, Trash2, RefreshCw, ArrowUp, ArrowDown, GitMerge, Save } from 'lucide-react';
import type { SubDirMap } from '../types/config';

const PathSettings: React.FC = () => {
    const {
        profiles,
        activeProfileId,
        switchProfile,
        updateEnvironment,
        updateProfile,
        createProfile,
        deleteProfile,
        resetProfile
    } = useProfiles();

    // Local state for the profile being edited (decoupled from activeProfileId)
    const [editingProfileId, setEditingProfileId] = useState(activeProfileId);

    // Derived editing profile
    // Fallback to activeProfileId if editingProfileId is invalid (e.g. after deletion)
    const currentId = profiles[editingProfileId] ? editingProfileId : activeProfileId;
    const editingProfile = profiles[currentId];

    const [activeEnvTab, setActiveEnvTab] = useState<'local' | 'svn'>('local');
    const [isCreating, setIsCreating] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

    // State for Adding Environment
    const [isAddingEnv, setIsAddingEnv] = useState(false);
    const [newEnvName, setNewEnvName] = useState('');

    const normalizePath = (root: string, sub: string) => {
        if (!root) return `[未設定]\\${sub.replace(/\//g, '\\')}`;
        const r = root.replace(/[/\\]$/, '');
        const s = sub.replace(/^[/\\]/, '');
        return `${r}\\${s.replace(/\//g, '\\')}`;
    };

    const sectionStyle: React.CSSProperties = {
        backgroundColor: 'var(--sidebar-bg)',
        borderRadius: '8px',
        padding: '24px',
        border: '1px solid var(--border-color)',
        marginBottom: '24px'
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 12px',
        backgroundColor: '#0d1117',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        fontSize: '14px',
        outline: 'none'
    };

    const labelStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        fontWeight: 600,
        textTransform: 'uppercase'
    };

    const [isEditingRules, setIsEditingRules] = useState(false);

    // Directory Mapping Editor Actions
    const updateDirectory = (index: number, field: keyof SubDirMap, value: string) => {
        const newDirs = [...editingProfile.directories];
        newDirs[index] = { ...newDirs[index], [field]: value };
        // If changing internal path and others matches, update others too (convenience)
        if (field === 'internal' && editingProfile.directories[index].internal === editingProfile.directories[index].others) {
            newDirs[index].others = value;
        }
        updateProfile(currentId, { directories: newDirs });
    };

    const addDirectory = () => {
        const newDirs = [...editingProfile.directories, { internal: 'New/Path', others: 'New/Path' }];
        updateProfile(currentId, { directories: newDirs });
    };

    const removeDirectory = (index: number) => {
        const newDirs = editingProfile.directories.filter((_, i) => i !== index);
        updateProfile(currentId, { directories: newDirs });
    };

    const renderEnvironmentInputs = (env: 'local' | 'svn') => {
        const envData = editingProfile.environments[env];
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {Object.entries(envData).map(([key, value]) => (
                    <div key={key} style={{ borderBottom: '1px solid rgba(48, 54, 61, 0.5)', paddingBottom: '24px' }}>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ ...labelStyle, marginBottom: 0 }}>
                                    <Folder size={14} color="var(--accent-color)" />
                                    {key === 'internal' ? '內版環境 (INTERNAL)' : `${key.toUpperCase()} 環境`}
                                </label>
                                {key !== 'internal' && (
                                    <button
                                        className="btn btn-danger btn-icon btn-sm"
                                        onClick={() => {
                                            if (confirm(`確定要刪除環境 ${key} 嗎？這將同時移除 SVN 與 Local 的設定。`)) {
                                                const newSvn = { ...editingProfile.environments.svn };
                                                const newLocal = { ...editingProfile.environments.local };
                                                delete newSvn[key];
                                                delete newLocal[key];
                                                updateProfile(currentId, {
                                                    environments: { svn: newSvn, local: newLocal }
                                                });
                                            }
                                        }}
                                        title="刪除此環境"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 2 }}>
                                    <label style={labelStyle}>
                                        根目錄 / 位址
                                    </label>
                                    <input
                                        style={inputStyle}
                                        value={value.root || ''}
                                        onChange={(e) => updateEnvironment(currentId, env, key, 'root', e.target.value)}
                                        placeholder={env === 'svn' ? '請輸入 SVN URL' : '請輸入本機檔案路徑'}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>
                                        顯示名稱 (用於提交訊息)
                                    </label>
                                    <input
                                        style={inputStyle}
                                        value={value.name || ''}
                                        onChange={(e) => updateEnvironment(currentId, env, key, 'name', e.target.value)}
                                        placeholder={`例如: MobileAnime 或 Release`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginLeft: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isEditingRules ? <CheckCircle size={14} color="var(--warning-color)" /> : <CheckCircle size={14} color="var(--success-color)" />}
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {isEditingRules ? '正在編輯目錄映射規則 (Directory Mappings)' : '對應路徑預覽 (下圖僅為名稱示例):'}
                                    </span>
                                </div>
                                <button
                                    className={`btn btn-sm ${isEditingRules ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setIsEditingRules(!isEditingRules)}
                                >
                                    {isEditingRules ? '完成編輯' : '編輯映射規則'}
                                </button>
                            </div>

                            {editingProfile.directories.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '4px' }}>
                                    尚未設定任何目錄映射
                                    {isEditingRules && (
                                        <div style={{ marginTop: '8px' }}>
                                            <button onClick={addDirectory} className="btn btn-primary btn-sm">
                                                <Plus size={14} /> 新增規則
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: isEditingRules ? '1fr' : 'repeat(auto-fill, minmax(450px, 1fr))', gap: '8px' }}>
                                {editingProfile.directories.map((map: SubDirMap, idx: number) => {
                                    if (isEditingRules) {
                                        return (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#1c2128', borderRadius: '4px' }}>
                                                <input
                                                    style={{ ...inputStyle, width: '45%' }}
                                                    value={map.internal}
                                                    onChange={(e) => updateDirectory(idx, 'internal', e.target.value)}
                                                    placeholder="內版路徑 (Internal)"
                                                />
                                                <MoveRight size={16} color="var(--text-secondary)" />
                                                <input
                                                    style={{ ...inputStyle, width: '45%' }}
                                                    value={map.others}
                                                    onChange={(e) => updateDirectory(idx, 'others', e.target.value)}
                                                    placeholder="其他環境路徑 (Target)"
                                                />
                                                <button onClick={() => removeDirectory(idx)} className="btn btn-danger btn-icon btn-sm">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    }

                                    const subPath = key === 'internal' ? map.internal : map.others;
                                    const isInternal = key === 'internal';
                                    return (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 12px',
                                            backgroundColor: '#1c2128',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            {map.internal.includes('Client') ? <Smartphone size={12} /> : <ServerIcon size={12} />}
                                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {normalizePath(value.root, subPath)}
                                            </div>
                                            {isInternal && map.internal !== map.others && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-color)', opacity: 0.8 }}>
                                                    <MoveRight size={12} />
                                                    <span>會 Merge 至 /{(map.others as string).split('/').pop()} 環境</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {isEditingRules && (
                                    <button onClick={addDirectory} className="btn btn-secondary btn-sm" style={{ borderStyle: 'dashed' }}>
                                        <Plus size={14} /> 新增映射規則
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', overflowY: 'auto', height: '100%' }}>

            {/* Header Area */}
            <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>詳細設定 (Detailed Settings)</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        目前的設定檔: <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{editingProfile.name}</span>
                        {currentId !== activeProfileId && (
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--warning-color)', backgroundColor: 'rgba(255,255,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                (未啟用)
                            </span>
                        )}
                    </p>
                </div>

                {/* Profile Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Activate/Save Button */}
                    {currentId !== activeProfileId && (
                        <button
                            onClick={() => switchProfile(currentId)}
                            className="btn btn-primary"
                            title="將此設定檔套用到工作區"
                        >
                            <Save size={16} /> 儲存設定
                        </button>
                    )}

                    {!isCreating ? (
                        <>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={currentId}
                                    onChange={(e) => setEditingProfileId(e.target.value)}
                                    style={{
                                        padding: '10px 16px',
                                        paddingRight: '36px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--sidebar-bg)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                        appearance: 'none',
                                        cursor: 'pointer',
                                        minWidth: '200px'
                                    }}
                                >
                                    {Object.values(profiles).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <Layers size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                            </div>

                            <button
                                onClick={() => setIsCreating(true)}
                                className="btn btn-secondary btn-icon" // Use secondary for creating new profile initial action
                                title="建立新設定檔"
                            >
                                <Plus size={18} />
                            </button>

                            {['default', 'japan', 'china'].includes(currentId) ? (
                                <button
                                    onClick={() => {
                                        if (confirm(`確定要重置「${editingProfile.name}」的路徑設定嗎？`)) {
                                            resetProfile(currentId);
                                        }
                                    }}
                                    className="btn btn-ghost btn-icon"
                                    title="重置為預設值"
                                >
                                    <RefreshCw size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (confirm(`確定要刪除「${editingProfile.name}」設定檔嗎？`)) {
                                            deleteProfile(currentId);
                                            // Reset editing id to fallback
                                            if (currentId === editingProfileId) {
                                                // Handled by component re-render fallback
                                                setEditingProfileId('default');
                                            }
                                        }
                                    }}
                                    className="btn btn-danger btn-icon"
                                    title="刪除設定檔"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                autoFocus
                                value={newProfileName}
                                onChange={e => setNewProfileName(e.target.value)}
                                placeholder="輸入新設定檔名稱..."
                                style={{ ...inputStyle, width: '200px' }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newProfileName) {
                                        createProfile(newProfileName, currentId);
                                        setIsCreating(false);
                                        setNewProfileName('');
                                    } else if (e.key === 'Escape') {
                                        setIsCreating(false);
                                        setNewProfileName('');
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    if (newProfileName) {
                                        createProfile(newProfileName, currentId);
                                        setIsCreating(false);
                                        setNewProfileName('');
                                    }
                                }}
                                className="btn btn-primary btn-sm"
                            >
                                建立
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewProfileName('');
                                }}
                                className="btn btn-ghost btn-sm"
                            >
                                取消
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Config Tabs */}
            <div style={{ marginBottom: '24px', display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)' }}>
                <button
                    onClick={() => setActiveEnvTab('local')}
                    style={{
                        padding: '12px 24px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: activeEnvTab === 'local' ? 'var(--accent-color)' : 'var(--text-secondary)',
                        borderBottom: activeEnvTab === 'local' ? '2px solid var(--accent-color)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    本地端路徑 (Local Paths)
                </button>
                <button
                    onClick={() => setActiveEnvTab('svn')}
                    style={{
                        padding: '12px 24px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: activeEnvTab === 'svn' ? 'var(--accent-color)' : 'var(--text-secondary)',
                        borderBottom: activeEnvTab === 'svn' ? '2px solid var(--accent-color)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    SVN 位址 (Repositories)
                </button>
            </div>

            {/* Environment Manager */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                {!isAddingEnv ? (
                    <button
                        onClick={() => {
                            setIsAddingEnv(true);
                            setNewEnvName('');
                        }}
                        className="btn btn-secondary btn-sm"
                    >
                        <Plus size={14} /> 新增合版環境
                    </button>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            autoFocus
                            value={newEnvName}
                            onChange={(e) => setNewEnvName(e.target.value)}
                            placeholder="輸入代號 (如: uat)..."
                            style={{
                                ...inputStyle,
                                width: '180px',
                                padding: '6px 10px',
                                fontSize: '13px'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const key = newEnvName.trim();
                                    if (key && /^[a-zA-Z0-9_]+$/.test(key)) {
                                        const newEnvKey = key.toLowerCase();
                                        if (editingProfile.environments[activeEnvTab][newEnvKey]) {
                                            alert('該環境已存在');
                                            return;
                                        }
                                        const newSvn = { ...editingProfile.environments.svn, [newEnvKey]: { root: '', name: key.toUpperCase() } };
                                        const newLocal = { ...editingProfile.environments.local, [newEnvKey]: { root: '' } };

                                        updateProfile(currentId, {
                                            environments: {
                                                svn: newSvn,
                                                local: newLocal
                                            }
                                        });
                                        setIsAddingEnv(false);
                                        setNewEnvName('');
                                    } else {
                                        alert('請輸入有效的環境代號 (僅限英數字與底線)');
                                    }
                                } else if (e.key === 'Escape') {
                                    setIsAddingEnv(false);
                                    setNewEnvName('');
                                }
                            }}
                        />
                        <button
                            onClick={() => {
                                const key = newEnvName.trim();
                                if (key && /^[a-zA-Z0-9_]+$/.test(key)) {
                                    const newEnvKey = key.toLowerCase();
                                    if (editingProfile.environments[activeEnvTab][newEnvKey]) {
                                        alert('該環境已存在');
                                        return;
                                    }
                                    const newSvn = { ...editingProfile.environments.svn, [newEnvKey]: { root: '', name: key.toUpperCase() } };
                                    const newLocal = { ...editingProfile.environments.local, [newEnvKey]: { root: '' } };

                                    updateProfile(currentId, {
                                        environments: {
                                            svn: newSvn,
                                            local: newLocal
                                        }
                                    });
                                    setIsAddingEnv(false);
                                    setNewEnvName('');
                                } else {
                                    alert('請輸入有效的環境代號 (僅限英數字與底線)');
                                }
                            }}
                            className="btn btn-primary btn-sm"
                        >
                            確認
                        </button>
                        <button
                            onClick={() => {
                                setIsAddingEnv(false);
                                setNewEnvName('');
                            }}
                            className="btn btn-ghost btn-sm"
                        >
                            取消
                        </button>
                    </div>
                )}
            </div>

            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', padding: '12px', backgroundColor: 'rgba(88, 166, 255, 0.1)', borderRadius: '6px', border: '1px solid rgba(88, 166, 255, 0.2)' }}>
                    <Layers size={18} color="var(--accent-color)" />
                    <span style={{ fontSize: '13px', color: 'var(--accent-color)' }}>
                        {editingProfile.description}
                    </span>
                </div>
                {renderEnvironmentInputs(activeEnvTab)}
            </div>
            {/* Merge Flow Editor */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', padding: '12px', backgroundColor: 'rgba(238, 130, 238, 0.1)', borderRadius: '6px', border: '1px solid rgba(238, 130, 238, 0.2)' }}>
                    <GitMerge size={18} color="violet" />
                    <span style={{ fontSize: '13px', color: 'violet', fontWeight: 600 }}>
                        合併流程與順序 (Merge Flow)
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {editingProfile.steps.map((step, index) => {
                        return (
                            <div key={step.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px',
                                backgroundColor: '#1c2128',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm"
                                        disabled={index === 0}
                                        onClick={() => {
                                            const newSteps = [...editingProfile.steps];
                                            [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
                                            updateProfile(currentId, { steps: newSteps });
                                        }}
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm"
                                        disabled={index === editingProfile.steps.length - 1}
                                        onClick={() => {
                                            const newSteps = [...editingProfile.steps];
                                            [newSteps[index + 1], newSteps[index]] = [newSteps[index], newSteps[index + 1]];
                                            updateProfile(currentId, { steps: newSteps });
                                        }}
                                    >
                                        <ArrowDown size={16} />
                                    </button>
                                </div>

                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px', display: 'block' }}>來源 (Source)</label>
                                        <select
                                            style={inputStyle}
                                            value={step.source}
                                            onChange={(e) => {
                                                const newSteps = [...editingProfile.steps];
                                                newSteps[index].source = e.target.value;
                                                // Auto update name
                                                const sourceName = editingProfile.environments.svn[e.target.value]?.name || e.target.value;
                                                const targetName = editingProfile.environments.svn[newSteps[index].target]?.name || newSteps[index].target;
                                                newSteps[index].name = `${sourceName} >>> ${targetName}`;
                                                updateProfile(currentId, { steps: newSteps });
                                            }}
                                        >
                                            {/* Allow internal as source */}
                                            {Object.keys(editingProfile.environments.svn).map(envKey => (
                                                <option key={envKey} value={envKey}>{editingProfile.environments.svn[envKey].name} ({envKey})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <MoveRight size={20} color="var(--text-secondary)" style={{ marginTop: '16px' }} />

                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px', display: 'block' }}>目標 (Target)</label>
                                        <select
                                            style={inputStyle}
                                            value={step.target}
                                            onChange={(e) => {
                                                const newSteps = [...editingProfile.steps];
                                                newSteps[index].target = e.target.value;
                                                // Auto update name
                                                const sourceName = editingProfile.environments.svn[newSteps[index].source]?.name || newSteps[index].source;
                                                const targetName = editingProfile.environments.svn[e.target.value]?.name || e.target.value;
                                                newSteps[index].name = `${sourceName} >>> ${targetName}`;
                                                updateProfile(currentId, { steps: newSteps });
                                            }}
                                        >
                                            {Object.keys(editingProfile.environments.svn).map(envKey => (
                                                <option key={envKey} value={envKey}>{editingProfile.environments.svn[envKey].name} ({envKey})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <label style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px', opacity: 0 }}>Options</label>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                height: '42px', // Align with inputs
                                                padding: '0 8px',
                                                backgroundColor: step.isHotfix ? 'rgba(210, 153, 34, 0.1)' : 'transparent',
                                                border: step.isHotfix ? '1px solid var(--warning-color)' : '1px solid transparent',
                                                borderRadius: '6px'
                                            }}
                                            title="標記為熱修流程 (Hotfix)"
                                        >
                                            <input
                                                type="checkbox"
                                                id={`hotfix-check-${step.id}`}
                                                checked={!!step.isHotfix}
                                                onChange={(e) => {
                                                    const newSteps = [...editingProfile.steps];
                                                    newSteps[index].isHotfix = e.target.checked;
                                                    updateProfile(currentId, { steps: newSteps });
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <label
                                                htmlFor={`hotfix-check-${step.id}`}
                                                style={{
                                                    fontSize: '13px',
                                                    color: step.isHotfix ? 'var(--warning-color)' : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    fontWeight: step.isHotfix ? 600 : 400
                                                }}
                                            >
                                                Hotfix
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-danger btn-icon btn-sm"
                                    onClick={() => {
                                        if (confirm('確定要移除這個合併步驟嗎？')) {
                                            const newSteps = editingProfile.steps.filter(s => s.id !== step.id);
                                            updateProfile(currentId, { steps: newSteps });
                                        }
                                    }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        );
                    })}

                    <button
                        className="btn btn-secondary"
                        style={{ borderStyle: 'dashed', width: '100%' }}
                        onClick={() => {
                            const newId = (Math.max(...editingProfile.steps.map(s => parseInt(s.id) || 0), 0) + 1).toString();
                            const newStep = {
                                id: newId,
                                name: 'New Step',
                                source: 'internal',
                                target: 'release',
                                type: 'manual' as const
                            };
                            updateProfile(currentId, { steps: [...editingProfile.steps, newStep] });
                        }}
                    >
                        <Plus size={16} /> 新增合併步驟
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PathSettings;
