// bizmanager 八王子市総合体育館 ハンドボール講座スクレイパー
// GitHub Actions で定期実行し、data.json を生成する。
// Node.js 18+ （グローバル fetch 利用）

const OFFICE = 30;
const CATEGORY = 111; // ハンドボール
const URL = `https://bizmanager.jp/user/event/list_view?is_search=1&office=${OFFICE}&lecture_category=${CATEGORY}`;

function classify(title) {
  if (title.includes('個人参加')) return '個人参加';
  if (title.includes('女性')) return '女性';
  if (title.includes('大人')) return '大人';
  return 'その他';
}

function parse(html) {
  const events = [];
  const rows = html.split(/<tr[\s>]/i).slice(1);
  for (const row of rows) {
    const idM = row.match(/\/user\/event\/(\d+)\?office=/);
    if (!idM) continue;
    const id = Number(idM[1]);

    const titleM = row.match(/\/user\/event\/\d+\?office=\d+["'][^>]*>([^<]+)</);
    const title = titleM ? titleM[1].trim() : '';
    // ハンドボール講座のみ（保険）
    if (!/ハンドボール|【\d+\/\d+】/.test(title)) continue;

    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
    const j = cells.join(' | ');

    const dateM = j.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    const timeM = j.match(/(\d{1,2}:\d{2}\s*[～~]\s*\d{1,2}:\d{2})/);
    const dowM = j.match(/([日月火水木金土])曜/);
    const priceM = j.match(/([\d,]+)\s*円/);
    const deadM = j.match(/(\d{4}-\d{2}-\d{2})/);

    // 受講料セルの直後が「定員」「残席」の並び
    const capIdx = cells.findIndex(c => /円/.test(c));
    const cap = capIdx >= 0 && cells[capIdx + 1] !== undefined ? Number(cells[capIdx + 1]) : null;
    const left = capIdx >= 0 && cells[capIdx + 2] !== undefined ? Number(cells[capIdx + 2]) : null;

    events.push({
      id,
      title,
      type: classify(title),
      date: dateM ? `${dateM[1]}/${Number(dateM[2])}/${Number(dateM[3])}` : '',
      dow: dowM ? dowM[1] + '曜' : '',
      time: timeM ? timeM[1].replace(/\s/g, '').replace('~', '～') : '',
      price: priceM ? Number(priceM[1].replace(/,/g, '')) : null,
      cap: Number.isFinite(cap) ? cap : null,
      left: Number.isFinite(left) ? left : null,
      deadline: deadM ? deadM[1] : '',
      reserveUrl: `https://bizmanager.jp/user/event/${id}/reserve?office=${OFFICE}`,
    });
  }
  // 開催日で昇順ソート
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  return events;
}

async function main() {
  const res = await fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; handball-events-scraper)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const events = parse(html);

  if (events.length === 0) {
    // 取得0件は構造変化の可能性が高い。既存 data.json は保持して異常終了。
    console.error('WARNING: 0 events parsed. Site structure may have changed.');
    process.exit(2);
  }

  const out = {
    updatedAt: new Date().toISOString(),
    source: URL,
    venue: '八王子市総合体育館',
    count: events.length,
    events,
  };

  const fs = require('fs');
  fs.writeFileSync('data.json', JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`OK: wrote ${events.length} events to data.json`);
}

main().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
