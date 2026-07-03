import React, { useEffect, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import api from '../utils/api';
import { Game } from '../types';
import GameCard from '../components/GameCard';
import BottomNav from '../components/BottomNav';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type FilterType = 'all' | 'hosting' | 'playing' | 'upcoming' | 'active' | 'completed';

export default function GamesListPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/games').then(res => {
      setGames(res.data);
    }).catch(() => toast.error('Failed to load games')).finally(() => setLoading(false));
  }, []);

  const filteredGames = games.filter(game => {
    const matchesSearch = !search || game.name.toLowerCase().includes(search.toLowerCase()) ||
      game.hostName.toLowerCase().includes(search.toLowerCase());

    let matchesFilter = true;
    switch (filter) {
      case 'hosting': matchesFilter = game.isHost; break;
      case 'playing': matchesFilter = !game.isHost; break;
      case 'upcoming': matchesFilter = game.status === 'upcoming'; break;
      case 'active': matchesFilter = game.status === 'active'; break;
      case 'completed': matchesFilter = game.status === 'completed'; break;
    }

    return matchesSearch && matchesFilter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Live' },
    { key: 'hosting', label: 'Hosting' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Past' },
  ];

  return (
    <div className="page-container">
      <PageHeader title="My Games" />

      <div className="px-4 mt-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search games..."
            className="input-field pl-9 py-2.5 text-sm"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={clsx(
                'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === key
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Games */}
        {loading ? (
          <LoadingSpinner text="Loading games..." />
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No games found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGames.map(game => <GameCard key={game.id} game={game} />)}
          </div>
        )}
      </div>
    </div>
  );
}
