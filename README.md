# Roast My Douban


Roast your style based on interests of a Douban user.


![](./roast-my-douban.png)


---

## 部署到 Cloudflare Pages

1. 在仓库根目录执行：`npm install`（已使用 `@sveltejs/adapter-cloudflare`）
2. 在 Cloudflare Pages 绑定该 Git 仓库，构建配置：
   - **Build command:** `npm run build`
   - **Build output directory:** `.svelte-kit/cloudflare`（需手动填写，因以点开头可能不在下拉里）
3. 在 Pages 的 **Settings → Environment variables** 中配置环境变量（如 `RELAY_BASE_URL`、`RELAY_MODEL`、`RELAY_API_KEY`，以及限流用的 `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN` 等）。

---

made with 99% AI, 1% Human

## Support me

You can support me by Alipay (scan QR code below) or [ko-fi](https://ko-fi.com/aerisz):

![](./support.webp)


