# 套圈游戏 — GitHub Pages 预览

这是一个用于 GitHub Pages 的静态预览（功能不全）。
- 放在仓库的 `docs/` 目录后，设置 Pages 源为 `main branch /docs folder` 后即可访问。
- 仅前端演示：拖拽投掷圈圈、判定胜负、积分本地计数。未接入 Phantom 钱包、Solana/USDC 支付或后端验证。

如何本地预览：
- 在项目根目录运行：
  - Python 3: `python -m http.server 8000`，然后访问 `http://localhost:8000/docs/`
  - 或在 `docs/` 目录运行 `npx http-server` / VSCode Live Server

后续可选改进（非必须）：
- 把支付接入 Phantom + Solana USDC（SPL token）
- 将结算逻辑移到后端以防作弊
- 更丰富动画与交互
