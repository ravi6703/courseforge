import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    {icon && (
      <div className="mb-4 text-bi-navy-300">
        {icon}
      </div>
    )}
    <h3 className="text-xl font-semibold text-bi-navy-700 mb-2 text-center">
      {title}
    </h3>
    <p className="text-text-muted max-w-md text-center mb-6">
      {description}
    </p>
    {action && (
      <Button
        variant={action.variant || 'primary'}
        size="md"
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    )}
  </div>
);

export { EmptyState };
