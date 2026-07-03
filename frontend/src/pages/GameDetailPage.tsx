import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Share2, UserPlus, Play, Square, Copy, Check, DollarSign,
  Trophy, Users, ChevronDown, ChevronUp, Settings, Trash2, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Game, GamePlayer } from '../types';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import PlayerCard from '../components/PlayerCard';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../utils/format';
import clsx from 'clsx';

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBuyInModal, setShowBuyInModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<GamePlayer | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Invite state
  const [invitePhones, setInvitePhones] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Buy-in state
  const [buyInAmount, setBuyInAmount] = useState('');
  const [buyInChips, setBuyInChips] = useState('');
  const [buyInLoading, setBuyInLoading] = useState(false);

  // Cash-out state
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [cashOutLoading, setCashOutLoading] = useState(false);

  const fetchGame = useCallback(async () => {
    try {
      const res = await api.get(`/games/${id}`);
      setGame(res.data);
    } catch (err: any) {
      toast.error('Failed to load game');
      navigate('/games');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGame();
    // Auto-refresh every 30 seconds for live games
    const interval = setInterval(() => {
      if (game?.status === 'active') fetchGame();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  const copyCode = () => {
    if (game?.inviteCode) {
      navigator.clipboard.writeText(game.inviteCode);
      setCodeCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const shareGame = async () => {
    if (game && navigator.share) {
      try {
        await navigator.share({
          title: `Join my poker game: ${game.name}`,
          text: `Use code ${game.inviteCode} to join "${game.name}" on PokerNight!`,
        });
      } catch {}
    } else {
      copyCode();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!game) return;
    setStatusLoading(true);
    try {
      await api.put(`/games/${game.id}`, { status: newStatus });
      toast.success(`Game ${newStatus === 'active' ? 'started' : newStatus === 'completed' ? 'ended' : 'updated'}!`);
      fetchGame();
    } catch {
      toast.error('Failed to update game status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleInvite = async () => {
    const phones = invitePhones.split(/[\n,;]+/).map(p => p.trim()).filter(Boolean);
    if (phones.length === 0) {
      toast.error('Enter at least one phone number');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await api.post(`/games/${id}/invite`, { phones });
      const invited = res.data.results.filter((r: any) => r.status === 'invited').length;
      const alreadyInvited = res.data.results.filter((r: any) => r.status === 'already_invited').length;
      if (invited > 0) toast.success(`${invited} player${invited > 1 ? 's' : ''} invited!`);
      if (alreadyInvited > 0) toast(`${alreadyInvited} already invited`, { icon: 'ℹ️' });
      setInvitePhones('');
      setShowInviteModal(false);
      fetchGame();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleBuyIn = async () => {
    if (!selectedPlayer || !buyInAmount) return;
    setBuyInLoading(true);
    try {
      await api.post(`/games/${id}/players/${selectedPlayer.id}/buyin`, {
        amount: parseFloat(buyInAmount),
        chips: buyInChips ? parseInt(buyInChips) : 0,
      });
      const isRebuy = selectedPlayer.buyInTotal > 0;
      toast.success(`${isRebuy ? 'Rebuy' : 'Buy-in'} recorded for ${selectedPlayer.name}!`);
      setBuyInAmount('');
      setBuyInChips('');
      setShowBuyInModal(false);
      fetchGame();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record buy-in');
    } finally {
      setBuyInLoading(false);
    }
  };

  const handleCashOut = async () => {
    if (!selectedPlayer) return;
    setCashOutLoading(true);
    try {
      const res = await api.post(`/games/${id}/players/${selectedPlayer.id}/cashout`, {
        amount: parseFloat(cashOutAmount) || 0,
      });
      const profit = res.data.profit;
      if (profit > 0) toast.success(`${selectedPlayer.name} cashed out +${formatCurrency(profit)}! 🎉`);
      else if (profit < 0) toast(`${selectedPlayer.name} cashed out ${formatCurrency(profit)}`, { icon: '📉' });
      else toast.success(`${selectedPlayer.name} broke even`);
      setCashOutAmount('');
      setShowCashOutModal(false);
      fetchGame();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record cash out');
    } finally {
      setCashOutLoading(false);
    }
  };

  const handleDeleteGame = async () => {
    if (!confirm('Are you sure you want to cancel this game?')) return;
    try {
      await api.delete(`/games/${id}`);
      toast.success('Game cancelled');
      navigate('/games');
    } catch {
      toast.error('Failed to cancel game');
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Loading game..." />;
  if (!game) return null;

  const isHost = game.isHost;
  const isLive = game.status === 'active';
  const isUpcoming = game.status === 'upcoming';
  const isCompleted = game.status === 'completed';

  const activePlayers = game.players?.filter(p => p.status !== 'invited') ?? [];
  const invitedPlayers = game.players?.filter(p => p.status === 'invited') ?? [];

  return (
    <div className="page-container">
      <PageHeader
        title={game.name}
        subtitle={isHost ? 'You are hosting' : `Hosted by ${game.hostName}`}
        showBack
        rightAction={
          isHost ? (
            <button onClick={() => navigate(`/games/${id}/settings`)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
              <Settings size={20} />
            </button>
          ) : undefined
        }
      />

      <div className="px-4 mt-4 space-y-4 pb-8">
        {/* Status & Invite Code */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className={clsx('chip-badge text-sm', getStatusColor(game.status))}>
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1 inline-block" />}
              {getStatusLabel(game.status)}
            </span>
            <div className="flex gap-2">
              <button onClick={shareGame} className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:text-white">
                <Share2 size={16} />
              </button>
              {isHost && (
                <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white rounded-lg text-xs font-semibold transition-colors">
                  <UserPlus size={14} /> Invite
                </button>
              )}
            </div>
          </div>

          {/* Invite Code Display */}
          <div className="bg-slate-700/50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Invite Code</p>
              <p className="text-2xl font-black text-white tracking-widest">{game.inviteCode}</p>
            </div>
            <button onClick={copyCode} className="p-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 transition-colors">
              {codeCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-slate-300" />}
            </button>
          </div>

          {/* Game Info */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {game.scheduledAt && (
              <div className="text-slate-400">
                📅 {formatDate(game.scheduledAt)}
              </div>
            )}
            {game.location && (
              <div className="text-slate-400 truncate">
                📍 {game.location}
              </div>
            )}
            <div className="text-slate-400">
              👥 {activePlayers.length}/{game.maxPlayers} players
            </div>
            {game.buyInAmount > 0 && (
              <div className="text-amber-400 font-semibold">
                💰 {formatCurrency(game.buyInAmount)} buy-in
              </div>
            )}
          </div>
        </div>

        {/* Stats (live/completed) */}
        {(isLive || isCompleted) && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <div className="text-xl font-black text-green-400">{formatCurrency(game.totalPot ?? 0)}</div>
              <div className="text-xs text-slate-400 mt-0.5">Total Pot</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xl font-black text-blue-400">
                {game.players?.filter(p => p.status === 'playing').length ?? 0}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Still Playing</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xl font-black text-amber-400">
                {game.players?.filter(p => p.status === 'cashed_out').length ?? 0}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Cashed Out</div>
            </div>
          </div>
        )}

        {/* Host Actions */}
        {isHost && (
          <div className="space-y-2">
            {isUpcoming && (
              <button
                onClick={() => handleStatusChange('active')}
                disabled={statusLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                <Play size={18} /> Start Game
              </button>
            )}
            {isLive && (
              <button
                onClick={() => handleStatusChange('completed')}
                disabled={statusLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
              >
                <Square size={16} /> End Game
              </button>
            )}
            {(isUpcoming || isLive) && (
              <button
                onClick={handleDeleteGame}
                className="w-full flex items-center justify-center gap-2 py-2 text-red-400 text-sm hover:text-red-300"
              >
                <Trash2 size={14} /> Cancel Game
              </button>
            )}
          </div>
        )}

        {/* Leaderboard (completed games) */}
        {isCompleted && game.players && game.players.filter(p => p.profit !== null).length > 0 && (
          <div>
            <p className="section-title mb-3">Final Results</p>
            <div className="space-y-2">
              {[...game.players]
                .filter(p => p.profit !== null)
                .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
                .map((p, i) => (
                  <div key={p.id} className="card p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-lg flex-shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400">In: {formatCurrency(p.buyInTotal)}</p>
                    </div>
                    <div className={clsx(
                      'font-bold',
                      (p.profit ?? 0) > 0 ? 'text-green-400' : (p.profit ?? 0) < 0 ? 'text-red-400' : 'text-slate-400'
                    )}>
                      {(p.profit ?? 0) > 0 ? '+' : ''}{formatCurrency(p.profit ?? 0)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Player List */}
        {activePlayers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="section-title">Players ({activePlayers.length})</p>
              {isLive && isHost && (
                <button onClick={fetchGame} className="p-1.5 text-slate-400 hover:text-white">
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
            <div className="space-y-2">
              {activePlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isHost={isHost}
                  gameStatus={game.status}
                  onBuyIn={(p) => { setSelectedPlayer(p); setBuyInAmount(String(game.buyInAmount || '')); setShowBuyInModal(true); }}
                  onCashOut={(p) => { setSelectedPlayer(p); setCashOutAmount(''); setShowCashOutModal(true); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Invited (pending) */}
        {invitedPlayers.length > 0 && (
          <div>
            <p className="section-title mb-3">Invited ({invitedPlayers.length})</p>
            <div className="space-y-2">
              {invitedPlayers.map(player => (
                <div key={player.id} className="card p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                    {player.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-300">{player.name}</p>
                    {player.phone && <p className="text-xs text-slate-500">{player.phone}</p>}
                  </div>
                  <span className="chip-badge text-[10px] text-amber-400 bg-amber-400/10">Pending</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions log */}
        {game.transactions && game.transactions.length > 0 && (
          <div>
            <button
              onClick={() => setShowTransactions(!showTransactions)}
              className="flex items-center justify-between w-full"
            >
              <p className="section-title">Transaction Log ({game.transactions.length})</p>
              {showTransactions ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {showTransactions && (
              <div className="mt-3 space-y-2">
                {game.transactions.map(t => (
                  <div key={t.id} className="card p-3 flex items-center gap-3">
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0',
                      t.type === 'buy_in' ? 'bg-blue-500/20 text-blue-400' :
                      t.type === 'rebuy' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-green-500/20 text-green-400'
                    )}>
                      {t.type === 'buy_in' ? '↓' : t.type === 'rebuy' ? '↻' : '↑'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{t.playerName}</p>
                      <p className="text-xs text-slate-400 capitalize">
                        {t.type.replace('_', ' ')} {t.chips ? `• ${t.chips.toLocaleString()} chips` : ''}
                      </p>
                    </div>
                    <span className={clsx(
                      'font-semibold text-sm',
                      t.type === 'cash_out' ? 'text-green-400' : 'text-white'
                    )}>
                      {t.type === 'cash_out' ? '' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite Players">
        <div className="space-y-4">
          <div className="card p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Share invite code</p>
              <p className="text-2xl font-black text-white tracking-widest">{game.inviteCode}</p>
            </div>
            <button onClick={copyCode} className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600">
              {codeCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-slate-400" />}
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">
              Or invite by phone numbers
            </label>
            <textarea
              value={invitePhones}
              onChange={e => setInvitePhones(e.target.value)}
              placeholder={"+1 555 123 4567\n+1 555 987 6543\n..."}
              className="input-field resize-none text-sm"
              rows={5}
            />
            <p className="text-xs text-slate-500 mt-1">One number per line (comma or semicolon also work)</p>
          </div>

          <button
            onClick={handleInvite}
            disabled={inviteLoading || !invitePhones.trim()}
            className="btn-primary"
          >
            {inviteLoading ? 'Sending...' : 'Send Invites 📨'}
          </button>
        </div>
      </Modal>

      {/* Buy-in Modal */}
      <Modal
        isOpen={showBuyInModal}
        onClose={() => { setShowBuyInModal(false); setSelectedPlayer(null); }}
        title={selectedPlayer?.buyInTotal ? `Rebuy — ${selectedPlayer?.name}` : `Buy In — ${selectedPlayer?.name}`}
      >
        <div className="space-y-4">
          {selectedPlayer?.buyInTotal ? (
            <div className="card p-3">
              <p className="text-xs text-slate-400">Current total buy-in</p>
              <p className="text-xl font-bold text-white">{formatCurrency(selectedPlayer.buyInTotal)}</p>
              <p className="text-xs text-slate-400 mt-1">Rebuys: {selectedPlayer.rebuyCount}</p>
            </div>
          ) : null}

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Amount ($)</label>
            <div className="relative">
              <DollarSign size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={buyInAmount}
                onChange={e => setBuyInAmount(e.target.value)}
                placeholder={String(game.buyInAmount || '100')}
                className="input-field pl-10"
                min="1"
                autoFocus
              />
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mt-2">
              {[20, 50, 100, 200].map(amt => (
                <button
                  key={amt}
                  onClick={() => setBuyInAmount(String(amt))}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-sm font-semibold transition-colors',
                    buyInAmount === String(amt)
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  )}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">
              Chips <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="number"
              value={buyInChips}
              onChange={e => setBuyInChips(e.target.value)}
              placeholder="e.g. 10000"
              className="input-field"
              min="0"
            />
          </div>

          <button onClick={handleBuyIn} disabled={buyInLoading || !buyInAmount} className="btn-primary">
            {buyInLoading ? 'Recording...' : `Record ${selectedPlayer?.buyInTotal ? 'Rebuy' : 'Buy-in'}`}
          </button>
        </div>
      </Modal>

      {/* Cash Out Modal */}
      <Modal
        isOpen={showCashOutModal}
        onClose={() => { setShowCashOutModal(false); setSelectedPlayer(null); }}
        title={`Cash Out — ${selectedPlayer?.name}`}
      >
        <div className="space-y-4">
          <div className="card p-3">
            <p className="text-xs text-slate-400">Total buy-in</p>
            <p className="text-xl font-bold text-white">{formatCurrency(selectedPlayer?.buyInTotal ?? 0)}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Cash Out Amount ($)</label>
            <div className="relative">
              <DollarSign size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={cashOutAmount}
                onChange={e => setCashOutAmount(e.target.value)}
                placeholder="0"
                className="input-field pl-10"
                min="0"
                autoFocus
              />
            </div>
          </div>

          {cashOutAmount && selectedPlayer && (
            <div className={clsx(
              'card p-3 text-center',
              parseFloat(cashOutAmount) - selectedPlayer.buyInTotal > 0 ? 'border-green-500/30' :
              parseFloat(cashOutAmount) - selectedPlayer.buyInTotal < 0 ? 'border-red-500/30' : ''
            )}>
              <p className="text-xs text-slate-400 mb-1">Profit / Loss</p>
              <p className={clsx(
                'text-2xl font-black',
                parseFloat(cashOutAmount) - selectedPlayer.buyInTotal > 0 ? 'text-green-400' :
                parseFloat(cashOutAmount) - selectedPlayer.buyInTotal < 0 ? 'text-red-400' : 'text-slate-400'
              )}>
                {parseFloat(cashOutAmount) - selectedPlayer.buyInTotal > 0 ? '+' : ''}
                {formatCurrency(parseFloat(cashOutAmount) - (selectedPlayer?.buyInTotal ?? 0))}
              </p>
            </div>
          )}

          <button onClick={handleCashOut} disabled={cashOutLoading} className="btn-primary">
            {cashOutLoading ? 'Recording...' : 'Record Cash Out 🏦'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
