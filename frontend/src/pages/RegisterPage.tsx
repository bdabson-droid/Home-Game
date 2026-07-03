import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Phone, User, Mail, Lock, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'info' | 'verify'>('info');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = Array.from({ length: 6 }, () => React.createRef<HTMLInputElement>());

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      setPhone(form.phone);
      if (res.data.devOtp) {
        setDevOtp(res.data.devOtp);
        toast.success(`Dev OTP: ${res.data.devOtp}`, { duration: 10000 });
      } else {
        toast.success('Verification code sent to your phone!');
      }
      setStep('verify');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < digits.length; i++) {
        if (index + i < 6) newOtp[index + i] = digits[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs[nextIndex]?.current?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs[index + 1]?.current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1]?.current?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify', { phone, otp: code });
      // Store token and redirect to login
      toast.success('Phone verified! Please log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const res = await api.post('/auth/resend-otp', { phone });
      if (res.data.devOtp) {
        setDevOtp(res.data.devOtp);
        toast.success(`New OTP: ${res.data.devOtp}`, { duration: 10000 });
      } else {
        toast.success('New code sent!');
      }
    } catch (err: any) {
      toast.error('Failed to resend code');
    }
  };

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col px-6 py-12">
        <button onClick={() => setStep('info')} className="flex items-center gap-1 text-slate-400 hover:text-white mb-8">
          <ChevronLeft size={20} /> Back
        </button>

        <div className="flex-1 flex flex-col">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mb-4">
              <Phone size={28} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-white">Verify Your Number</h1>
            <p className="text-slate-400 mt-2">
              Enter the 6-digit code sent to <span className="text-white font-medium">{phone}</span>
            </p>
            {devOtp && (
              <div className="mt-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 text-sm font-medium">Dev mode — OTP: <span className="font-bold text-lg">{devOtp}</span></p>
              </div>
            )}
          </div>

          {/* OTP Input */}
          <div className="flex gap-3 mb-8">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={otpRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={e => handleOtpChange(index, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(index, e)}
                className="flex-1 h-14 text-center text-xl font-bold bg-slate-800 border border-slate-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 rounded-xl outline-none text-white transition-all"
              />
            ))}
          </div>

          <button onClick={handleVerify} disabled={loading || otp.join('').length !== 6} className="btn-primary mb-4">
            {loading ? 'Verifying...' : 'Verify Phone'}
          </button>

          <p className="text-center text-slate-400 text-sm">
            Didn't get a code?{' '}
            <button onClick={handleResendOtp} className="text-green-400 font-semibold">
              Resend
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col px-6 py-12">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-slate-400 hover:text-white mb-8">
        <ChevronLeft size={20} /> Back
      </button>

      <div className="flex-1 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Create Account</h1>
          <p className="text-slate-400 mt-1">Join PokerNight and start managing your home games</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Full Name *</label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="John Smith"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Phone Number *</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          {/* Email (optional) */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">
              Email <span className="text-slate-500">(optional)</span>
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="john@example.com"
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Password *</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 6 characters"
                className="input-field pl-10 pr-10"
                required
                minLength={6}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-green-400 font-semibold">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
