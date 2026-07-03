import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-between px-6 py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-800/50 rounded-full blur-3xl" />
      </div>

      {/* Cards scattered in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {['♠', '♥', '♣', '♦'].map((suit, i) => (
          <span
            key={suit}
            className="absolute text-6xl opacity-5 animate-pulse"
            style={{
              top: `${20 + i * 20}%`,
              left: `${10 + i * 22}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            {suit}
          </span>
        ))}
      </div>

      {/* Logo section */}
      <div className="flex flex-col items-center gap-4 relative z-10 mt-12">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-2xl shadow-green-500/30">
            <span className="text-5xl">🃏</span>
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
            <span className="text-sm font-bold text-slate-900">♠</span>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-white tracking-tight">PokerNight</h1>
          <p className="text-green-400 font-semibold text-lg mt-1">Home Game Manager</p>
        </div>
      </div>

      {/* Features */}
      <div className="w-full max-w-sm relative z-10">
        <div className="space-y-3">
          {[
            { emoji: '🏠', title: 'Host Private Games', desc: 'Create home games and manage your players' },
            { emoji: '📱', title: 'Invite by Phone', desc: 'Send SMS invites or share a simple 6-digit code' },
            { emoji: '💰', title: 'Track Chips & Cash', desc: 'Buy-ins, rebuys, and cash outs in real time' },
          ].map(feature => (
            <div key={feature.title} className="card p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-xl flex-shrink-0">
                {feature.emoji}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{feature.title}</p>
                <p className="text-xs text-slate-400">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="w-full max-w-sm space-y-3 relative z-10">
        <button onClick={() => navigate('/register')} className="btn-primary text-lg py-4">
          Get Started — It's Free
        </button>
        <button onClick={() => navigate('/login')} className="btn-outline">
          Sign In
        </button>
        <p className="text-center text-xs text-slate-500 mt-2">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
