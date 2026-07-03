import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ phone: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/home');
    } catch (err: any) {
      if (err.response?.data?.needsVerification) {
        toast.error('Please verify your phone number first');
        navigate('/register');
      } else {
        toast.error(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col px-6 py-12">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-slate-400 hover:text-white mb-8">
        <ChevronLeft size={20} /> Back
      </button>

      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mb-4">
            <span className="text-4xl">🃏</span>
          </div>
          <h1 className="text-2xl font-black text-white">Welcome Back</h1>
          <p className="text-slate-400 mt-1">Sign in to manage your poker games</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className="input-field pl-10"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Your password"
                className="input-field pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-6">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-green-400 font-semibold">Create one</Link>
        </p>

        <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-xs text-slate-500 text-center font-medium mb-2">Demo credentials</p>
          <p className="text-xs text-slate-400 text-center">Register with any phone number to try the app</p>
        </div>
      </div>
    </div>
  );
}
