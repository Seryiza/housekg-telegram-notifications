<p align="right">
  <img width="250" height="250" alt="housekg-yoyo" src="https://github.com/user-attachments/assets/6c7f58bc-2916-4a14-b9d2-e33f61da438a" />
</p>

# house.kg telegram notifications

Bun + TypeScript watcher for [house.kg](https://www.house.kg) search result pages. It extracts configured feeds with `yo-url-yo-json`, enriches listings from their detail pages, stores seen listings in SQLite, and sends Telegram notifications once per unique listing per feed.

Real world usage of [yo-url-yo-json](https://github.com/Seryiza/yo-url-yo-json) repository.

## How it looks

1. **Start**

```bash
$ bun run src/index.ts
Loaded 1 feed(s) from ./feeds.config.json
Polling every 300000 ms
Scanning 1 enabled feed(s)
Feed "Асанбай" scan succeeded: 10 listing(s), 10 new notification(s)
```

2. **Handle extracted JSON**

```json
{
  "feedTitle": "Аренда квартир в Кыргызстане",
  "items": [
    {
      "id": "592972...",
      "url": "https://www.house.kg/details/592972...",
      "title": "1-комн. кв., 44 м2",
      "address": "Бишкек, Магистраль, Сухэ Батора",
      "price": "$ 700/мес.",
      "priceAlt": "61 278 сом/мес.",
      "description": "Сдаю квартиру на длительный срок! Однокомнатная элитка ...",
      "photoUrl": "https://cdn.house.kg/house/images/4/d/3/4d338eb69ea12a.jpg",
      "publishedText": "15 часов назад"
    }
  ]
}
```

3. **Receive notifications**

<img width="300" height="457" alt="yoyo-screenshot" src="https://github.com/user-attachments/assets/0e4c00d7-4dc4-4985-b507-e5de78c68046" />

## Setup
```sh
$ bun install
   
# Copy and edit the sample env
$ cp .env.example .env

# Copy and edit the feeds config
$ cp feeds.config.example.json feeds.config.json

# Start
bun run start
```
