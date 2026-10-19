#!/usr/bin/env node
/**
 * ziwei-time CLI
 *   ziwei-time --date 2002-07-07 --time 05:05 --city 洛杉矶
 *   ziwei-time --date 1972-11-08 --time 00:36 --city 成都 --json
 */
import { trueSolarTime, resolveTimezone, cityCoords } from './src/index.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key === 'json' || key === 'help' || key === 'no-eot') { out[key] = true; continue; }
    out[key] = argv[i + 1];
    i += 1;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.date || !args.time) {
  console.log(`ziwei-time —— 真太阳时换算

用法:
  ziwei-time --date 2002-07-07 --time 05:05 --city 洛杉矶
  ziwei-time --date 2002-07-07 --time 05:05 --lon -118.24 --tz America/Los_Angeles

参数:
  --date   YYYY-MM-DD   出生地钟面日期（必填）
  --time   HH:mm        出生地钟面时间（必填）
  --city   城市名       已收录城市可直接用中文名
  --lon    经度         东经正、西经负（城市未收录时用）
  --tz     IANA 时区    如 America/Los_Angeles
  --no-eot 不计均时差
  --json   输出完整 JSON
`);
  process.exit(args.help ? 0 : 1);
}

if (args.city && !args.lon && !cityCoords(args.city) && !resolveTimezone(args.city)) {
  console.error(`城市「${args.city}」未收录，请改用 --lon 传经度。`);
  process.exit(2);
}

try {
  const result = trueSolarTime({
    date: args.date,
    time: args.time,
    city: args.city,
    longitude: args.lon ? Number(args.lon) : undefined,
    timezone: args.tz,
    equationOfTime: !args['no-eot'],
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const shift = result.dayShift === 0 ? '' : `（${result.dayShift > 0 ? '进' : '退'} ${Math.abs(result.dayShift)} 天）`;
    console.log(`民用时    ${result.civil.date} ${result.civil.time}${result.timezone ? `  ${result.timezone}` : ''}`);
    console.log(`真太阳时  ${result.trueSolar.date} ${result.trueSolar.time}${shift}`);
    console.log(`时刻      ${result.branch}时${result.lateZi ? '（晚子时）' : ''}   timeIndex=${result.timeIndex}`);
    console.log(`修正      ${result.correctionMinutes >= 0 ? '+' : ''}${result.correctionMinutes} 分钟  ` +
      `[经度 ${result.longitudeMinutes >= 0 ? '+' : ''}${result.longitudeMinutes}` +
      ` / 均时差 ${result.eotMinutes >= 0 ? '+' : ''}${result.eotMinutes}` +
      `${result.dstMinutes ? ` / 夏令时 -${result.dstMinutes}` : ''}]`);
  }
} catch (err) {
  console.error(`错误：${err.message}`);
  process.exit(3);
}
