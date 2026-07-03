import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({ size = 'md', text, fullPage = false }: LoadingSpinnerProps) {
  const sizeMap = { sm: 16, md: 24, lg: 40 };

  if (fullPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-slate-700 flex items-center justify-center">
            <span className="text-2xl">♠</span>
          </div>
          <Loader2 size={40} className="absolute inset-0 m-auto text-green-400 animate-spin" />
        </div>
        {text && <p className="text-slate-400 text-sm">{text}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <Loader2 size={sizeMap[size]} className="text-green-400 animate-spin" />
      {text && <span className="text-slate-400 text-sm">{text}</span>}
    </div>
  );
}
