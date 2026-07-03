import React from 'react';
import { Game } from '../types';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../utils/format';
import { Users, MapPin, Calendar, ChevronRight, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/games/${game.id}`)}
      className="card-hover p-4 flex items-start gap-3 animate-slide-up"
    >
      {/* Status indicator / Suit icon */}
      <div className={clsx(
        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl',
        game.status === 'active' ? 'bg-green-500/20 text-green-400' :
        game.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
        game.status === 'completed' ? 'bg-slate-600/50 text-slate-400' :
        'bg-red-500/20 text-red-400'
      )}>
        {game.isHost ? <Crown size={22} /> : '♠'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">{game.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {game.isHost ? 'You are hosting' : `Hosted by ${game.hostName}`}
            </p>
          </div>
          <span className={clsx('chip-badge flex-shrink-0', getStatusColor(game.status))}>
            {getStatusLabel(game.status)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          {game.scheduledAt && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar size={11} />
              <span>{formatDate(game.scheduledAt)}</span>
            </div>
          )}
          {game.location && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin size={11} />
              <span className="truncate max-w-[120px]">{game.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Users size={11} />
            <span>{game.confirmedPlayers ?? 0}/{game.maxPlayers}</span>
          </div>
          {game.buyInAmount > 0 && (
            <div className="text-xs text-amber-400 font-semibold">
              {formatCurrency(game.buyInAmount)} buy-in
            </div>
          )}
        </div>

        {(game.totalPot ?? 0) > 0 && (
          <div className="mt-2 text-sm font-semibold text-green-400">
            Pot: {formatCurrency(game.totalPot ?? 0)}
          </div>
        )}
      </div>

      <ChevronRight size={16} className="text-slate-600 flex-shrink-0 mt-1" />
    </div>
  );
}
