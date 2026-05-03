import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, disabled, className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bi-blue-600 focus-visible:ring-offset-2';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantStyles = {
      primary: 'bg-bi-navy-700 text-white hover:bg-bi-navy-800 active:bg-bi-navy-900 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-bi-sm',
      secondary: 'border border-bi-navy-700 text-bi-navy-700 bg-white hover:bg-bi-navy-50 active:bg-bi-navy-100 disabled:border-gray-300 disabled:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed',
      ghost: 'text-bi-navy-700 hover:bg-bi-navy-50 active:bg-bi-navy-100 disabled:text-gray-400 disabled:cursor-not-allowed',
      destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-bi-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
