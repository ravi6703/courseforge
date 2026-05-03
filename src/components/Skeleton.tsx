import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  const skeletons = Array.from({ length: count });

  return (
    <>
      {skeletons.map((_, i) => (
        <div
          key={i}
          className={`bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse rounded-md ${className}`}
        />
      ))}
    </>
  );
};

export { Skeleton };
