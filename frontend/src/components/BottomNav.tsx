import React from 'react';
import { Home, List, User, PlusCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/games', label: 'Games', icon: List },
  { path: '/create-game', label: 'Create', icon: PlusCircle },
  { path: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 safe-bottom">
      <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={clsx(
                'bottom-nav-item flex-1',
                isActive ? 'active' : ''
              )}
            >
              <Icon size={22} className={isActive ? 'text-green-400' : 'text-slate-500'} />
              <span className={clsx('text-xs font-medium', isActive ? 'text-green-400' : 'text-slate-500')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
