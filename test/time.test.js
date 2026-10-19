import test from 'node:test';
import assert from 'node:assert/strict';
import {
  trueSolarTime, hourBranch, resolveTimezone, cityCoords,
  tzOffsetMinutes, chinaDstMinutes, equationOfTime, BRANCHES,
} from '../src/index.js';

/* ================= 锚点case：都是被独立验证过的真实盘 ================= */

test('洛杉矶 2002-07-07 05:05 —— PDT 夏令时下算错一档时辰的经典case', () => {
  const r = trueSolarTime({ date: '2002-07-07', time: '05:05', city: '洛杉矶' });
  // 钟面 05:05 PDT；真太阳时退到 04:07，落寅时（不含 DST 的旧口径会落在卯时，命宫差两宫）
  assert.equal(r.timezone, 'America/Los_Angeles');
  assert.equal(r.path, 'iana');
  // 与生产链路实测一致：04:08（历史文档曾写 04:07，差 1 分钟，同属寅时）
  assert.equal(r.trueSolar.time, '04:08');
  assert.equal(r.correctionMinutes, -57);
  assert.equal(r.branch, '寅');
  assert.equal(r.branchIndex, 2);
  assert.equal(r.dayShift, 0);
});

test('成都 1972-11-08 00:36 —— 真太阳时退到前一日晚子时', () => {
  const r = trueSolarTime({ date: '1972-11-08', time: '00:36', city: '成都' });
  assert.equal(r.trueSolar.date, '1972-11-07');
  assert.equal(r.trueSolar.time, '23:48');
  assert.equal(r.dayShift, -1);
  assert.equal(r.lateZi, true);
  assert.equal(r.timeIndex, 12);
});

test('乌鲁木齐 01:30 —— 跨日必须退日，不能被截断到当日 00:00', () => {
  const r = trueSolarTime({ date: '1990-03-15', time: '01:30', city: '乌鲁木齐' });
  assert.equal(r.trueSolar.date, '1990-03-14');
  assert.equal(r.trueSolar.time, '23:11');
  assert.equal(r.lateZi, true);
});

/* ================= 时区与夏令时 ================= */

test('中国内地 1986–1991 夏令时：1988-06-15 12:00 上海先回退 1 小时', () => {
  const inDst = trueSolarTime({ date: '1988-06-15', time: '12:00', city: '上海' });
  const noDst = trueSolarTime({ date: '1988-12-15', time: '12:00', city: '上海' });
  assert.equal(inDst.dstMinutes, 60);
  assert.equal(noDst.dstMinutes, 0);
  // 夏令时期间钟面 12:00 = 标准时 11:00，真太阳时因此比同经度的冬令时再退 1 小时
  assert.equal(inDst.trueSolar.time, '11:05');
  assert.equal(noDst.trueSolar.time, '12:10');
  assert.equal(inDst.correctionMinutes, -55);
  assert.equal(noDst.correctionMinutes, 10);
});

test('夏令时起止边界：起始日 01:59 未生效、02:00 生效', () => {
  assert.equal(chinaDstMinutes(1986, 5, 4, 1, 59), 0);
  assert.equal(chinaDstMinutes(1986, 5, 4, 2, 0), 60);
  assert.equal(chinaDstMinutes(1986, 9, 14, 1, 59), 60);
  assert.equal(chinaDstMinutes(1986, 9, 14, 2, 0), 0);
  assert.equal(chinaDstMinutes(1992, 6, 1, 12, 0), 0); // 1992 已废止
});

test('南半球夏令时方向相反：悉尼 1 月为 UTC+11、7 月为 UTC+10', () => {
  const jan = tzOffsetMinutes(Date.UTC(2024, 0, 15, 0, 0), 'Australia/Sydney');
  const jul = tzOffsetMinutes(Date.UTC(2024, 6, 15, 0, 0), 'Australia/Sydney');
  assert.equal(jan, 660);
  assert.equal(jul, 600);
});

test('IANA 时区反解覆盖历史规则：1985 年纽约仍在 4 月末切换', () => {
  // 1985 年美国夏令时自 4 月最后一个周日（4-28）开始
  assert.equal(tzOffsetMinutes(Date.UTC(1985, 3, 1, 12, 0), 'America/New_York'), -300);
  assert.equal(tzOffsetMinutes(Date.UTC(1985, 4, 1, 12, 0), 'America/New_York'), -240);
});

/* ================= 时辰与晚子时 ================= */

test('时辰边界：左闭右开，23:00 起为晚子时', () => {
  assert.deepEqual(hourBranch(0, 0), { branch: '子', branchIndex: 0, timeIndex: 0, lateZi: false });
  assert.equal(hourBranch(0, 59).branch, '子');
  assert.equal(hourBranch(1, 0).branch, '丑');
  assert.equal(hourBranch(2, 59).branch, '丑');
  assert.equal(hourBranch(3, 0).branch, '寅');
  assert.equal(hourBranch(12, 0).branch, '午');
  assert.equal(hourBranch(22, 59).branch, '亥');
  assert.deepEqual(hourBranch(23, 0), { branch: '子', branchIndex: 0, timeIndex: 12, lateZi: true });
  assert.equal(hourBranch(23, 59).lateZi, true);
});

test('十二时辰名称完整', () => {
  assert.equal(BRANCHES.length, 12);
  assert.equal(BRANCHES.join(''), '子丑寅卯辰巳午未申酉戌亥');
});

/* ================= 城市解析 ================= */

test('重名城市必须带大洲，否则拒绝解析而不是猜', () => {
  assert.equal(resolveTimezone('圣地亚哥'), null);
  assert.equal(resolveTimezone('北美洲 圣地亚哥'), 'America/Los_Angeles');
  assert.equal(resolveTimezone('南美洲 圣地亚哥'), 'America/Santiago');
});

test('城市名可带后缀（如「上海市」「Los Angeles」忽略尾缀）', () => {
  assert.equal(resolveTimezone('日本东京'), 'Asia/Tokyo');
  assert.deepEqual(cityCoords('成都市'), [104.07, 30.57]);
});

test('未收录城市且无经度 → 明确报错，不静默猜测', () => {
  assert.throws(
    () => trueSolarTime({ date: '2000-01-01', time: '12:00', city: '某某县' }),
    /无法确定/,
  );
});

/* ================= 均时差 ================= */

test('均时差：2 月中旬最负（约 -14 分），11 月初最正（约 +16 分）', () => {
  assert.ok(equationOfTime(2024, 2, 11) < -13.5);
  assert.ok(equationOfTime(2024, 11, 3) > 15.5);
});

test('关掉均时差后只剩经度差', () => {
  const withEot = trueSolarTime({ date: '2024-11-03', time: '12:00', city: '成都' });
  const without = trueSolarTime({ date: '2024-11-03', time: '12:00', city: '成都', equationOfTime: false });
  assert.equal(without.eotMinutes, 0);
  // 取整各自独立，允许 ±1 分钟
  assert.ok(Math.abs((withEot.correctionMinutes - without.correctionMinutes) - withEot.eotMinutes) <= 1);
});
