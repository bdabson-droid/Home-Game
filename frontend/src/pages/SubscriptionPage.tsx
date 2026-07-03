import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Zap, Shield, Trophy, ChevronLeft, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import PageHeader from '../components/PageHeader';

const FEATURES = [
  { icon: '🏠', text: 'Create unlimited home games' },
  { icon: '📱', text: 'Invite players by phone number' },
  { icon: '🔑', text: 'Unique invite codes per game' },
  { icon: '💰', text: 'Track buy-ins, rebuys & cash outs' },
  { icon: '📊', text: 'Real-time profit/loss leaderboard' },
  { icon: '📜', text: 'Full transaction history' },
  { icon: '👥', text: 'Manage up to 50 players per game' },
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [devActivating, setDevActivating] = useState(false);

  const isActive = user?.subscriptionStatus === 'active';

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await api.post('/subscription/create-checkout');
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleDevActivate = async () => {
    setDevActivating(true);
    try {
      await api.post('/subscription/activate-dev');
      const meRes = await api.get('/auth/me');
      updateUser(meRes.data);
      toast.success('🎉 Subscription activated (dev mode)!');
      navigate('/home');
    } catch (err: any) {
      toast.error('Failed to activate dev subscription');
    } finally {
      setDevActivating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your billing period.')) return;
    try {
      await api.post('/subscription/cancel');
      toast.success('Subscription will be cancelled at period end');
    } catch {
      toast.error('Failed to cancel subscription');
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Host Subscription" showBack />

      <div className="px-4 mt-4 space-y-6 pb-8">
        {/* Active subscription */}
        {isActive ? (
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Check size={24} className="text-green-400" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">Active Host</h2>
                <p className="text-green-400 text-sm">Your subscription is active</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              You can create and manage unlimited home games. Thank you for being a PokerNight host!
            </p>
            <button onClick={handleCancel} className="text-slate-400 hover:text-red-400 text-sm transition-colors">
              Cancel subscription
            </button>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="text-center py-4">
              <div className="text-5xl mb-3">♠️</div>
              <h2 className="text-2xl font-black text-white">Become a Host</h2>
              <p className="text-slate-400 mt-2 max-w-xs mx-auto">
                Everything you need to run the perfect poker home game
              </p>
            </div>

            {/* Pricing card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-600 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="chip-badge bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Most Popular
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-white">$9.99</span>
                  <span className="text-slate-400 mb-1">/month</span>
                </div>
                <p className="text-slate-400 text-sm">Cancel anytime</p>
              </div>

              <div className="space-y-2.5 mb-5">
                {FEATURES.map(f => (
                  <div key={f.text} className="flex items-center gap-3">
                    <span className="text-base">{f.icon}</span>
                    <span className="text-slate-300 text-sm">{f.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="btn-gold"
              >
                {loading ? 'Redirecting...' : 'Subscribe Now — $9.99/mo'}
              </button>
            </div>

            {/* Free tier info */}
            <div className="card p-4">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Shield size={16} className="text-slate-400" /> Free Account
              </h3>
              <div className="space-y-2">
                {[
                  { text: 'Join games with invite codes', included: true },
                  { text: 'View game history', included: true },
                  { text: 'Track your winnings', included: true },
                  { text: 'Create & host games', included: false },
                  { text: 'Invite players by phone', included: false },
                  { text: 'Manage buy-ins & cash outs', included: false },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-3">
                    {item.included
                      ? <Check size={14} className="text-green-400 flex-shrink-0" />
                      : <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-600 flex-shrink-0 text-xs">✕</span>
                    }
                    <span className={item.included ? 'text-slate-300 text-sm' : 'text-slate-500 text-sm line-through'}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Dev mode activate button */}
        <div className="border border-dashed border-slate-700 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-2 font-medium">Development Mode</p>
          <p className="text-xs text-slate-600 mb-3">
            Stripe is not configured. Use the button below to simulate subscription activation.
          </p>
          <button
            onClick={handleDevActivate}
            disabled={devActivating || isActive}
            className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {devActivating ? 'Activating...' : isActive ? '✓ Subscription Active' : 'Activate Free Dev Subscription'}
          </button>
        </div>
      </div>
    </div>
  );
}
