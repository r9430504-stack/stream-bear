# Stream Bear 🐻

An interactive bear for your OBS overlay: it answers chat questions and reacts to donations.

**Twitch:** open https://r9430504-stack.github.io/stream-bear/?lang=en , enter your channel, press "Connect Twitch" and paste the link from the status line into OBS as a Browser source. Nothing to install, no login.

- Chat messages ending with `?` get a random answer: Yes / No / Dunno / Ha-ha-ha.
- Bits: under 100 → dance, under 1000 → falls over, 1000+ → sings with confetti. Subs count as medium.
- The streamer and mods can test reactions with `!small`, `!medium`, `!big` in chat.

**TikTok Live:** needs a small bridge on your computer — `npm install`, then `npm start -- your_tiktok_username`, and add `http://localhost:3737/?lang=en&obs` to OBS.

---

# Мишка для стрима

Интерактивный мишка для OBS: отвечает на вопросы из чата и реагирует на донаты.

**Twitch:** открой https://r9430504-stack.github.io/stream-bear/?lang=ru , впиши свой канал, нажми «Подключить Twitch» и вставь ссылку из строки статуса в OBS как источник «Браузер».

**TikTok Live:** нужен мост на своём компьютере — `npm install`, затем `npm start -- имя_в_тиктоке` и ссылка `http://localhost:3737/?lang=ru&obs` в OBS.
