import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'status' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'default', size = 'sm', children, className = '', ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full';

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  const variantStyles = {
    default: 'bg-bi-navy-100 text-bi-navy-700',
    status: 'bg-bi-blue-100 text-bi-blue-700',
    accent: 'bg-bi-accent-100 text-bi-accent-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

export { Badge };
