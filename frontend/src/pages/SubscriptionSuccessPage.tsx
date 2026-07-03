import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function SubscriptionSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();

  useEffect(() => {
    // Refresh user data to get updated subscription status
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/auth/me');
        updateUser(res.data);
      } catch {}
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-6 animate-bounce-subtle">
        <Check size={36} className="text-green-400" />
      </div>
      <h1 className="text-2xl font-black text-white mb-2">You're a Host!</h1>
      <p className="text-slate-400 mb-8 max-w-xs">
        Your subscription is now active. Start creating your first home game!
      </p>
      <button onClick={() => navigate('/create-game')} className="btn-primary max-w-xs mb-3">
        Create Your First Game 🃏
      </button>
      <button onClick={() => navigate('/home')} className="text-slate-400 hover:text-white text-sm">
        Go to Home
      </button>
    </div>
  );
}
