import React, { useState, useEffect, useRef } from 'react';
import { GitMerge, Play, CheckCircle, AlertTriangle, Clock, ChevronRight, Terminal, Smartphone, Server as ServerIcon, LayoutGrid, Trash2, Search, X } from 'lucide-react';
import { svnService } from '../services/svnService';

import type { PathConfig } from '../types/config';
import { useProfiles } from '../hooks/useProfiles';

interface MergeStep {
    id: string;
    name: string;
    source: string;
    target: string;
    type: 'manual' | 'auto';
    status: 'pending' | 'running' | 'completed' | 'failed';
    isHotfix?: boolean;
}

const MergeWorkspace: React.FC = () => {
    const { activeProfile, profiles, switchProfile } = useProfiles();
    const SUB_DIRECTORIES = activeProfile.directories;

    const [subRevisions, setSubRevisions] = useState<Record<number, string>>({});
    const [includeHotfix, setIncludeHotfix] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    const [steps, setSteps] = useState<MergeStep[]>([]);

    // 當 Profile 改變時，重置步驟與目錄
    useEffect(() => {
        setSteps(activeProfile.steps.map(s => ({
            ...s,
            status: 'pending'
        })));

        const initial: Record<number, string> = {};
        activeProfile.directories.forEach((_, idx) => {
            initial[idx] = '';
        });
        setSubRevisions(initial);
        setLogs([]); // 清空日誌 (可選)
    }, [activeProfile]);

    const [perSubDirLastMessages, setPerSubDirLastMessages] = useState<Record<number, string>>({});
    const [chainedRevisions, setChainedRevisions] = useState<Record<number, string>>({});

    // 對話窗狀態
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        resolve: (val: boolean) => void;
        message: string;
        status: string;
        targetName: string;
    } | null>(null);

    interface LogEntry {
        revision: string;
        author: string;
        date: string;
        msg: string;
        changedFiles?: { action: string; path: string }[];
    }

    const [pickerState, setPickerState] = useState<{
        isOpen: boolean;
        idx: number;
        logs: LogEntry[];
        isLoading: boolean;
        sourceName: string;
        selectedRevs: string[];
        mergedRevs: Set<string>;
        expandedRev: string | null;
    } | null>(null);

    const [conflictState, setConflictState] = useState<{
        isOpen: boolean;
        files: string[];
        targetPath: string;
        resolve: (val: boolean) => void;
    } | null>(null);

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };



    // 自動捲動日誌到最下方
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);



    const clearAllRevisions = () => {
        const updated: Record<number, string> = {};
        SUB_DIRECTORIES.forEach((_, idx) => {
            updated[idx] = '';
        });
        setSubRevisions(updated);
        setChainedRevisions({});
        addLog(`已清空所有子目錄版號`);
    };

    const requestConfirm = (message: string, status: string, targetName: string) => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({ isOpen: true, resolve, message, status, targetName });
        });
    };

    const resolveConflicts = (files: string[], targetPath: string) => {
        return new Promise<boolean>((resolve) => {
            setConflictState({ isOpen: true, files, targetPath, resolve });
        });
    };

    const openLogPicker = async (idx: number, sourceEnvRoot: string, sourceName: string) => {
        const map = SUB_DIRECTORIES[idx];
        const sourceSub = map.internal;
        const targetSub = map.others;

        const isUrl = /^(svn|http|https|file):\/\//i.test(sourceEnvRoot);
        const r = sourceEnvRoot.replace(/[/\\]$/, '');
        const s = sourceSub.replace(/^[/\\]/, '');
        const fullSourcePath = isUrl ? `${r}/${s.replace(/\\/g, '/')}` : `${r}/${s.replace(/\//g, '\\')}`;

        // 獲取目標路徑以便查詢 mergeinfo
        const savedConfig = localStorage.getItem('svn_merge_config');
        let fullTargetPath = '';
        if (savedConfig) {
            const config: PathConfig = JSON.parse(savedConfig);
            const firstStep = steps[0];
            const targetEnv = config.local[firstStep.target as keyof PathConfig['local']];
            if (targetEnv?.root) {
                const tr = targetEnv.root.replace(/[/\\]$/, '');
                const ts = targetSub.replace(/^[/\\]/, '');
                fullTargetPath = `${tr}\\${ts.replace(/\//g, '\\')}`;
            }
        }

        setPickerState({
            isOpen: true,
            idx,
            logs: [],
            isLoading: true,
            sourceName,
            selectedRevs: [],
            mergedRevs: new Set(),
            expandedRev: null
        });

        const [logRes, mergeRes] = await Promise.all([
            svnService.getLogsList(fullSourcePath, 50),
            fullTargetPath ? svnService.getMergeInfo(fullSourcePath, fullTargetPath) : Promise.resolve({ success: false, revisions: [] })
        ]);

        if (logRes.success) {
            setPickerState(prev => prev ? {
                ...prev,
                logs: logRes.logs,
                isLoading: false,
                mergedRevs: new Set(mergeRes.success ? mergeRes.revisions : [])
            } : null);
        } else {
            let errorMsg = logRes.error || '原因未知';
            if (errorMsg.includes('E155007')) {
                errorMsg = `路徑未設置為 SVN 工作複本 (Working Copy)。\n請確認該資料夾下存有 .svn 隱藏目錄，或嘗試使用 SVN URL (http(s)://...)。`;
            }
            alert(`載入 Log 失敗:\n\n${errorMsg}`);
            setPickerState(null);
        }
    };

    const startMerge = React.useCallback(async (stepId: string) => {
        const step = steps.find(s => s.id === stepId);
        if (!step) return;

        // 檢查是否有至少一個子目錄填寫了版號
        const hasAnyRevision = Object.values(subRevisions).some(v => v.trim() !== '');
        if (!hasAnyRevision) {
            alert('請至少為一個子目錄填寫 SVN 版號');
            return;
        }

        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'running' } : s));
        addLog(`>>> [開始任務] ${step.name}`);

        const config = activeProfile;
        const sourceEnv = config.environments.svn[step.source];
        const targetEnv = config.environments.local[step.target];

        if (!sourceEnv?.root || !targetEnv?.root) {
            addLog(`❌ 錯誤: 環境路徑未設定。Source: ${step.source}, Target: ${step.target}`);
            setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'failed' } : s));
            return;
        }

        try {
            const normalizePath = (root: string, sub: string = '', isSource: boolean = true) => {
                const isUrl = /^(svn|http|https|file):\/\//i.test(root);
                const r = root.replace(/[/\\]$/, '');
                const s = sub ? sub.replace(/^[/\\]/, '') : '';

                if (isUrl) {
                    return s ? `${r}/${s.replace(/\\/g, '/')}` : r;
                } else if (isSource) {
                    const cleanRoot = r.replace(/\\/g, '/');
                    return s ? `${cleanRoot}/${s.replace(/\\/g, '/')}` : cleanRoot;
                } else {
                    const cleanRoot = r.replace(/^file:\/\/\//i, '');
                    return s ? `${cleanRoot}\\${s.replace(/\//g, '\\')}` : cleanRoot;
                }
            };

            // --- 步驟 1: 預處理 (Revert & Update) ---
            addLog(`⚙️ 正在初始化環境: 還原變更 (Revert)...`);
            const revertRes = await svnService.revert(targetEnv.root);
            if (!revertRes.success) {
                addLog(`⚠️ Revert 警告: ${revertRes.error}`);
            }

            addLog(`⚙️ 正在同步最新版本 (Update)...`);
            const updateRes = await svnService.update(targetEnv.root);
            if (!updateRes.success) {
                addLog(`❌ Update 失敗: ${updateRes.error}`);
                setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'failed' } : s));
                return;
            }

            // --- 步驟 2: 合併與提交循環 (Merge & Commit per Directory) ---
            const tempNewRevs: Record<number, string> = {};
            const tempNewMsgs: Record<number, string> = {};
            const logCache: Record<string, string> = {};
            let allSuccess = true;

            const sourceName = sourceEnv.name || (step.source === 'internal' ? 'MobileAnime' : step.source);
            const sourceRootUrl = normalizePath(sourceEnv.root, '', true);

            // 初始執行版號來自 UI
            const currentWorkingRevisions = step.type === 'manual' ? { ...subRevisions } : { ...chainedRevisions };

            for (let idx = 0; idx < SUB_DIRECTORIES.length; idx++) {
                const map = SUB_DIRECTORIES[idx];
                const rev = currentWorkingRevisions[idx]?.trim();

                if (!rev) {
                    continue; // 沒填版號就跳過
                }

                const sourceSub = step.source === 'internal' ? map.internal : map.others;
                const targetSub = map.others;

                const sourceFullPath = normalizePath(sourceEnv.root, sourceSub, true);
                const targetFullPath = normalizePath(targetEnv.root, targetSub, false);

                addLog(`🔀 [${targetSub}] 正在合併版號 ${rev}...`);

                const mergeRes = await svnService.performMerge({
                    sourcePath: sourceFullPath,
                    targetPath: targetFullPath,
                    revision: rev
                });

                if (mergeRes.conflicts && mergeRes.conflicts.length > 0) {
                    addLog(`⚠️ [${targetSub}] 偵測到衝突: ${mergeRes.conflicts.join(', ')}`);

                    const resolved = await resolveConflicts(mergeRes.conflicts, targetFullPath);
                    if (!resolved) {
                        addLog(`⛔ [${targetSub}] 使用者取消衝突處理，流程中斷。`);
                        allSuccess = false;
                        break;
                    }
                    addLog(`✅ [${targetSub}] 衝突已處理完畢。`);
                } else if (!mergeRes.success) {
                    addLog(`❌ [${targetSub}] 合併失敗: ${mergeRes.error}`);
                    allSuccess = false;
                    break;
                }
                addLog(`✅ [${targetSub}] 合併完成。`);

                // --- 步驟 3: 為該子目錄產生提交訊息並確認 ---
                let subMsg = '';
                if (step.id === '1') {
                    // 第一階段：抓取該版號的原始日誌
                    if (!logCache[rev]) {
                        const msgRes = await svnService.getLastMessage(sourceRootUrl, rev);
                        logCache[rev] = msgRes.success ? msgRes.message : `(無法擷取版號 ${rev} 的日誌)`;
                    }
                    subMsg = `Merged revision(s) ${rev} from ${sourceName}:\n${logCache[rev]}`;
                } else {
                    // 後續階段：疊加該目錄上一階的訊息
                    const prevMsg = perSubDirLastMessages[idx] || '';
                    subMsg = `Merged revision(s) ${rev} from ${sourceName}:\n${prevMsg}`;
                }

                // --- 提交前確認 (Commit Confirmation) ---
                addLog(`🔍 [${targetSub}] 正在擷取異動狀態...`);
                const statusRes = await svnService.getStatus(targetFullPath);
                if (!statusRes.success) {
                    addLog(`❌ [${targetSub}] 擷取狀態失敗: ${statusRes.error}`);
                    allSuccess = false;
                    break;
                }

                const userConfirmed = await requestConfirm(subMsg, statusRes.output, targetSub);
                if (!userConfirmed) {
                    addLog(`⛔ [${targetSub}] 使用者取消提交，整體流程已中斷。`);
                    allSuccess = false;
                    break;
                }

                addLog(`🚀 [${targetSub}] 正在提交變更...`);
                const commitRes = await svnService.commit(targetFullPath, subMsg);

                if (commitRes.success) {
                    const revMatch = commitRes.output.match(/Committed revision (\d+)\./);
                    const newRev = revMatch ? revMatch[1] : null;
                    if (newRev) {
                        tempNewRevs[idx] = newRev;
                        tempNewMsgs[idx] = subMsg;
                        addLog(`🎉 [${targetSub}] 提交成功，新版號: ${newRev}`);
                    }
                } else {
                    addLog(`❌ [${targetSub}] 提交失敗: ${commitRes.error}`);
                    allSuccess = false;
                    break;
                }
            }

            if (allSuccess) {
                // --- 步驟 4: 版號與訊息繼承 (更新後端鏈結狀態，不更新 UI) ---
                setChainedRevisions(prev => ({ ...prev, ...tempNewRevs }));
                setPerSubDirLastMessages(prev => ({ ...prev, ...tempNewMsgs }));

                // 如果是流程結束，則清空所有狀態
                const activeSteps = steps.filter(s => !s.isHotfix || includeHotfix);
                const isLastStep = stepId === activeSteps[activeSteps.length - 1].id;

                if (isLastStep) {
                    addLog(`🏁 流程結束，自動清空版號欄位。`);
                    setSubRevisions(prev => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach(k => updated[Number(k)] = '');
                        return updated;
                    });
                    setChainedRevisions({});
                }

                setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'completed' } : s));
                addLog(`✨ 步驟完成: ${step.name}`);

                setTimeout(() => {
                    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'pending' } : s));
                }, 500);
            } else {
                setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'failed' } : s));
            }

        } catch (error) {
            addLog(`☢️ 異常錯誤: ${error instanceof Error ? error.message : String(error)}`);
            setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'failed' } : s));
        }
    }, [steps, subRevisions, chainedRevisions, activeProfile, SUB_DIRECTORIES, perSubDirLastMessages]);

    // 自動鏈結觸發器
    useEffect(() => {
        const runningStep = steps.find(s => s.status === 'running');
        if (runningStep) return;

        const nextAutoStepIndex = steps.findIndex((step, index) => {
            if (step.status !== 'pending' || step.type !== 'auto') return false;
            if (step.isHotfix && !includeHotfix) return false;

            const previousStep = steps.slice(0, index).reverse().find(s => !s.isHotfix || includeHotfix);
            return previousStep?.status === 'completed';
        });

        if (nextAutoStepIndex !== -1) {
            const nextStep = steps[nextAutoStepIndex];
            addLog(`>>> [自動觸發] 開始執行: ${nextStep.name}`);
            startMerge(nextStep.id);
        }
    }, [steps, includeHotfix, startMerge]);

    const getStatusIcon = (status: MergeStep['status']) => {
        switch (status) {
            case 'completed': return <CheckCircle size={18} color="var(--success-color)" />;
            case 'running': return <Clock size={18} color="var(--accent-color)" className="spin" />;
            case 'failed': return <AlertTriangle size={18} color="var(--error-color)" />;
            default: return <Play size={18} color="var(--text-secondary)" />;
        }
    };

    const visibleSteps = steps.filter(step => !step.isHotfix || includeHotfix);

    return (
        <>
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                {/* 左側：控制與流程 */}
                <div style={{ flex: 1, padding: '20px 40px', overflowY: 'auto', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>合併工作區 ({activeProfile.name})</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <select
                                    value={activeProfile.id}
                                    onChange={(e) => switchProfile(e.target.value)}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '12px',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {Object.values(profiles).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div
                            onClick={() => setIncludeHotfix(!includeHotfix)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '8px 16px',
                                backgroundColor: includeHotfix ? 'rgba(210, 153, 34, 0.1)' : 'var(--sidebar-bg)',
                                border: `1px solid ${includeHotfix ? 'var(--warning-color)' : 'var(--border-color)'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                userSelect: 'none'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = includeHotfix ? 'rgba(210, 153, 34, 0.15)' : 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = includeHotfix ? 'rgba(210, 153, 34, 0.1)' : 'var(--sidebar-bg)'}
                        >
                            <input
                                type="checkbox"
                                id="hotfix-toggle"
                                checked={includeHotfix}
                                onChange={() => { }} // Handled by div click
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--warning-color)' }}
                            />
                            <label htmlFor="hotfix-toggle" style={{ fontSize: '14px', fontWeight: 600, color: includeHotfix ? 'var(--warning-color)' : 'var(--text-primary)', cursor: 'pointer' }}>
                                包含熱修流程
                            </label>
                        </div>
                    </header>

                    {/* 版號控製區 */}
                    <section style={{ backgroundColor: 'var(--sidebar-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <LayoutGrid size={18} color="var(--accent-color)" />
                                <span style={{ fontWeight: 600, fontSize: '15px' }}>子目錄版號設定 ({SUB_DIRECTORIES.length} 個項目)</span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <button onClick={clearAllRevisions} className="btn btn-danger btn-sm">
                                    <Trash2 size={14} /> 清空欄位
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: '8px',
                                width: '100%'
                            }}>
                                {SUB_DIRECTORIES.map((map, idx) => (
                                    <div key={idx} style={{
                                        padding: '12px',
                                        backgroundColor: '#0d1117',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        height: 'auto',
                                        minHeight: '110px', // 再次提升高度
                                        transition: 'all 0.2s',
                                        wordBreak: 'break-all'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 600 }}>
                                            {map.internal.includes('Client') ? <Smartphone size={12} color="#58a6ff" /> : <ServerIcon size={12} color="#3fb950" />}
                                            <span style={{
                                                flex: 1,
                                                color: '#e6edf3',
                                                lineHeight: '1.4',
                                                fontSize: '11px'
                                            }}>
                                                {map.others.split('/').pop()}
                                            </span>
                                        </div>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <input
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    paddingRight: '40px',
                                                    backgroundColor: '#0d1117',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    transition: 'all 0.2s',
                                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
                                                }}
                                                placeholder="請輸入或選取版號"
                                                value={subRevisions[idx] || ''}
                                                onChange={(e) => setSubRevisions(prev => ({ ...prev, [idx]: e.target.value }))}
                                            />
                                            <button
                                                onClick={() => {
                                                    // const savedConfig = localStorage.getItem('svn_merge_config'); // Removed
                                                    const config = activeProfile;
                                                    const firstStep = steps[0];

                                                    // Source path logic adjusted for profile structure
                                                    const sourceEnv = config.environments.svn[firstStep.source];

                                                    if (sourceEnv && sourceEnv.root) {
                                                        const sourceName = sourceEnv.name || (firstStep.source === 'internal' ? 'MobileAnime' : firstStep.source);
                                                        openLogPicker(idx, sourceEnv.root, sourceName);
                                                    } else {
                                                        alert(`請先在路徑配置中設定「${firstStep.source}」的 SVN 根路徑。`);
                                                    }
                                                }}
                                                title="瀏覽歷史紀錄"
                                                className="btn btn-ghost btn-icon"
                                            >
                                                <Search size={16} />
                                            </button>
                                        </div>
                                        <div style={{
                                            fontSize: '10px',
                                            color: 'var(--text-secondary)',
                                            opacity: 0.4,
                                            lineHeight: '1.4',
                                            marginTop: 'auto' // 推到底部
                                        }}>
                                            {map.others}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 流程鏈 */}
                    <section>
                        <h3 style={{ fontSize: '15px', marginBottom: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>合併流程鏈 (Workflow Status)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {visibleSteps.map((step, index) => (
                                <div key={step.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '16px 24px',
                                    backgroundColor: step.status === 'running' ? 'rgba(88, 166, 255, 0.05)' : 'var(--sidebar-bg)',
                                    borderRadius: '12px',
                                    border: step.status === 'running' ? '2px solid var(--accent-color)' : step.status === 'completed' ? '1px solid var(--success-color)' : '1px solid var(--border-color)',
                                    opacity: step.status === 'pending' && index > 0 ? 0.7 : 1,
                                    transition: 'all 0.3s'
                                }}>
                                    <div style={{ marginRight: '24px' }}>
                                        {getStatusIcon(step.status)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '15px' }}>{step.name}</span>
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                borderRadius: '10px',
                                                backgroundColor: step.type === 'manual' ? 'rgba(88, 166, 255, 0.1)' : 'rgba(63, 185, 80, 0.1)',
                                                color: step.type === 'manual' ? 'var(--accent-color)' : 'var(--success-color)',
                                                border: `1px solid ${step.type === 'manual' ? 'var(--accent-color)' : 'var(--success-color)'}`
                                            }}>
                                                {step.type === 'manual' ? '手動' : '自動'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                            <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>{step.source}</span>
                                            <ChevronRight size={12} />
                                            <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>{step.target}</span>
                                        </div>
                                    </div>
                                    {index === 0 && (
                                        <button
                                            onClick={() => startMerge(step.id)}
                                            disabled={step.status === 'running'}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '10px 24px',
                                                fontWeight: 700,
                                                opacity: step.status === 'running' ? 0.6 : 1
                                            }}
                                        >
                                            <GitMerge size={18} />
                                            開始合檔
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section >
                </div >

                {/* 右側：日誌終端機 */}
                < div style={{ width: '480px', backgroundColor: '#010409', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)' }
                }>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--sidebar-bg)' }}>
                        <Terminal size={18} color="var(--accent-color)" />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>實時執行日誌 (Terminal)</span>
                    </div>
                    <div style={{ flex: 1, padding: '20px', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', overflowY: 'auto', color: '#e6edf3', lineHeight: '1.6', backgroundColor: '#010409' }}>
                        {logs.length === 0 && (
                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', opacity: 0.5 }}>等待合併任務啟動...</div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} style={{ marginBottom: '6px', wordBreak: 'break-all', color: log.includes('失敗') || log.includes('錯誤') ? '#f85149' : log.includes('成功') ? '#3fb950' : log.includes('>>>') ? '#58a6ff' : log.includes('正在合併') ? '#d29922' : '#e6edf3', borderLeft: log.includes('>>>') ? '4px solid #58a6ff' : 'none', paddingLeft: log.includes('>>>') ? '12px' : '0' }}>
                                {log}
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div >
            </div >

            {/* --- 提交確認對話窗 --- */}
            {
                confirmState?.isOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                        <div style={{ width: '600px', backgroundColor: 'var(--sidebar-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <AlertTriangle size={24} color="#d29922" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 600 }}>確認提交變更: {confirmState!.targetName}</h2>
                                </div>
                                <button onClick={() => { setConfirmState(null); confirmState!.resolve(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>提交訊息 (Commit Message)</div>
                                    <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap', fontSize: '13px', fontFamily: '"JetBrains Mono", monospace' }}>
                                        {confirmState!.message}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>異動檔案 (File Changes)</div>
                                    <div style={{ backgroundColor: '#010409', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px', fontFamily: '"JetBrains Mono", monospace', maxHeight: '200px', overflowY: 'auto', color: '#8b949e' }}>
                                        {confirmState!.status ? confirmState!.status.split('\n').map((line, i) => (
                                            <div key={i} style={{ color: line.startsWith('M') ? '#d29922' : line.startsWith('A') ? '#3fb950' : line.startsWith('D') ? '#f85149' : '#8b949e' }}>
                                                {line}
                                            </div>
                                        )) : '無異動項目或無法擷取狀態。'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <button
                                    onClick={() => { setConfirmState(null); confirmState!.resolve(false); }}
                                    className="btn btn-ghost"
                                >
                                    取消流程
                                </button>
                                <button
                                    onClick={() => { setConfirmState(null); confirmState!.resolve(true); }}
                                    className="btn btn-primary"
                                >
                                    確認提交
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- Log 選取對話窗 --- */}
            {
                pickerState?.isOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                        <div style={{ width: '800px', height: '80vh', backgroundColor: 'var(--sidebar-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Clock size={24} color="var(--accent-color)" />
                                    <div>
                                        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>瀏覽 SVN 歷史紀錄</h2>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>來源環境: {pickerState!.sourceName}</div>
                                    </div>
                                </div>
                                <button onClick={() => setPickerState(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                                {pickerState!.isLoading ? (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>載入中...</div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--sidebar-bg)', zIndex: 1, borderBottom: '2px solid var(--border-color)' }}>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)' }}>版號</th>
                                                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)' }}>作者</th>
                                                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)' }}>日期</th>
                                                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)' }}>訊息</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pickerState!.logs.map((log) => {
                                                const isMerged = pickerState!.mergedRevs.has(log.revision);
                                                const isSelected = pickerState!.selectedRevs.includes(log.revision);
                                                const isExpanded = pickerState!.expandedRev === log.revision;

                                                return (
                                                    <React.Fragment key={log.revision}>
                                                        <tr
                                                            onClick={() => {
                                                                setPickerState(prev => {
                                                                    if (!prev) return null;
                                                                    const alreadySelected = prev.selectedRevs.includes(log.revision);
                                                                    const nextSelected = alreadySelected
                                                                        ? prev.selectedRevs.filter(r => r !== log.revision)
                                                                        : [...prev.selectedRevs, log.revision].sort((a, b) => Number(a) - Number(b));
                                                                    return { ...prev, selectedRevs: nextSelected };
                                                                });
                                                            }}
                                                            style={{
                                                                borderBottom: '1px solid var(--border-color)',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.2s',
                                                                opacity: isMerged ? 0.4 : 1,
                                                                backgroundColor: isSelected ? 'rgba(88, 166, 255, 0.1)' : 'transparent'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? 'rgba(88, 166, 255, 0.15)' : 'rgba(255,255,255,0.05)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? 'rgba(88, 166, 255, 0.1)' : 'transparent'}
                                                        >
                                                            <td style={{ padding: '12px', width: '40px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    readOnly
                                                                    style={{ cursor: 'pointer' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '12px', color: 'var(--accent-color)', fontWeight: 600 }}>
                                                                r{log.revision}
                                                                {isMerged && <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>(已合併)</span>}
                                                            </td>
                                                            <td style={{ padding: '12px' }}>{log.author}</td>
                                                            <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '11px' }}>{new Date(log.date).toLocaleString()}</td>
                                                            <td style={{ padding: '12px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                                    <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.msg}</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setPickerState(prev => prev ? { ...prev, expandedRev: isExpanded ? null : log.revision } : null);
                                                                        }}
                                                                        className="btn btn-ghost btn-sm"
                                                                        style={{ color: 'var(--accent-color)' }}
                                                                    >
                                                                        {isExpanded ? '收合' : '查看檔案'}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan={5} style={{ padding: '0 12px 12px 40px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                                                    <div style={{
                                                                        padding: '12px',
                                                                        backgroundColor: '#0d1117',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid var(--border-color)',
                                                                        fontSize: '11px',
                                                                        fontFamily: '"JetBrains Mono", monospace'
                                                                    }}>
                                                                        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>異動路徑:</div>
                                                                        {log.changedFiles && log.changedFiles.length > 0 ? (
                                                                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                                                {log.changedFiles.map((f, fi) => (
                                                                                    <div key={fi} style={{ marginBottom: '2px', display: 'flex', gap: '8px' }}>
                                                                                        <span style={{
                                                                                            color: f.action === 'A' ? 'var(--success-color)' : f.action === 'D' ? 'var(--error-color)' : '#d29922',
                                                                                            width: '12px'
                                                                                        }}>{f.action}</span>
                                                                                        <span>{f.path}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>無路徑資訊</div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    已選取 <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{pickerState!.selectedRevs.length}</span> 個版本
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setPickerState(null)}
                                        className="btn btn-ghost"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (pickerState!.selectedRevs.length === 0) {
                                                alert('請至少選擇一個版本');
                                                return;
                                            }
                                            // 合併連續版本為範圍 (101, 102, 103 -> 101-103)
                                            const sorted = [...pickerState!.selectedRevs].map(Number).sort((a, b) => a - b);
                                            const ranges: string[] = [];
                                            if (sorted.length > 0) {
                                                let start = sorted[0];
                                                let end = start;
                                                for (let i = 1; i < sorted.length; i++) {
                                                    if (sorted[i] === end + 1) {
                                                        end = sorted[i];
                                                    } else {
                                                        ranges.push(start === end ? `${start}` : `${start}-${end}`);
                                                        start = sorted[i];
                                                        end = start;
                                                    }
                                                }
                                                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                                            }

                                            setSubRevisions(prev => ({ ...prev, [pickerState!.idx]: ranges.join(',') }));
                                            setPickerState(null);
                                        }}
                                        className="btn btn-primary"
                                    >
                                        確認選取
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* --- 衝突處理對話窗 --- */}
            {
                conflictState?.isOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
                        <div style={{ width: '700px', backgroundColor: 'var(--sidebar-bg)', borderRadius: '16px', border: '1px solid var(--error-color)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(248, 81, 73, 0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <AlertTriangle size={24} color="#f85149" />
                                    <div>
                                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f85149' }}>偵測到合併衝突 (Merge Conflicts)</h2>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>請為下列檔案選擇解決方案，解決所有衝突後方可繼續。</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                                {conflictState.files.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--success-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <CheckCircle size={48} />
                                        <div style={{ fontSize: '16px', fontWeight: 600 }}>所有衝突已解決！</div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {conflictState.files.map((file, idx) => (
                                            <div key={idx} style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#e6edf3', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: '#f85149' }}>[Conflict]</span>
                                                    {file}
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {[
                                                        { label: '延後處理 (Postpone)', val: 'postpone', desc: '標記為衝突，稍後手動處理' },
                                                        { label: '保留我的 (Mine-Full)', val: 'mine-full', desc: '完全使用本地版本' },
                                                        { label: '保留對方的 (Theirs-Full)', val: 'theirs-full', desc: '完全使用來源版本' },
                                                        { label: '使用 Working', val: 'working', desc: '使用當前工作副本 (手動修改後)' }
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.val}
                                                            title={opt.desc}
                                                            onClick={async () => {
                                                                const res = await svnService.resolve(conflictState.targetPath, file, opt.val);
                                                                if (res.success) {
                                                                    addLog(`🛠️ 已對 ${file} 執行 ${opt.val}`);
                                                                    setConflictState(prev => prev ? { ...prev, files: prev.files.filter(f => f !== file) } : null);
                                                                } else {
                                                                    alert(`解決衝突失敗: ${res.error}`);
                                                                }
                                                            }}
                                                            className="btn btn-secondary btn-sm"
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <button
                                    onClick={() => {
                                        if (confirm('確定要放棄目前的合併流程嗎？')) {
                                            setConflictState(null);
                                            conflictState.resolve(false);
                                        }
                                    }}
                                    className="btn btn-ghost"
                                >
                                    中斷流程
                                </button>
                                <button
                                    onClick={() => {
                                        setConflictState(null);
                                        conflictState.resolve(true);
                                    }}
                                    disabled={conflictState.files.length > 0}
                                    className="btn btn-primary"
                                    style={{
                                        backgroundColor: conflictState.files.length > 0 ? 'var(--sidebar-bg)' : 'var(--success-color)',
                                        opacity: conflictState.files.length > 0 ? 0.5 : 1
                                    }}
                                >
                                    {conflictState.files.length > 0 ? `剩餘 ${conflictState.files.length} 個衝突` : '完成並繼續'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default MergeWorkspace;
