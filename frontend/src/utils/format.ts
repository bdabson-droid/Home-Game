export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(dateStr);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-400 bg-green-400/10';
    case 'upcoming': return 'text-blue-400 bg-blue-400/10';
    case 'completed': return 'text-slate-400 bg-slate-400/10';
    case 'cancelled': return 'text-red-400 bg-red-400/10';
    case 'playing': return 'text-green-400 bg-green-400/10';
    case 'invited': return 'text-amber-400 bg-amber-400/10';
    case 'confirmed': return 'text-blue-400 bg-blue-400/10';
    case 'cashed_out': return 'text-slate-400 bg-slate-400/10';
    default: return 'text-slate-400 bg-slate-400/10';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'upcoming': return 'Upcoming';
    case 'active': return 'Live';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'playing': return 'Playing';
    case 'invited': return 'Invited';
    case 'confirmed': return 'Confirmed';
    case 'cashed_out': return 'Cashed Out';
    case 'host': return 'Host';
    default: return status;
  }
}
