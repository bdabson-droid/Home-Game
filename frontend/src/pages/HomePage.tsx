import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Hash, TrendingUp, Users, Trophy, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Game } from '../types';
import GameCard from '../components/GameCard';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await api.get('/games');
      setGames(res.data);
    } catch {
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await api.post('/games/join', { inviteCode: joinCode.toUpperCase() });
      toast.success(`Joined "${res.data.gameName}"!`);
      navigate(`/games/${res.data.gameId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid code');
    } finally {
      setJoining(false);
    }
  };

  const liveGames = games.filter(g => g.status === 'active');
  const upcomingGames = games.filter(g => g.status === 'upcoming');
  const completedGames = games.filter(g => g.status === 'completed');

  const totalWinnings = completedGames
    .filter(g => !g.isHost && g.myBuyIn !== undefined)
    .reduce((sum, g) => sum + (g.myBuyIn ?? 0), 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Good evening 👋</p>
              <h1 className="text-xl font-black text-white">{user?.name?.split(' ')[0]}</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinInput(!showJoinInput)}
                className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
              >
                <Hash size={20} />
              </button>
              <button
                onClick={() => navigate('/create-game')}
                className="p-2.5 rounded-xl bg-green-500 text-white hover:bg-green-400 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Join game input */}
          {showJoinInput && (
            <div className="mt-3 flex gap-2 animate-slide-up">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code (e.g. ABC123)"
                className="input-field flex-1 py-2.5 text-sm tracking-widest uppercase"
                maxLength={6}
                onKeyDown={e => e.key === 'Enter' && handleJoinGame()}
                autoFocus
              />
              <button
                onClick={handleJoinGame}
                disabled={joining || !joinCode.trim()}
                className="px-4 bg-green-500 hover:bg-green-400 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {joining ? '...' : 'Join'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Stats bar */}
        {!loading && games.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <div className="text-2xl font-black text-green-400">{liveGames.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">Live Games</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-2xl font-black text-blue-400">{upcomingGames.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">Upcoming</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-2xl font-black text-amber-400">{completedGames.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">Completed</div>
            </div>
          </div>
        )}

        {/* Subscription banner */}
        {user?.subscriptionStatus !== 'active' && (
          <button
            onClick={() => navigate('/subscription')}
            className="w-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-2xl p-4 text-left hover:from-amber-500/30 hover:to-amber-600/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={16} className="text-amber-400" />
                  <span className="text-amber-400 font-bold text-sm">Become a Host</span>
                </div>
                <p className="text-white font-semibold">Subscribe to host games</p>
                <p className="text-slate-400 text-xs mt-0.5">Create & manage your own home games</p>
              </div>
              <ChevronRight size={20} className="text-amber-400" />
            </div>
          </button>
        )}

        {loading ? (
          <LoadingSpinner text="Loading your games..." />
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-4">🃏</div>
            <h3 className="text-xl font-bold text-white mb-2">No games yet</h3>
            <p className="text-slate-400 text-sm max-w-xs mb-6">
              Join a game using an invite code, or subscribe to host your own home game.
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              <button onClick={() => setShowJoinInput(true)} className="btn-outline text-sm py-2.5">
                Join a Game
              </button>
              <button onClick={() => navigate('/subscription')} className="btn-gold text-sm py-2.5">
                Host a Game
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Live games */}
            {liveGames.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="section-title">Live Now</p>
                </div>
                <div className="space-y-2">
                  {liveGames.map(game => <GameCard key={game.id} game={game} />)}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcomingGames.length > 0 && (
              <div>
                <p className="section-title mb-3">Upcoming</p>
                <div className="space-y-2">
                  {upcomingGames.map(game => <GameCard key={game.id} game={game} />)}
                </div>
              </div>
            )}

            {/* Recent */}
            {completedGames.length > 0 && (
              <div>
                <p className="section-title mb-3">Recent Games</p>
                <div className="space-y-2">
                  {completedGames.slice(0, 3).map(game => <GameCard key={game.id} game={game} />)}
                </div>
                {completedGames.length > 3 && (
                  <button
                    onClick={() => navigate('/games')}
                    className="w-full text-center text-green-400 text-sm font-semibold py-3 hover:text-green-300"
                  >
                    View all {completedGames.length} games →
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
