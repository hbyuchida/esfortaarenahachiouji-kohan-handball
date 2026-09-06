# ハンドボール教室（八王子市総合体育館）自動更新アプリ

bizmanager から八王子市総合体育館のハンドボール講座を定期取得し、
残席・受講料・申込リンクをまとめて表示するアプリです。

## 構成

- `index.html` … 表示アプリ（`data.json` を読み込み、無ければ埋め込みデータで表示）
- `data.json` … スクレイパーが生成する最新データ
- `scrape.js` … bizmanager から取得して `data.json` を書き出すスクリプト（Node 18+）
- `.github/workflows/update.yml` … GitHub Actions。1日2回（06:00 / 18:00 JST）実行

## セットアップ（完全自動）

1. この一式をそのまま GitHub リポジトリにプッシュ
2. リポジトリの **Settings → Pages** で「Deploy from a branch」を選び、公開
3. **Actions** タブで `Update handball events` が動くのを確認（手動実行も可）
   - 以後、スケジュールで `data.json` が自動更新され、アプリに反映されます

ローカル確認:

```bash
node scrape.js        # data.json を生成
npx serve .           # http://localhost:3000 などで表示
```

## 更新頻度を変える

`.github/workflows/update.yml` の `cron` を編集してください（UTC 指定）。

## 注意

- 取得0件のときはサイト構造が変わった可能性が高いため、
  スクレイパーは異常終了し、既存の `data.json` を保持します（`scrape.js` の該当箇所）。
- 残席・受講料は変動します。申込前に公式ページで最新情報をご確認ください。
- スクレイピングは対象サイトの利用規約の範囲でご利用ください。
