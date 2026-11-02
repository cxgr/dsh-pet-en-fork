/**
 * 待办的展示格式化：到期时间、相对剩余与紧迫度。
 *
 * 纯函数，当前时刻由调用方传入；面板渲染、排序后的副标题与测试共用这一份口径。
 * 不负责取数与时区换算：`datetime-local` 的读写都按浏览器本地时区，与用户看到的一致。
 * @module dsh-pet/src/shared/todo/format
 */
import type { TodoItem } from './types.ts';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** 紧迫度：面板据此染色，overdue 最红、undated 最淡。 */
export type TodoUrgency = 'overdue' | 'soon' | 'today' | 'later' | 'undated';

/** 星期名，索引与 Date.getDay() 对齐。 */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** 月份缩写，索引与 Date.getMonth() 对齐。 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** 两位补零。 */
function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 当天零点的时间戳：跨日比较用它，避开夏令时造成的 23/25 小时日。 */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** 两个时刻相差几个自然日（按本地日历，向前为负）。 */
function dayDiff(target: Date, base: Date): number {
  return Math.round((startOfDay(target) - startOfDay(base)) / DAY_MS);
}

/**
 * 把毫秒差写成人话。
 *
 * @param ms - 时长（非负；负数先取绝对值），不足一分钟按一分钟算。
 * @returns 例如「25 min」「3 h」「2 d」。
 */
export function spanText(ms: number): string {
  const minutes = Math.max(1, Math.round(Math.abs(ms) / MINUTE_MS));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.max(1, Math.round(minutes / 60));
  if (hours < 24) return `${hours} h`;
  return `${Math.max(1, Math.round(hours / 24))} d`;
}

/**
 * 到期时刻的绝对说法（不含「还剩多久」）。
 *
 * @param dueAt - 到期时刻；null 表示没有期限。
 * @param now - 当前时刻。
 * @returns 「Today 18:00」「Tomorrow 09:00」「Fri 20:00」「Nov 3 09:00」「No due date」。
 */
export function dueLabel(dueAt: number | null, now: number): string {
  if (dueAt === null) return 'No due date';
  const due = new Date(dueAt);
  const clock = `${pad2(due.getHours())}:${pad2(due.getMinutes())}`;
  const days = dayDiff(due, new Date(now));
  if (days === 0) return `Today ${clock}`;
  if (days === 1) return `Tomorrow ${clock}`;
  if (days === 2) return `In 2 days ${clock}`;
  if (days > 2 && days < 7) return `${WEEKDAYS[due.getDay()]} ${clock}`;
  return `${MONTHS[due.getMonth()]} ${due.getDate()} ${clock}`;
}

/**
 * 相对说法：还剩多久 / 已逾期多久。
 *
 * @param dueAt - 到期时刻；null（无期限）时返回空串。
 * @param now - 当前时刻。
 * @returns 「2 h left」「Overdue by 3 d」或 `''`。
 */
export function remainingLabel(dueAt: number | null, now: number): string {
  if (dueAt === null) return '';
  if (dueAt <= now) return `Overdue by ${spanText(now - dueAt)}`;
  return `${spanText(dueAt - now)} left`;
}

/**
 * 紧迫度：只有「未完成」的待办才有意义。
 *
 * @param dueAt - 到期时刻；null = 无期限。
 * @param now - 当前时刻。
 * @returns 6 小时内为 soon，24 小时内为 today，更远为 later。
 */
export function todoUrgency(dueAt: number | null, now: number): TodoUrgency {
  if (dueAt === null) return 'undated';
  const remaining = dueAt - now;
  if (remaining <= 0) return 'overdue';
  if (remaining <= 6 * HOUR_MS) return 'soon';
  if (remaining <= DAY_MS) return 'today';
  return 'later';
}

/**
 * 一条待办在列表里的副标题。
 *
 * @param todo - 待办本体。
 * @param now - 当前时刻。
 * @returns 已完成 → 「Done」/「Done · Today 18:00」；未完成 → 「Today 18:00 · 2 h left」。
 */
export function metaLabel(todo: TodoItem, now: number): string {
  if (todo.done) {
    return todo.dueAt === null ? 'Done' : `Done · ${dueLabel(todo.dueAt, now)}`;
  }
  if (todo.dueAt === null) return 'No due date';
  const relative = remainingLabel(todo.dueAt, now);
  if (todo.dueAt <= now) return relative;
  return `${dueLabel(todo.dueAt, now)} · ${relative}`;
}

/**
 * 把时间戳写成 `datetime-local` 输入框认的本地字符串。
 *
 * @param ms - epoch 毫秒。
 * @returns `YYYY-MM-DDTHH:mm`（本地时区）。
 */
export function formatDateTimeLocal(ms: number): string {
  const date = new Date(ms);
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  );
}

/**
 * 读 `datetime-local` 的值；空串表示「没有期限」。
 *
 * @param value - 输入框的值，形如 `YYYY-MM-DDTHH:mm`。
 * @returns epoch 毫秒；空串、格式非法或日期不存在（如 2 月 30 日）时返回 null。
 */
export function parseDateTimeLocal(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  // 组件回读校验：2 月 30 日会被 Date 滚到 3 月，这里把它判成非法而不是悄悄改期。
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.getTime();
}
