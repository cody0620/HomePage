# 個人首頁

純黑星空風格的瀏覽器個人首頁，含搜尋、快速連結、天氣、股市圖表與設定面板。

## 開發

```bash
npm install
npm run dev
```

## 部署

### 前端 → GitHub Pages

```bash
npm run build
```

把 `dist/` 推到 `gh-pages` 分支，或用 Actions 部署。
建議在 `index.html` 載入前用 `<script>window.STOCK_API_BASE='https://你的-vercel-app.vercel.app'</script>` 指向 Vercel API。

### API → Vercel

整個 repo 推到 Vercel，`api/stock.js` 會自動以 Edge Function 部署。
路徑：`https://你的-vercel-app.vercel.app/api/stock?symbol=^TWII&range=1d&interval=5m`

## 技術
- Vite
- TradingView Lightweight Charts
- Open-Meteo（天氣 / 空氣品質）
- Yahoo Finance（透過 Vercel Edge Function 中繼，解決 CORS）
