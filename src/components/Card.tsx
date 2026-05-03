import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ children, className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`bg-white border border-bi-navy-200 rounded-lg shadow-bi-sm p-6 ${className}`}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`mb-4 pb-4 border-b border-bi-navy-200 ${className}`}>
    {children}
  </div>
);

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-bi-navy-200 ${className}`}>
    {children}
  </div>
);

export { Card, CardHeader, CardBody, CardFooter };
