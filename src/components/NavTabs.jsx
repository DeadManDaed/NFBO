//src/components/NavTabs.jsx

export default function NavTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'definition', label: 'Définition des lots', icon: '📋' },
    { id: 'admission', label: 'Admission des lots', icon: '📥' },
    { id: 'retraits', label: 'Retraits', icon: '📤' },
    { id: 'transferts', label: 'Transferts', icon: '🔄' },
  ];

  return (
    <div className="flex gap-3 mb-6 flex-wrap">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="mr-2">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}