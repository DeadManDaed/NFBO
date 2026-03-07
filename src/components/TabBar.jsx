//src/components/TabBar.jsx
import React from 'react';
export function TabBar({ tabs, activeTab, onSelect, unreadMessages }) {
  return (
    <nav className="tab-bar" role="tablist">
      {tabs.map(tab => {
        // On récupère le composant icône dynamique
        const Icon = tab.icon; 
        
        return (
          <div
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onSelect(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <div className="icon-wrap" style={{ position:'relative' }}>
              <Icon active={activeTab === tab.id} />
              {tab.id === 'messagerie' && unreadMessages > 0 && <span className="tab-dot"/>}
            </div>
            <span className="tab-label">{tab.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
