/**
 * ziwei-time —— 真太阳时与时辰换算
 *
 * 本库只做一件事：把「出生地钟面上写的那一刻」换算成「当地真太阳时」，
 * 并给出对应的时辰（含晚子时裁决）。不排盘、不论命、不含任何吉凶规则。
 *
 * 三条换算路径，按优先级：
 *   1. IANA 时区（海外 / 港澳台）—— 走 tz database，夏令时规则自动生效
 *   2. 中国内地 —— 民用时恒为 UTC+8（120°E），1986–1991 夏令时单独回退
 *   3. 无时区只有经纬度 —— 按 15° 整数倍中央经线估算，误差 ≤ 1h
 *
 * @see docs/caliber.md 口径与误差说明
 */

import { TZ_BY_CITY, TZ_BY_REGION_CITY, CITY_COORDS, CN_DST } from './data.js';

/** 十二地支（时辰名） */
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 中国标准时基准子午线（东经 120°） */
const CN_MERIDIAN = 120;

/* ------------------------------------------------------------------ *
 * 时区解析
 * ------------------------------------------------------------------ */

/**
 * 城市名 → IANA 时区。未收录返回 null。
 * 重名城市（如圣地亚哥）必须带大洲前缀，否则返回 null，避免静默算错。
 * @param {string} location
 * @returns {string|null}
 */
export function resolveTimezone(location) {
  if (!location) return null;
  const s = String(location).trim();
  for (const key of Object.keys(TZ_BY_REGION_CITY)) {
    if (s.includes(key)) return TZ_BY_REGION_CITY[key];
  }
  // 「圣地亚哥」不带大洲 → 有歧义，拒绝解析，交由调用方补全或改传经纬度
  if (s.includes('圣地亚哥')) return null;
  for (const key of Object.keys(TZ_BY_CITY)) {
    if (s.includes(key)) return TZ_BY_CITY[key];
  }
  return null;
}

/**
 * 城市名 → [经度, 纬度]。未收录返回 null。
 * @param {string} city
 * @returns {[number, number]|null}
 */
export function cityCoords(city) {
  if (!city) return null;
  const s = String(city).trim();
  for (const key of Object.keys(CITY_COORDS)) {
    if (s.includes(key)) return CITY_COORDS[key];
  }
  return null;
}

/**
 * 某一瞬间在某 IANA 时区下的民用时偏移（分钟）。如 PDT = -420、PST = -480。
 * 用 Intl 反解，不依赖第三方时区库。失败返回 null。
 * @param {number} utcMs
 * @param {string} timeZone
 * @returns {number|null}
 */
export function tzOffsetMinutes(utcMs, timeZone) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = {};
    dtf.formatToParts(new Date(utcMs)).forEach((p) => {
      if (p.type !== 'literal') parts[p.type] = p.value;
    });
    const asUTC = Date.UTC(
      +parts.year, +parts.month - 1, +parts.day,
      (+parts.hour) % 24, +parts.minute, +parts.second,
    );
    return Math.round((asUTC - utcMs) / 60000);
  } catch {
    return null;
  }
}

/**
 * 中国内地 1986–1991 夏令时：该时刻处于夏令时则返回 60 分钟，否则 0。
 * @param {number} year @param {number} month 1-12 @param {number} day
 * @param {number} hour @param {number} minute
 * @returns {0|60}
 */
export function chinaDstMinutes(year, month, day, hour, minute) {
  const window = CN_DST[year];
  if (!window) return 0;
  const cur = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (cur < window[0] || cur > window[1]) return 0;
  const mins = hour * 60 + minute;
  if (cur === window[0] && mins < 120) return 0;   // 起始日 02:00 前仍是标准时
  if (cur === window[1] && mins >= 120) return 0;  // 结束日 02:00 后已回到标准时
  return 60;
}

/* ------------------------------------------------------------------ *
 * 天文量
 * ------------------------------------------------------------------ */

/**
 * 均时差（equation of time），单位分钟。正值表示真太阳时快于平太阳时。
 *
 * 采用工程近似式（Spencer 型一阶式），全年误差约 ±20 秒，
 * 远小于时辰切换的 2 小时刻度，不影响时辰判定。
 *
 * @param {number} year @param {number} month 1-12 @param {number} day
 * @returns {number} 分钟（带小数）
 */
