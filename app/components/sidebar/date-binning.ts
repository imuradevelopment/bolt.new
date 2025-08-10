import { format, isAfter, isThisWeek, isThisYear, isToday, isYesterday, subDays } from 'date-fns';
import type { ChatHistoryItem } from '~/lib/persistence';

type Bin = { category: string; items: ChatHistoryItem[] };

export function binDates(_list: ChatHistoryItem[]) {
  const list = _list.toSorted((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  const binLookup: Record<string, Bin> = {};
  const bins: Array<Bin> = [];

  list.forEach((item) => {
    const category = dateCategory(new Date(item.timestamp));

    if (!(category in binLookup)) {
      const bin = {
        category,
        items: [item],
      };

      binLookup[category] = bin;

      bins.push(bin);
    } else {
      binLookup[category].items.push(item);
    }
  });

  return bins;
}

function dateCategory(date: Date) {
  if (isToday(date)) {
    return '今日';
  }

  if (isYesterday(date)) {
    return '昨日';
  }

  if (isThisWeek(date)) {
    // 例: "月曜日"
    return format(date, 'eeee', { locale: undefined });
  }

  const thirtyDaysAgo = subDays(new Date(), 30);

  if (isAfter(date, thirtyDaysAgo)) {
    return '直近 30 日';
  }

  if (isThisYear(date)) {
    // 例: "7月"
    return format(date, 'M月');
  }

  // 例: "2023年7月"
  return format(date, 'yyyy年M月');
}
