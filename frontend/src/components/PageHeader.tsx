import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, showBack = false, onBack, rightAction, className }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={clsx('header-bar', className)}>
      {showBack && (
        <button
          onClick={handleBack}
          className="p-1 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-white truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>
      {rightAction && (
        <div className="flex-shrink-0">{rightAction}</div>
      )}
    </div>
  );
}
