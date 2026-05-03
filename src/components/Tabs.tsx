import React, { useState } from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'pills';
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab = tabs[0]?.id,
  onChange,
  className = '',
  variant = 'default',
}) => {
  const [internal, setInternal] = useState(activeTab);
  const active = onChange ? activeTab : internal;

  const handleChange = (tabId: string) => {
    if (onChange) {
      onChange(tabId);
    } else {
      setInternal(tabId);
    }
  };

  const tabListStyles =
    variant === 'pills'
      ? 'flex gap-2 p-1 bg-gray-100 rounded-lg'
      : 'flex gap-0 border-b border-bi-navy-200';

  const tabTriggerStyles = (isActive: boolean) => {
    if (variant === 'pills') {
      return isActive
        ? 'px-4 py-2 rounded-md bg-bi-navy-700 text-white font-medium text-sm'
        : 'px-4 py-2 rounded-md text-bi-navy-700 hover:bg-gray-200 text-sm';
    }
    return isActive
      ? 'px-4 py-3 border-b-2 border-bi-accent-600 text-bi-navy-700 font-semibold text-sm'
      : 'px-4 py-3 text-bi-navy-600 hover:text-bi-navy-700 text-sm border-b-2 border-transparent';
  };

  return (
    <div className={className}>
      <div className={tabListStyles} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            disabled={tab.disabled}
            onClick={() => handleChange(tab.id)}
            className={`${tabTriggerStyles(active === tab.id)} ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''} flex items-center gap-2 transition-all duration-200`}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {tabs.map(
          (tab) =>
            active === tab.id && (
              <div key={tab.id} role="tabpanel">
                {tab.content}
              </div>
            )
        )}
      </div>
    </div>
  );
};

export { Tabs };
