# 爪印日记

彩铅手绘风的遛狗日记，跑在 https://paw.kkmeflicker.com 。

- `public/`：网页 App（地图、日记、狗友、狗狗资料）
- `worker/index.js`：服务器（狗狗家庭、谁带着狗狗、共享日记、狗友、相遇）
- `wrangler.jsonc`：Cloudflare 配置（D1 数据库 `paw-diary`、域名 `paw.kkmeflicker.com`）

推送到 `main` 后 Cloudflare 会自动部署。