export function equationOfTime(year, month, day) {
  const monthDays = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) monthDays[2] = 29;
  let dayOfYear = day;
  for (let i = 1; i < month; i += 1) dayOfYear += monthDays[i];
  const B = (360.0 * (dayOfYear - 81)) / 365.0;
  const rad = (B * Math.PI) / 180.0;
  return 9.87 * Math.sin(2 * rad) - 7.53 * Math.cos(rad) - 1.5 * Math.sin(rad);
}

/* ------------------------------------------------------------------ *
 * 时辰
 * ------------------------------------------------------------------ */

/**
 * 钟面时刻 → 时辰。
 *
 * 晚子时口径（关键）：23:00–23:59 属**当日晚子时**，不折算成「次日早子时」。
 * 返回的 timeIndex 采用 0–11 为子丑寅…亥、12 为晚子时（与 iztro 的 timeIndex 对齐）。
 *
 * @param {number} hour 0-23
 * @param {number} minute 0-59
 * @returns {{branch: string, branchIndex: number, timeIndex: number, lateZi: boolean}}
 */
export function hourBranch(hour, minute = 0) {
  const total = hour * 60 + minute;
  if (total >= 23 * 60) {
    return { branch: '子', branchIndex: 0, timeIndex: 12, lateZi: true };
  }
  // 早子时 00:00–00:59 与 01:00–02:59 的丑时之间，边界取左闭右开
  const starts = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
  let idx = 0;
  for (let i = 0; i < starts.length; i += 1) {
    if (total >= starts[i] * 60) idx = i;
  }
  return { branch: BRANCHES[idx], branchIndex: idx, timeIndex: idx, lateZi: false };
}

/* ------------------------------------------------------------------ *
 * 主函数
 * ------------------------------------------------------------------ */

function pad2(n) {
  return String(n).padStart(2, '0');
}

function assertDateParts(year, month, day, hour, minute) {
  if (!(year >= 1000 && year <= 9999)) throw new RangeError(`年份不合法：${year}`);
  if (!(month >= 1 && month <= 12)) throw new RangeError(`月份不合法：${month}`);
  if (!(day >= 1 && day <= 31)) throw new RangeError(`日期不合法：${day}`);
  if (!(hour >= 0 && hour <= 23)) throw new RangeError(`小时不合法：${hour}（应为 0–23）`);
  if (!(minute >= 0 && minute <= 59)) throw new RangeError(`分钟不合法：${minute}（应为 0–59）`);
}

/**
 * 民用钟面时刻 → 真太阳时。
 *
 * @param {object} opts
 * @param {string} opts.date        出生地钟面日期，'YYYY-MM-DD'
 * @param {string} opts.time        出生地钟面时间，'HH:mm'
 * @param {string} [opts.city]      城市名（中文即可）。与 longitude 二选一
 * @param {string} [opts.timezone]  IANA 时区，优先于 city（如 'America/Los_Angeles'）
 * @param {number} [opts.longitude] 经度，东经为正、西经为负
 * @param {number} [opts.latitude]  纬度（仅在缺经度时用于推断，可省略）
 * @param {boolean} [opts.equationOfTime=true] 是否计入均时差；关掉可复现「只按经度」的旧口径
 * @returns {{
 *   civil: {date: string, time: string, minutes: number},
 *   trueSolar: {date: string, time: string, hour: number, minute: number},
 *   correctionMinutes: number, longitudeMinutes: number, eotMinutes: number, dstMinutes: number,
 *   timezone: string|null, longitude: number, path: 'iana' | 'meridian',
 *   branch: string, branchIndex: number, timeIndex: number, lateZi: boolean, dayShift: number
 * }}
 */
