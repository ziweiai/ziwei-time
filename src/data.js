/**
 * 时区与坐标数据表
 *
 * 设计原则：
 * 1. 中国内地城市**不进 TZ 表** —— 内地民用时恒为北京时间（UTC+8），
 *    真太阳时由「经度差 + 均时差」算出，与产物口径完全一致；
 *    1986–1991 夏令时由 CN_DST 表单独处理。
 * 2. 港澳台自有 tz 记录（历史上另有夏令时规则），故单列 IANA 时区。
 * 3. 海外城市一律走 IANA 时区 —— 这是本库存在的理由：北美/欧洲/南半球
 *    的夏令时规则用「中央经线估算」永远算不对。
 */

/** 城市名 → IANA 时区（仅海外 + 港澳台；内地不列，见文件头） */
export const TZ_BY_CITY = {
  /* 中国香港 / 中国澳门 / 中国台湾 */
  '香港': 'Asia/Hong_Kong', '澳门': 'Asia/Macau', '台北': 'Asia/Taipei',
  '高雄': 'Asia/Taipei', '台中': 'Asia/Taipei', '台南': 'Asia/Taipei',

  /* 亚洲 */
  '东京': 'Asia/Tokyo', '大阪': 'Asia/Tokyo', '京都': 'Asia/Tokyo', '名古屋': 'Asia/Tokyo',
  '福冈': 'Asia/Tokyo', '札幌': 'Asia/Tokyo', '那霸': 'Asia/Tokyo',
  '首尔': 'Asia/Seoul', '釜山': 'Asia/Seoul', '济州': 'Asia/Seoul',
  '新加坡': 'Asia/Singapore',
  '吉隆坡': 'Asia/Kuala_Lumpur', '槟城': 'Asia/Kuala_Lumpur', '新山': 'Asia/Kuala_Lumpur',
  '曼谷': 'Asia/Bangkok', '清迈': 'Asia/Bangkok', '普吉': 'Asia/Bangkok',
  '雅加达': 'Asia/Jakarta', '泗水': 'Asia/Jakarta', '万隆': 'Asia/Jakarta', '棉兰': 'Asia/Jakarta',
  '马尼拉': 'Asia/Manila', '宿务': 'Asia/Manila',
  '河内': 'Asia/Ho_Chi_Minh', '胡志明市': 'Asia/Ho_Chi_Minh',
  '仰光': 'Asia/Yangon', '金边': 'Asia/Phnom_Penh', '万象': 'Asia/Vientiane',
  '迪拜': 'Asia/Dubai', '阿布扎比': 'Asia/Dubai', '特拉维夫': 'Asia/Jerusalem',
  '孟买': 'Asia/Kolkata', '新德里': 'Asia/Kolkata', '班加罗尔': 'Asia/Kolkata',
  '伊斯坦布尔': 'Europe/Istanbul', '阿拉木图': 'Asia/Almaty', '乌兰巴托': 'Asia/Ulaanbaatar',

  /* 欧洲 */
  '伦敦': 'Europe/London', '曼彻斯特': 'Europe/London', '爱丁堡': 'Europe/London', '伯明翰': 'Europe/London',
  '巴黎': 'Europe/Paris', '里昂': 'Europe/Paris', '马赛': 'Europe/Paris',
  '柏林': 'Europe/Berlin', '慕尼黑': 'Europe/Berlin', '法兰克福': 'Europe/Berlin',
  '汉堡': 'Europe/Berlin', '杜塞尔多夫': 'Europe/Berlin',
  '阿姆斯特丹': 'Europe/Amsterdam', '鹿特丹': 'Europe/Amsterdam', '布鲁塞尔': 'Europe/Brussels',
  '苏黎世': 'Europe/Zurich', '日内瓦': 'Europe/Zurich', '维也纳': 'Europe/Vienna',
  '罗马': 'Europe/Rome', '米兰': 'Europe/Rome', '佛罗伦萨': 'Europe/Rome', '威尼斯': 'Europe/Rome',
  '马德里': 'Europe/Madrid', '巴塞罗那': 'Europe/Madrid', '里斯本': 'Europe/Lisbon',
  '斯德哥尔摩': 'Europe/Stockholm', '哥德堡': 'Europe/Stockholm', '奥斯陆': 'Europe/Oslo',
  '哥本哈根': 'Europe/Copenhagen', '赫尔辛基': 'Europe/Helsinki', '华沙': 'Europe/Warsaw',
  '布拉格': 'Europe/Prague', '布达佩斯': 'Europe/Budapest', '布加勒斯特': 'Europe/Bucharest',
  '莫斯科': 'Europe/Moscow', '圣彼得堡': 'Europe/Moscow', '基辅': 'Europe/Kyiv',
  '雅典': 'Europe/Athens', '都柏林': 'Europe/Dublin', '卢森堡': 'Europe/Luxembourg',

  /* 北美洲 */
  '纽约': 'America/New_York', '波士顿': 'America/New_York', '华盛顿': 'America/New_York',
  '费城': 'America/New_York', '迈阿密': 'America/New_York', '亚特兰大': 'America/New_York',
  '底特律': 'America/New_York',
  '多伦多': 'America/Toronto', '渥太华': 'America/Toronto', '蒙特利尔': 'America/Toronto',
  '温哥华': 'America/Vancouver',
  '卡尔加里': 'America/Edmonton', '埃德蒙顿': 'America/Edmonton',
  '芝加哥': 'America/Chicago', '休斯顿': 'America/Chicago', '达拉斯': 'America/Chicago',
  '丹佛': 'America/Denver', '凤凰城': 'America/Phoenix',
  '洛杉矶': 'America/Los_Angeles', '旧金山': 'America/Los_Angeles', '圣何塞': 'America/Los_Angeles',
  '西雅图': 'America/Los_Angeles', '波特兰': 'America/Los_Angeles', '拉斯维加斯': 'America/Los_Angeles',
  '檀香山': 'Pacific/Honolulu', '墨西哥城': 'America/Mexico_City',

  /* 南美洲 */
  '圣保罗': 'America/Sao_Paulo', '里约热内卢': 'America/Sao_Paulo',
  '布宜诺斯艾利斯': 'America/Argentina/Buenos_Aires',
  '利马': 'America/Lima', '波哥大': 'America/Bogota', '基多': 'America/Guayaquil',

  /* 大洋洲 */
  '悉尼': 'Australia/Sydney', '堪培拉': 'Australia/Sydney', '墨尔本': 'Australia/Melbourne',
  '布里斯班': 'Australia/Brisbane', '珀斯': 'Australia/Perth', '阿德莱德': 'Australia/Adelaide',
  '奥克兰': 'Pacific/Auckland', '惠灵顿': 'Pacific/Auckland', '基督城': 'Pacific/Auckland',

  /* 非洲 */
  '约翰内斯堡': 'Africa/Johannesburg', '开普敦': 'Africa/Johannesburg', '开罗': 'Africa/Cairo',
  '内罗毕': 'Africa/Nairobi', '拉各斯': 'Africa/Lagos', '卡萨布兰卡': 'Africa/Casablanca',
  '亚的斯亚贝巴': 'Africa/Addis_Ababa',
};

