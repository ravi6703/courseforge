import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, size = 'md', className = '' }) => {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeStyles[size]} ${className}`}>
      <div
        className="bg-gradient-to-r from-bi-blue-600 to-bi-accent-600 h-full rounded-full transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  );
};

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max = 100,
  size = 100,
  strokeWidth = 4,
  className = '',
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.35s ease',
          }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2B6FED" />
            <stop offset="100%" stopColor="#FFB800" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <span className="text-xl font-bold text-bi-navy-700">{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
};

export { ProgressBar, ProgressRing };
