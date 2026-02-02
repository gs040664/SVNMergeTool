import React, { useState } from 'react'
import './index.css'
import PathSettings from './components/PathSettings'
import MergeWorkspace from './components/MergeWorkspace'
import { Settings, GitMerge } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState<'diff' | 'settings'>('settings')

  const navItemStyle = (tab: 'diff' | 'settings'): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: '4px',
    backgroundColor: activeTab === tab ? 'var(--border-color)' : 'transparent',
    color: activeTab === tab ? 'var(--accent-color)' : 'var(--text-secondary)',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    border: 'none',
    outline: 'none'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-color)' }}>
      <header style={{
        height: 'var(--header-height)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        backgroundColor: 'var(--sidebar-bg)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <GitMerge size={20} color="var(--accent-color)" />
          <h1 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.5px' }}>SVN MERGE TOOL</h1>
        </div>

        <nav style={{ display: 'flex', gap: '8px' }}>
          <button
            style={navItemStyle('diff')}
            onClick={() => setActiveTab('diff')}
          >
            <GitMerge size={16} />
            版本合併
          </button>
          <button
            style={navItemStyle('settings')}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} />
            詳細設定
          </button>
        </nav>
      </header>

      <main style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'settings' ? (
          <PathSettings />
        ) : (
          <MergeWorkspace />
        )}
      </main>
    </div>
  )
}

export default App
