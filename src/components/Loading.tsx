import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = false,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

// Skeleton loading components
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-200 rounded-lg h-32"></div>
  </div>
);

export default Loading;

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <div className="animate-pulse space-y-3">
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-300 rounded"></div>
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className = '' 
}) => (
  <div className={`animate-pulse space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i} 
        className="h-4 bg-gray-200 rounded" 
        style={{ width: `${Math.random() * 40 + 60}%` }}
      ></div>
    ))}
  </div>
)