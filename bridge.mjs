// Мост TikTok Live → мишка.
// Слушает эфир стримера и отдаёт события странице через /events (Server-Sent Events).
// Запуск: npm start -- имя_в_тиктоке   →   открыть http://localhost:3737

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const PORT = Number(process.env.PORT) || 3737;
const username = (process.argv[2] || '').trim().replace(/^@/, '');
if (!username) {
  console.log('Как запустить:  npm start -- имя_в_тиктоке');
  process.exit(1);
}

// ---------- страница и поток событий ----------
const clients = new Set();
let status = { type: 'status', state: 'connecting', text: 'Запускаюсь…' };

function send(ev) {
  const data = `data: ${JSON.stringify(ev)}\n\n`;
  for (const res of clients) res.write(data);
}

function setStatus(state, text) {
  status = { type: 'status', state, text };
  console.log(`[${state}] ${text}`);
  send(status);
}

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify(status)}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  } else if (path === '/' || path === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await readFile(new URL('./index.html', import.meta.url)));
  } else {
    res.writeHead(404).end();
  }
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Мишка: http://localhost:${PORT}   (для OBS: http://localhost:${PORT}/?obs)`);
});

// пинг, чтобы соединение со страницей не засыпало
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 20000);

// ---------- TikTok ----------
const conn = new TikTokLiveConnection(username, {});
let retry;

function reconnect(ms) {
  clearTimeout(retry);
  retry = setTimeout(connect, ms);
}

async function connect() {
  setStatus('connecting', `Подключаюсь к @${username}…`);
  try {
    await Promise.race([
      conn.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 30000)),
    ]);
    setStatus('live', `В эфире: @${username}`);
  } catch (e) {
    const offline = e?.name === 'UserOfflineError' || /offline|not.*live/i.test(e?.message || '');
    if (e?.message === 'TIMEOUT') {
      conn.disconnect().catch(() => {});
      setStatus('error', 'TikTok не отвечает. Возможно, он заблокирован в твоей сети — нужен доступ к tiktok.com. Повтор через 30 сек…');
      reconnect(30000);
      return;
    }
    if (offline) setStatus('offline', `@${username} сейчас не в эфире. Проверю ещё раз через 30 сек…`);
    else setStatus('error', `Не получилось подключиться: ${e?.message || e}. Повтор через 15 сек…`);
    reconnect(offline ? 30000 : 15000);
  }
}

conn.on(ControlEvent.DISCONNECTED, () => {
  setStatus('offline', 'Связь с эфиром пропала, переподключаюсь…');
  reconnect(15000);
});
conn.on(ControlEvent.ERROR, ({ info, exception }) => {
  console.error('Ошибка TikTok:', info, exception?.message || '');
});
conn.on(WebcastEvent.STREAM_END, () => {
  setStatus('offline', 'Эфир закончился. Жду следующий…');
  reconnect(30000);
});

const nameOf = (user) => user?.nickname || user?.uniqueId || 'Зритель';

// Вопросом считаем только комментарий со знаком «?», иначе мишка утонет в чате
conn.on(WebcastEvent.CHAT, (d) => {
  const text = (d.comment || '').trim();
  if (!text.endsWith('?')) return;
  send({ type: 'question', user: nameOf(d.user), text });
});

// Реакция зависит от цены подарка в монетках: мелкий / средний / крупный
conn.on(WebcastEvent.GIFT, (d) => {
  const g = d.giftDetails || {};
  if (g.giftType === 1 && !d.repeatEnd) return; // серия ещё идёт — ждём её конца
  const count = d.repeatCount || 1;
  const coins = (g.diamondCount || 0) * count;
  const gift = coins >= 1000 ? 'universe' : coins >= 10 ? 'lion' : 'rose';
  const giftName = g.giftName ? g.giftName + (count > 1 ? ` ×${count}` : '') : undefined;
  console.log(`🎁 ${nameOf(d.user)}: ${giftName || d.giftId} (${coins} монет) → ${gift}`);
  send({ type: 'gift', user: nameOf(d.user), gift, giftName });
});

connect();