/**
 * 重名城市：必须带大洲前缀才能消歧。
 * 「圣地亚哥」在北美洲＝加州（美国），在南美洲＝智利首都，两者夏令时规则不同。
 */
export const TZ_BY_REGION_CITY = {
  '北美洲 圣地亚哥': 'America/Los_Angeles',
  '南美洲 圣地亚哥': 'America/Santiago',
};

/**
 * 城市坐标：[经度, 纬度]
 * 取至小数点后 2 位（≈±1 km，时间误差 < 5 秒），足以支撑真太阳时换算。
 * 内地城市只有坐标、没有 tz（见文件头设计原则 1）。
 */
export const CITY_COORDS = {
  /* 中国内地 */
  '北京': [116.41, 39.90], '上海': [121.47, 31.23], '天津': [117.20, 39.13], '重庆': [106.55, 29.56],
  '广州': [113.26, 23.13], '深圳': [114.06, 22.55], '东莞': [113.75, 23.02], '佛山': [113.12, 23.02],
  '珠海': [113.58, 22.27], '成都': [104.07, 30.57], '杭州': [120.16, 30.29], '宁波': [121.55, 29.87],
  '南京': [118.80, 32.06], '苏州': [120.62, 31.32], '无锡': [120.31, 31.49], '武汉': [114.31, 30.60],
  '西安': [108.94, 34.34], '沈阳': [123.43, 41.80], '大连': [121.61, 38.91], '哈尔滨': [126.53, 45.80],
  '长春': [125.32, 43.82], '济南': [117.00, 36.65], '青岛': [120.38, 36.07], '郑州': [113.62, 34.75],
  '长沙': [112.94, 28.23], '南昌': [115.86, 28.68], '合肥': [117.28, 31.86], '福州': [119.30, 26.08],
  '厦门': [118.09, 24.48], '昆明': [102.83, 24.88], '贵阳': [106.63, 26.65], '南宁': [108.37, 22.82],
  '海口': [110.20, 20.04], '三亚': [109.51, 18.25], '兰州': [103.83, 36.06], '西宁': [101.78, 36.62],
  '银川': [106.23, 38.49], '乌鲁木齐': [87.62, 43.82], '拉萨': [91.11, 29.65], '呼和浩特': [111.75, 40.84],
  '太原': [112.55, 37.87], '石家庄': [114.51, 38.04],
  /* 中国香港 / 中国澳门 / 中国台湾 */
  '香港': [114.17, 22.32], '澳门': [113.54, 22.19],
  '台北': [121.56, 25.03], '高雄': [120.31, 22.63], '台中': [120.68, 24.14],
  /* 海外 */
  '东京': [139.69, 35.69], '首尔': [126.98, 37.57], '新加坡': [103.82, 1.35],
  '曼谷': [100.50, 13.75], '吉隆坡': [101.69, 3.14], '雅加达': [106.85, -6.21],
  '马尼拉': [120.98, 14.60], '迪拜': [55.27, 25.20], '孟买': [72.88, 19.08],
  '伦敦': [-0.13, 51.51], '巴黎': [2.35, 48.86], '柏林': [13.40, 52.52],
  '阿姆斯特丹': [4.90, 52.37], '苏黎世': [8.54, 47.38], '罗马': [12.50, 41.90],
  '马德里': [-3.70, 40.42], '莫斯科': [37.62, 55.76],
  '纽约': [-74.01, 40.71], '波士顿': [-71.06, 42.36], '华盛顿': [-77.04, 38.91],
  '洛杉矶': [-118.24, 34.05], '旧金山': [-122.42, 37.77], '西雅图': [-122.33, 47.61],
  '芝加哥': [-87.63, 41.88], '多伦多': [-79.38, 43.65], '温哥华': [-123.12, 49.28],
  '墨西哥城': [-99.13, 19.43], '檀香山': [-157.86, 21.31],
  '圣保罗': [-46.63, -23.55], '布宜诺斯艾利斯': [-58.38, -34.60],
  '悉尼': [151.21, -33.87], '墨尔本': [144.96, -37.81], '珀斯': [115.86, -31.95],
  '奥克兰': [174.76, -36.85],
  '北美洲 圣地亚哥': [-117.16, 32.72], '南美洲 圣地亚哥': [-70.67, -33.45],
};

/**
 * 中国内地夏令时（1986–1991）。
 * 实行期间民用时 = 北京时间 + 1 小时；出生证上写的是夏令时钟面值，
 * 折算真太阳时前必须先还原为标准时（-60 分钟）。
 * 区间取自 IANA tzdata 的 Asia/Shanghai 规则：起始日 02:00 标准时起、结束日 02:00 夏令时止。
 */
export const CN_DST = {
  1986: ['05-04', '09-14'],
  1987: ['04-12', '09-13'],
  1988: ['04-10', '09-11'],
  1989: ['04-16', '09-17'],
  1990: ['04-15', '09-16'],
  1991: ['04-14', '09-15'],
};