export function trueSolarTime(opts = {}) {
  const { date, time } = opts;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new TypeError("date 需为 'YYYY-MM-DD' 字符串");
  }
  if (typeof time !== 'string' || !/^\d{1,2}:\d{2}$/.test(time)) {
    throw new TypeError("time 需为 'HH:mm' 字符串");
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  assertDateParts(year, month, day, hour, minute);

  // —— 时区与经度 ——
  let timezone = opts.timezone || resolveTimezone(opts.city) || null;
  let longitude = typeof opts.longitude === 'number' ? opts.longitude : null;
  if (longitude === null && opts.city) {
    const coords = cityCoords(opts.city);
    if (coords) longitude = coords[0];
  }
  if (longitude === null) {
    throw new TypeError(`无法确定 "${opts.city || ''}" 的经度：请传入已收录城市，或直接给 longitude`);
  }
  if (longitude < -180 || longitude > 180) throw new RangeError(`经度不合法：${longitude}`);

  const useEot = opts.equationOfTime !== false;
  const baseMin = hour * 60 + minute;
  const eot = useEot ? equationOfTime(year, month, day) : 0;

  /* —— 路径 1：IANA 时区（民用时 → UTC → 当地真太阳时）—— */
  if (timezone) {
    let guess = Date.UTC(year, month - 1, day, hour, minute);
    let offset = tzOffsetMinutes(guess, timezone);
    if (offset !== null) {
      // 二次收敛：防止出生时刻刚好落在夏令时切换边界上取错偏移
      let utcMs = guess - offset * 60000;
      offset = tzOffsetMinutes(utcMs, timezone);
      utcMs = guess - offset * 60000;
      const d = new Date(utcMs);
      const total = d.getUTCHours() * 60 + d.getUTCMinutes() + longitude * 4.0 + eot;
      const rounded = Math.round(total);
      const norm = normalizeMinutes(rounded, year, month, day);
      const branchInfo = hourBranch(norm.hour, norm.minute);
      return {
        civil: { date, time: `${pad2(hour)}:${pad2(minute)}`, minutes: baseMin },
        trueSolar: {
          date: norm.date,
          time: `${pad2(norm.hour)}:${pad2(norm.minute)}`,
          hour: norm.hour,
          minute: norm.minute,
        },
        correctionMinutes: rounded - baseMin,
        longitudeMinutes: round1(longitude * 4.0 - CN_MERIDIAN * 4.0),
        eotMinutes: round1(eot),
        dstMinutes: 0,
        timezone,
        longitude,
        path: 'iana',
        dayShift: norm.dayShift,
        ...branchInfo,
      };
    }
    // Intl 不可用 → 落回路径 2/3
  }

  /* —— 路径 2 / 3：中央经线口径 —— */
  const isMainland = longitude >= 73 && longitude <= 135;
  const baseMeridian = isMainland ? CN_MERIDIAN : Math.round(longitude / 15) * 15;
  const longitudeMinutes = (longitude - baseMeridian) * 4.0;
  // 内地 1986–1991 夏令时：钟面值先还原标准时
  const dstMinutes = isMainland && !timezone ? chinaDstMinutes(year, month, day, hour, minute) : 0;
  const totalCorr = longitudeMinutes + eot - dstMinutes;
  const norm = normalizeMinutes(baseMin + Math.round(totalCorr), year, month, day);
  const branchInfo = hourBranch(norm.hour, norm.minute);

  return {
    civil: { date, time: `${pad2(hour)}:${pad2(minute)}`, minutes: baseMin },
    trueSolar: {
      date: norm.date,
      time: `${pad2(norm.hour)}:${pad2(norm.minute)}`,
      hour: norm.hour,
      minute: norm.minute,
    },
    correctionMinutes: Math.round(totalCorr),
    longitudeMinutes: round1(longitudeMinutes),
    eotMinutes: round1(eot),
    dstMinutes,
    timezone: timezone || null,
    longitude,
    path: 'meridian',
    dayShift: norm.dayShift,
    ...branchInfo,
  };
}

/** 分钟数归一到 [0,1440)，并算出跨日位移（真太阳时会跨日，不能截断） */
function normalizeMinutes(totalMinutes, year, month, day) {
  let total = totalMinutes;
  let dayShift = 0;
  while (total < 0) { total += 1440; dayShift -= 1; }
  while (total >= 1440) { total -= 1440; dayShift += 1; }
  let y = year; let mo = month; let da = day;
  if (dayShift !== 0) {
    const dt = new Date(Date.UTC(year, month - 1, day));
    dt.setUTCDate(dt.getUTCDate() + dayShift);
    y = dt.getUTCFullYear(); mo = dt.getUTCMonth() + 1; da = dt.getUTCDate();
  }
  return {
    hour: Math.floor(total / 60),
    minute: total % 60,
    dayShift,
    date: `${y}-${pad2(mo)}-${pad2(da)}`,
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
