# OkProxyConf

一个基于浏览器的 SingBox 配置生成器。粘贴或获取你的代理订阅，配置路由分组与规则集，然后下载可直接使用的 `config.json`。

![screenshot](docs/images/screenshot.png)

**直接使用:** https://jeffthebside.github.io/OkProxyConf/

---

## 功能

- **自动识别订阅格式** — 支持 Clash YAML、V2Ray Base64、SingBox JSON、以及 URI 列表（`ss://` `vmess://` `vless://` `trojan://` `hysteria2://` `tuic://` 等）
- **直接 URL 获取** — 在订阅面板粘贴链接即可一键获取；若遇到 CORS 错误，会提示切换到粘贴模式
- **多源合并** — 可同时加载多个 URL 或混合 URL 与粘贴，节点会自动去重
- **地理分组** — 使用国旗表情、常见中文/拉丁关键词对节点进行地域聚类；无法识别的按前缀聚合
- **逻辑组** — 支持 `selector` 与 `urltest` 两种逻辑组，方便为不同用途（流媒体、游戏、AI 等）选择出口
- **规则集** — 支持添加远程规则集并为每个规则集分配出口；域名类规则在 `resolve` 之前，IP 类规则在 `resolve` 之后
- **自定义模板** — 可以上传或粘贴已有 SingBox 配置以覆盖 `log`、`dns`、`inbounds`、`experimental`（`outbounds` 与 `route` 始终由生成器管理）
- **手动编辑模式** — 在预览面板中直接编辑生成的 JSON；右侧面板的结构化更改不会覆盖你的手动修改，除非你重置
- **节点管理** — 可删除单个节点或整个区域分组
- **持久化** — 节点、分组、规则集与模板保存在 `localStorage` 并在下次打开时恢复

---

## 技术栈

| | |
|---|---|
| 框架 | React 19 |
| 语言 | TypeScript |
| 构建 | Vite |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand |
| YAML 解析 | js-yaml |
| 图标 | lucide-react |

---

## 本地部署

```bash
git clone https://github.com/jeffthebside/OkProxyConf.git
cd OkProxyConf
npm install
npm run dev
```

打开 `http://localhost:5173`。

生产构建：

```bash
npm run build
```

---

## 使用说明（概览）

1. 导入节点：在订阅面板切换 `URL` / `Paste` 模式。
   - `URL` 模式：输入订阅链接并点击获取；若 CORS 错误，会提示切换到粘贴模式。
   - `Paste` 模式：在浏览器打开订阅链接，复制响应并粘贴到面板。

2. 配置逻辑组（可选）：在 `Groups` 选项卡创建 `selector` 或 `urltest` 逻辑组。

3. 添加规则集（可选）：在 `Rules` 选项卡添加远程规则集并为其分配出口（`proxy` / `direct` / 任意分组）。

4. 自定义模板（可选）：在 `Template` 选项卡上传或粘贴已有 SingBox 配置。

5. 下载：在预览面板右上或状态栏点击 `Save` 下载最终的 `config.json`。

---

## 项目结构（简要）

```
src/
├── components/
│   ├── modals/
│   ├── ConfigPreview.tsx
│   ├── SubscriptionPanel.tsx
│   └── ...
├── config/
│   └── template.ts
├── store/
└── utils/
```

---

## 许可

MIT