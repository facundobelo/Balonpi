/**
 * NewsFeed - Display game news/events in a scrollable feed
 */

import type { NewsItem } from '../../game/storage/SaveManager';

interface NewsFeedProps {
  news: NewsItem[];
  maxItems?: number;
  compact?: boolean;
}

const TYPE_ICONS: Record<NewsItem['type'], string> = {
  TRANSFER: '💰',
  INJURY: '🏥',
  RESULT: '⚽',
  MILESTONE: '🏆',
  RUMOR: '📰',
};

const TYPE_COLORS: Record<NewsItem['type'], string> = {
  TRANSFER: 'var(--color-accent-green)',
  INJURY: 'var(--color-accent-red)',
  RESULT: 'var(--color-accent-blue)',
  MILESTONE: 'var(--color-accent-yellow)',
  RUMOR: 'var(--color-text-secondary)',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleString('es', { month: 'short' });
  return `${day} ${month}`;
}

export function NewsFeed({ news, maxItems = 10, compact = false }: NewsFeedProps) {
  const displayNews = news.slice(0, maxItems);

  if (displayNews.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--color-text-secondary)]">
        <div className="text-2xl mb-2">📰</div>
        <p className="text-sm">No hay noticias recientes</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {displayNews.map(item => (
          <div
            key={item.id}
            className="flex items-start gap-2 p-2 bg-[var(--color-bg-tertiary)] rounded"
          >
            <span className="text-lg flex-shrink-0">{TYPE_ICONS[item.type]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{item.headline}</p>
              <span className="text-[10px] text-[var(--color-text-secondary)]">
                {formatDate(item.date)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayNews.map(item => (
        <div
          key={item.id}
          className="p-3 bg-[var(--color-bg-tertiary)] rounded-lg border-l-2"
          style={{ borderColor: TYPE_COLORS[item.type] }}
        >
          <div className="flex items-start gap-2 mb-1">
            <span className="text-lg">{TYPE_ICONS[item.type]}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">{item.headline}</h4>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {formatDate(item.date)}
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] ml-7">
            {item.body}
          </p>
        </div>
      ))}
    </div>
  );
}
