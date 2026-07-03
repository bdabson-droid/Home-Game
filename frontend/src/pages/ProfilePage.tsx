import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, Mail, Lock, LogOut, Crown, Settings,
  ChevronRight, Edit3, Check, X, Trophy, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { formatPhone } from '../utils/format';
import clsx from 'clsx';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/auth/profile', form);
      const meRes = await api.get('/auth/me');
      updateUser(meRes.data);
      toast.success('Profile updated!');
      setEditing(false);
      setForm(f => ({ ...f, currentPassword: '', newPassword: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out');
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Profile"
        rightAction={
          <button
            onClick={() => setEditing(!editing)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {editing ? <X size={20} /> : <Edit3 size={20} />}
          </button>
        }
      />

      <div className="px-4 mt-4 space-y-4 pb-8">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center py-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center mb-3 shadow-lg shadow-green-500/20">
            <span className="text-3xl font-black text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">{user?.name}</h2>
          <p className="text-slate-400 text-sm mt-0.5">{formatPhone(user?.phone || '')}</p>

          {/* Subscription badge */}
          <div className={clsx(
            'mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
            user?.subscriptionStatus === 'active'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-slate-700 text-slate-400 border border-slate-600'
          )}>
            <Crown size={12} />
            {user?.subscriptionStatus === 'active' ? 'Host Member' : 'Free Account'}
          </div>
        </div>

        {/* Edit form */}
        {editing ? (
          <div className="space-y-4 card p-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field"
                placeholder="your@email.com"
              />
            </div>
            <div className="border-t border-slate-700 pt-4">
              <p className="text-xs font-medium text-slate-400 mb-3">Change Password (optional)</p>
              <div className="space-y-3">
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                  className="input-field"
                  placeholder="Current password"
                />
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  className="input-field"
                  placeholder="New password (min. 6 chars)"
                  minLength={6}
                />
              </div>
            </div>
            <button onClick={handleSave} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          /* Info display */
          <div className="space-y-3">
            <div className="card divide-y divide-slate-700/50">
              <div className="flex items-center gap-3 p-4">
                <User size={18} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="text-white font-medium">{user?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4">
                <Phone size={18} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-white font-medium">{formatPhone(user?.phone || '')}</p>
                </div>
              </div>
              {user?.email && (
                <div className="flex items-center gap-3 p-4">
                  <Mail size={18} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-white font-medium">{user.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Subscription status */}
            <button
              onClick={() => navigate('/subscription')}
              className="card p-4 flex items-center gap-3 w-full hover:border-slate-600 transition-colors"
            >
              <Crown size={18} className="text-amber-400 flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-xs text-slate-500">Subscription</p>
                <p className={clsx('font-medium', user?.subscriptionStatus === 'active' ? 'text-amber-400' : 'text-white')}>
                  {user?.subscriptionStatus === 'active' ? 'Host Plan — Active' :
                   user?.subscriptionStatus === 'cancelled' ? 'Cancelled' : 'Free Account'}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 text-red-400 hover:text-red-300 font-semibold transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
