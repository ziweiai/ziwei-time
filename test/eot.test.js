/**
 * 均时差精度回归 —— 以紫金山天文台（国家天文台系统）公开发布值为基准。
 *
 * 这组测试是「真太阳时是否可信」的总闸门：
 * 只要有一条不过，说明天文层算错了，真太阳时与时辰判定都不可信。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { equationOfTime, equationOfTimeApprox, julianDay } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(readFileSync(join(here, 'eot-baseline.json'), 'utf8'));

const toSeconds = (y, m, d) => equationOfTime(y, m, d) * 60;

test('儒略日：J2000.0 标准点', () => {
  // 2000-01-01 12:00 UT 应为 2451545.0
  assert.ok(Math.abs(julianDay(2000, 1, 1, 12) - 2451545.0) < 1e-6);
  // 1900-01-01 00:00 UT = 2415020.5
  assert.ok(Math.abs(julianDay(1900, 1, 1, 0) - 2415020.5) < 1e-6);
});

test('对紫金山天文台基准点逐点校验', () => {
  const fails = [];
  for (const p of baseline.points) {
    const [y, m, d] = p.date.split('-').map(Number);
    const got = toSeconds(y, m, d);
    const diff = Math.abs(got - p.eot_seconds);
    if (diff > p.tolerance_seconds) {
      fails.push(
        `${p.date} 基准 ${p.eot_seconds}s（${p.stated}）实算 ${got.toFixed(1)}s 偏差 ${diff.toFixed(1)}s > 容差 ${p.tolerance_seconds}s`,
      );
    }
  }
  assert.deepEqual(fails, [], `基准校验失败：\n${fails.join('\n')}`);
});

test('官方两点必须达到 1 秒内（核心断言）', () => {
  const official = baseline.points.filter((p) => p.confidence === 'official');
  assert.ok(official.length >= 2, '基准文件应包含至少 2 个官方点');
  for (const p of official) {
    const [y, m, d] = p.date.split('-').map(Number);
    const diff = Math.abs(toSeconds(y, m, d) - p.eot_seconds);
    assert.ok(diff < 1.0, `${p.date} 与官方值差 ${diff.toFixed(2)}s，超过 1 秒`);
  }
});

test('全年极值落在 −14.5 ~ +16.5 分钟', () => {
  for (const year of [1950, 1986, 2000, 2024, 2033, 2088]) {
    let lo = Infinity;
    let hi = -Infinity;
    const start = Date.UTC(year, 0, 1);
    for (let i = 0; i < 366; i += 1) {
      const d = new Date(start + i * 86400000);
      if (d.getUTCFullYear() !== year) break;
      const v = equationOfTime(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    assert.ok(
      lo >= baseline.extremes.min_minutes && hi <= baseline.extremes.max_minutes,
      `${year} 极值 [${lo.toFixed(2)}, ${hi.toFixed(2)}] 越界`,
    );
  }
});

test('1900–2100 全区间无 NaN、值域合法', () => {
  for (let y = 1900; y <= 2100; y += 1) {
    for (const [m, d] of [[1, 1], [3, 20], [6, 21], [9, 23], [12, 31]]) {
      const v = equationOfTime(y, m, d);
      assert.ok(Number.isFinite(v), `${y}-${m}-${d} 返回 ${v}`);
      assert.ok(v > -15 && v < 17, `${y}-${m}-${d} 值 ${v} 超出物理范围`);
    }
  }
});

test('一日内漂移量级正确（分点前后最大，约 15 秒）', () => {
  // 均时差不是常数：太阳赤经变化最快时（春秋分前后）日变化可达 30 秒，
  // 故半日漂移约 15 秒属正常物理现象，不是实现误差。
  // 这条测试的真正作用：确认漂移量级在秒级而非分钟级（防量纲错误），
  // 同时说明「按日期 12:00 取值」与「按 UTC 时刻取值」最多差 ~8 秒。
  let maxSpread = 0;
  const start = Date.UTC(2024, 0, 1);
  for (let i = 0; i < 366; i += 1) {
    const d = new Date(start + i * 86400000);
    if (d.getUTCFullYear() !== 2024) break;
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const dd = d.getUTCDate();
    const a = equationOfTime(y, m, dd, 0);
    const b = equationOfTime(y, m, dd, 12);
    const c = equationOfTime(y, m, dd, 23.99);
    const spread = Math.max(a, c) - Math.min(a, c);
    if (spread > maxSpread) maxSpread = spread;
  }
  const sec = maxSpread * 60;
  assert.ok(sec > 5, `最大日漂移 ${sec.toFixed(1)}s 过小，疑似时间项未生效`);
  assert.ok(sec < 45, `最大日漂移 ${sec.toFixed(1)}s 过大，超出物理范围（应 < 约 30s）`);
});

test('回归保护：旧近似式确实偏差过大（换算法的依据）', () => {
  let worst = 0;
  const start = Date.UTC(2024, 0, 1);
  for (let i = 0; i < 366; i += 1) {
    const d = new Date(start + i * 86400000);
    if (d.getUTCFullYear() !== 2024) break;
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const dd = d.getUTCDate();
    const diff = Math.abs(equationOfTimeApprox(y, m, dd) - equationOfTime(y, m, dd)) * 60;
    if (diff > worst) worst = diff;
  }
  // 实测 2024 年最大偏差约 65 秒；断言"旧式确实超过 40 秒"，防止有人误把生产路径换回近似式
  assert.ok(worst > 40, `旧近似式最大偏差仅 ${worst.toFixed(1)}s，基准可能已变，请复核`);
});
