import React from 'react';
import { GamePlayer } from '../types';
import { formatCurrency, getStatusColor, getStatusLabel } from '../utils/format';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface PlayerCardProps {
  player: GamePlayer;
  isHost: boolean;
  gameStatus: string;
  onBuyIn?: (player: GamePlayer) => void;
  onCashOut?: (player: GamePlayer) => void;
  onClick?: (player: GamePlayer) => void;
}

export default function PlayerCard({ player, isHost, gameStatus, onBuyIn, onCashOut, onClick }: PlayerCardProps) {
  const isLive = gameStatus === 'active';

  return (
    <div
      onClick={() => onClick?.(player)}
      className={clsx('card p-3', onClick && 'cursor-pointer hover:border-slate-600 transition-colors')}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-white">
            {player.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm truncate">{player.name}</span>
            <span className={clsx('chip-badge text-[10px]', getStatusColor(player.status))}>
              {getStatusLabel(player.status)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {player.buyInTotal > 0 && (
              <span className="text-xs text-slate-400">
                In: <span className="text-white">{formatCurrency(player.buyInTotal)}</span>
              </span>
            )}
            {player.rebuyCount > 0 && (
              <span className="text-xs text-slate-500">+{player.rebuyCount} rebuy</span>
            )}
            {player.chipCount > 0 && player.status === 'playing' && (
              <span className="text-xs text-slate-400">
                Chips: <span className="text-white">{player.chipCount.toLocaleString()}</span>
              </span>
            )}
          </div>
        </div>

        {/* Profit/Loss or Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {player.profit !== null && player.profit !== undefined && (
            <div className={clsx(
              'flex items-center gap-1 text-sm font-bold',
              player.profit > 0 ? 'text-green-400' : player.profit < 0 ? 'text-red-400' : 'text-slate-400'
            )}>
              {player.profit > 0 ? <TrendingUp size={14} /> : player.profit < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
              {player.profit > 0 ? '+' : ''}{formatCurrency(player.profit)}
            </div>
          )}

          {isHost && isLive && (
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              {player.status !== 'cashed_out' && (
                <button
                  onClick={() => onBuyIn?.(player)}
                  className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-2 py-1 rounded-lg font-medium transition-colors"
                >
                  {player.buyInTotal > 0 ? 'Rebuy' : 'Buy In'}
                </button>
              )}
              {player.status === 'playing' && (
                <button
                  onClick={() => onCashOut?.(player)}
                  className="text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-2 py-1 rounded-lg font-medium transition-colors"
                >
                  Cash Out
                </button>
              )}
            </div>
          )}

          {onClick && <ChevronRight size={14} className="text-slate-600" />}
        </div>
      </div>
    </div>
  );
}
