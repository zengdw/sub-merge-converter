# Sub-Merge-Converter

全功能**代理订阅合并管理**与**多客户端格式转换**一体化服务。本项目融合了 [Merge-sub](https://github.com/eooce/Merge-sub) 与 [sub-converter](https://github.com/eooce/sub-converter) 的全部特性，既支持在 **Cloudflare Workers** 边缘无服务器环境运行，也支持通过 **Docker Compose** / 本地 Node.js 在服务器上持久化部署。

---

## 🌟 功能特性

### 1. 订阅合并与节点管理 (来自 Merge-sub)
- **多源订阅合并**：支持合并多个 HTTP / HTTPS 订阅源，自动并发拉取并生成统一 Base64 订阅。
- **自定义节点管理**：支持手动批量添加与删除 VMess、VLESS、Trojan、Shadowsocks、SSR、Hysteria/Hysteria2、TUIC、AnyTLS、Wireguard 等协议节点，支持 Base64 单节点自动识别。
- **动态优选 IP/端口替换**：在订阅链接后附加 `?CFIP=...&CFPORT=...`（如 `time.is&CFPORT=443`），实时动态替换 VMess / VLESS / Trojan (WS/XHTTP + TLS) 节点的地址与端口，无须改动原始节点配置。
- **Web 后台管理系统**：内置 `/admin` 可视化管理后台，支持 Basic Auth 权限认证、实时增删订阅/节点、修改管理员密码、一键生成订阅链接。
- **开放 API 支持**：提供免认证 API 接口，方便外部脚本自动化增删节点与订阅。

### 2. 多客户端格式转换与短链服务 (来自 sub-converter)
- **主流客户端格式互转**：支持在线转换为 **Sing-box**、**Clash / Mihomo / ClashMeta**、**Surge**、**Xray** 及 **Subconverter** 格式。
- **现代化 Web 界面**：首页提供直观美观的转换表单，内置多语言切换（中/英/俄/波斯）、暗黑模式、规则集预设（极简/均衡/全量）、国别节点分组、自动选优组等。
- **短链接生成与还原**：支持长订阅转换 URL 缩短为短链（`/s/:code`, `/b/:code`, `/c/:code`, `/x/:code`），并支持短链一键还原与解析。
- **规则集与配置存储**：支持上传并引用自定义客户端模板与分流规则。

---

## 🚀 部署指南

### 方式一：Cloudflare Workers 部署 (无服务器推荐)

在 Cloudflare Workers 上部署，无需购买 VPS，数据（短链、规则、订阅列表与管理员凭据）通过 **Cloudflare KV** 永久存储。

1. **安装 Wrangler CLI（如未安装）**：
   ```bash
   npm install -g wrangler
   ```
2. **登录 Cloudflare 账号**：
   ```bash
   npx wrangler login
   ```
3. **创建 KV 命名空间**：
   ```bash
   npx wrangler kv namespace create SUBLINK_KV
   ```
   记录返回的 `id`，将其填入根目录下的 [`wrangler.toml`](file:///c:/Users/zengd/Desktop/sub-merge-converter/wrangler.toml) 中：
   ```toml
   kv_namespaces = [
     { binding = "SUBLINK_KV", id = "填入你的KV_ID" }
   ]
   ```
4. **一键发布部署**：
   ```bash
   npm run deploy
   # 或者
   npx wrangler deploy
   ```

---

### 方式二：Docker Compose 部署 (服务器推荐)

适合独立 VPS 或容器云平台，内置 Redis 缓存与本地目录持久化。

1. **准备配置文件**：
   项目根目录下已包含预配置的 [`docker-compose.yml`](file:///c:/Users/zengd/Desktop/sub-merge-converter/docker-compose.yml) 与 [`Dockerfile`](file:///c:/Users/zengd/Desktop/sub-merge-converter/Dockerfile)。

2. **环境变量配置（可选）**：
   创建 `.env` 文件或在 `docker-compose.yml` 中调整：
   ```env
   PORT=8787
   USERNAME=admin
   PASSWORD=admin
   SUB_TOKEN=your_custom_token
   ```

3. **启动容器**：
   ```bash
   docker-compose up -d --build
   ```

4. **查看状态与日志**：
   ```bash
   docker-compose logs -f sub-merge-converter
   ```

> **数据持久化说明**：  
> 本地挂载目录 `./data:/app/data` 用于存储订阅与节点数据 (`data.json`) 以及管理员账号密码 (`credentials.json`)；  
> Redis 卷 `redis-data` 用于缓存短链和配置。重启容器数据不丢失。

---

### 方式三：Node.js 本地运行

要求 Node.js >= 18：

1. **安装依赖**：
   ```bash
   npm install
   ```
2. **编译并启动**：
   ```bash
   npm run build:node
   npm run start
   ```
   服务将监听在 `http://localhost:8787`（可通过 `PORT=8080 npm run start` 指定端口）。

---

## ⚙️ 环境变量说明

| 环境变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `PORT` | Node / Docker 监听端口 | `8787` |
| `USERNAME` | 后台管理用户名 | `admin` |
| `PASSWORD` | 后台管理密码 | `admin` |
| `SUB_TOKEN` | 专属订阅路径 Token，不填则自动生成 | `自动生成随机字符` |
| `API_URL` | 外部订阅转换 API（为空时默认使用本机转换引擎） | `当前服务域名` |
| `DATA_DIR` | 本地数据持久化存储目录 | `./data` |
| `REDIS_HOST` | Redis 主机地址（Docker 环境） | `redis` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `CONFIG_TTL_SECONDS` | 配置存储过期时间（秒） | `2592000` (30天) |

---

## 📖 核心路由与 API 说明

### 1. Web 界面
- **`/`**：在线转换器首页（支持多语言、多主题、在线格式转换与短链生成）。
- **`/admin`**：订阅合并管理后台（需输入 `USERNAME` 与 `PASSWORD` 登录）。
- **`/admin/change-password.html`**：管理员密码与用户名修改。

### 2. 订阅与转换接口
- **`/sub` 或 `/:SUB_TOKEN`**：获取合并订阅（Base64 格式）。
  - 支持参数：`?CFIP=time.is&CFPORT=443` 动态替换优选节点。
- **`/singbox?config=...`**：转换为 Sing-box 客户端配置。
- **`/clash?config=...`**：转换为 Clash / Mihomo 配置。
- **`/surge?config=...`**：转换为 Surge 配置。
- **`/xray?config=...`**：转换为 Xray 配置。
- **`/subconverter?selectedRules=...`**：生成 Subconverter 规则集。

### 3. 短链与跳转接口
- **`/shorten-v2?url=...`**：生成短链代码。
- **`/b/:code`**：跳转 Sing-box 订阅。
- **`/c/:code`**：跳转 Clash 订阅。
- **`/s/:code`**：跳转 Surge 订阅。
- **`/x/:code`**：跳转 Xray 订阅。
- **`/resolve?url=...`**：还原短链。

### 4. 自动化开放 API (免鉴权)
- **`POST /api/add-subscriptions`**：自动添加订阅源
  ```json
  { "subscription": "https://example.com/sub" }
  ```
- **`POST /api/add-nodes`**：自动添加节点
  ```json
  { "nodes": ["vmess://...", "vless://..."] }
  ```
- **`DELETE /api/delete-subscriptions`**：删除订阅源
- **`DELETE /api/delete-nodes`**：删除指定节点

---

## 📄 许可证
MIT License
