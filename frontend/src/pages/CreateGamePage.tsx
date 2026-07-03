import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, DollarSign, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

export default function CreateGamePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    scheduledAt: '',
    maxPlayers: '10',
    buyInAmount: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Game name is required');
      return;
    }

    if (user?.subscriptionStatus !== 'active') {
      toast.error('You need an active subscription to host games');
      navigate('/subscription');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/games', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
        scheduledAt: form.scheduledAt || undefined,
        maxPlayers: parseInt(form.maxPlayers) || 10,
        buyInAmount: parseFloat(form.buyInAmount) || 0,
      });

      toast.success('Game created!');
      navigate(`/games/${res.data.id}`);
    } catch (err: any) {
      if (err.response?.data?.needsSubscription) {
        navigate('/subscription');
      } else {
        toast.error(err.response?.data?.error || 'Failed to create game');
      }
    } finally {
      setLoading(false);
    }
  };

  if (user?.subscriptionStatus !== 'active') {
    return (
      <div className="page-container">
        <PageHeader title="Create Game" showBack />
        <div className="px-4 py-12 flex flex-col items-center text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-xl font-bold text-white mb-2">Host Subscription Required</h2>
          <p className="text-slate-400 mb-6 max-w-xs">
            To create and host your own poker home games, you need an active host subscription.
          </p>
          <button onClick={() => navigate('/subscription')} className="btn-gold max-w-xs">
            View Subscription Plans
          </button>
          <button onClick={() => navigate(-1)} className="btn-outline max-w-xs mt-3">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader title="Create New Game" showBack />

      <form onSubmit={handleCreate} className="px-4 mt-4 space-y-5 pb-8">
        {/* Game Name */}
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1.5">Game Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Friday Night Poker"
            className="input-field"
            required
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1.5">
            Description <span className="text-slate-500">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Texas Hold'em, bring snacks!"
            className="input-field resize-none"
            rows={3}
          />
        </div>

        {/* Location */}
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1.5">
            Location <span className="text-slate-500">(optional)</span>
          </label>
          <div className="relative">
            <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="123 Main St / Zoom link"
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Date & Time */}
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1.5">
            Date & Time <span className="text-slate-500">(optional)</span>
          </label>
          <div className="relative">
            <Calendar size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              className="input-field pl-10 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Max Players & Buy-in */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Max Players</label>
            <div className="relative">
              <Users size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={form.maxPlayers}
                onChange={e => setForm(f => ({ ...f, maxPlayers: e.target.value }))}
                min="2"
                max="50"
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Buy-in ($)</label>
            <div className="relative">
              <DollarSign size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={form.buyInAmount}
                onChange={e => setForm(f => ({ ...f, buyInAmount: e.target.value }))}
                min="0"
                step="5"
                placeholder="0"
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="card p-4 flex gap-3">
          <div className="text-2xl flex-shrink-0">🎲</div>
          <div>
            <p className="text-white text-sm font-semibold">Ready to deal?</p>
            <p className="text-slate-400 text-xs mt-0.5">
              After creating, you'll get a unique invite code to share with players. You can also send direct SMS invites from the game page.
            </p>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating...' : 'Create Game 🃏'}
        </button>
      </form>
    </div>
  );
}
