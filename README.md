# Sub-Merge-Converter

全功能**代理订阅合并管理**与**多客户端格式转换**一体化服务。本项目融合了订阅聚合管理与现代多客户端配置转换的核心特性，既支持在 **Cloudflare Workers** 边缘无服务器环境运行，也支持通过 **Docker Compose** / 本地 Node.js 在服务器上持久化部署。

---

## 🌟 功能特性

### 1. 节点与订阅库存管理 (自动化与界面一体化)
- **从库存中加载 & 智能合并去重**：首页输入源下方内置「从库存中加载」功能。输入源为空时一键调出库存；已有节点时自动合并新节点并智能去重。
- **转换即保存**：在前端点击「转换」时，自动将输入源中的所有节点和订阅持久化保存至服务端库存，无需繁琐的手动入库。
- **自动化开放 API**：提供免认证 API 接口，方便外部脚本与定时任务自动化批量增删节点与订阅。
- **多源订阅合并**：支持合并多个 HTTP / HTTPS 订阅源，自动并发拉取并解析。
- **全协议节点支持**：支持 VMess、VLESS、Trojan、Shadowsocks、SSR、Hysteria/Hysteria2、TUIC、AnyTLS、Wireguard 等节点协议，自动识别 Base64 单节点或列表。
- **动态优选 IP/端口替换**：在订阅链接后附加 `?CFIP=...&CFPORT=...`（如 `time.is&CFPORT=443`），实时动态替换 VMess / VLESS / Trojan (WS/XHTTP + TLS) 节点的地址与端口。

### 2. 多客户端格式转换与永久固定短链
- **直接生成短链接**：点击转换后免去二次操作，**直接生成专属短链接**。
- **短链永久固定 & 客户端实时更新**：
  - **短链固定**：系统生成固定的专属短链 Token，客户端一次配置永久有效。
  - **实时同步**：无论是网页端转换保存，还是通过开放 API 自动化增删节点，**v2rayN、Clash、Sing-box 等客户端点击更新订阅即可直接拉取最新配置**。
- **全主流客户端格式支持**：
  - **Base64 / 通用 (v2rayN / Shadowrocket / Karing / Nekoray)**：`/x/:token` 或 `/:token`
  - **Clash 系列 (Flclash / Clash Verge / Mihomo / ClashMeta)**：`/c/:token`
  - **Sing-box**：`/b/:token`
  - **Surge**：`/s/:token`
- **现代化 Web 界面**：支持多语言切换（中/英/俄/波斯）、暗黑模式、规则集预设（极简/均衡/全量）、国别节点分组、自动选优组等。

---

## 🚀 部署指南

### 方式一：Cloudflare Workers 部署 (无服务器推荐)

在 Cloudflare Workers 上部署，无需购买 VPS，数据（固定短链 Token、规则、订阅与节点）通过 **Cloudflare KV** 永久存储。

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
   记录返回的 `id`，将其填入根目录下的 `wrangler.toml` 中：
   ```toml
   kv_namespaces = [
     { binding = "SUBLINK_KV", id = "填入你的KV_ID" }
   ]
   ```
4. **设置安全访问密码（Secret 加密存储，避免提交 Git 泄露）**：
   ```bash
   npx wrangler secret put AUTH_PASSWORD
   # 根据提示输入您的安全访问密码
   ```
5. **一键发布部署**：
   ```bash
   npm run deploy
   # 或者
   npx wrangler deploy
   ```

---

### 方式二：Docker Compose 部署 (服务器推荐)

适合独立 VPS 或容器云平台，内置 Redis 缓存与本地目录持久化。

1. **准备配置文件**：
   项目根目录下已包含预配置的 `docker-compose.yml` 与 `Dockerfile`。

2. **环境变量配置（可选）**：
   创建 `.env` 文件或在 `docker-compose.yml` 中调整：
   ```env
   PORT=8787
   SUB_TOKEN=your_custom_token # 可选，不填时自动持久化生成
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
> 本地挂载目录 `./data:/app/data` 用于存储订阅与节点数据 (`data.json`)；  
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
| `SUB_TOKEN` | 专属订阅路径 Token，不填则自动生成并持久化 | `自动生成随机字符` |
| `API_URL` | 外部订阅转换 API（为空时默认使用本机转换引擎） | `当前服务域名` |
| `DATA_DIR` | 本地数据持久化存储目录 | `./data` |
| `REDIS_HOST` | Redis 主机地址（Docker 环境） | `redis` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `CONFIG_TTL_SECONDS` | 配置存储过期时间（秒） | `2592000` (30天) |

---

## 📖 核心路由与 API 说明

### 1. Web 界面与客户端订阅

- **`/`**：在线转换器首页（支持输入源编辑、从库存加载、智能合并、转换及直接生成短链）。
- **固定短链（客户端直接订阅与自动更新）**：
  - **`/x/:token` 或 `/:token`**：Base64 订阅（适用于 v2rayN / Shadowrocket / Karing / Nekoray 等）。
    - 支持附加优选参数：`?CFIP=time.is&CFPORT=443`
  - **`/c/:token`**：Clash / Mihomo / ClashMeta 订阅配置。
  - **`/b/:token`**：Sing-box 订阅配置。
  - **`/s/:token`**：Surge 订阅配置。

### 2. 核心转换引擎接口

- **`/clash?config=...`**：转换为 Clash 配置。
- **`/singbox?config=...`**：转换为 Sing-box 配置。
- **`/surge?config=...`**：转换为 Surge 配置。
- **`/xray?config=...`**：转换为 Xray / Base64 订阅。
- **`/subconverter?selectedRules=...`**：生成 Subconverter 规则集。
- **`/shorten-v2?url=...`**：生成短链代码。
- **`/resolve?url=...`**：还原短链。

### 3. 安全防护与账号密码配置 (避免节点泄露)

为防止未经授权的人员访问面板、窃取或篡改节点数据，系统内置了**全局安全访问控制**：

#### (1) 配置账号与密码
支持以下两种极简配置方式（任选其一，直接生效）：

- **方式一：通过环境变量配置（推荐）**
  在 `.env` 或 Docker Compose 环境变量中指定：
  ```bash
  AUTH_USERNAME=admin
  AUTH_PASSWORD=your_strong_password
  ```
- **方式二：直接修改配置文件**
  在服务端直接修改 `data/credentials.json` 文件：
  ```json
  {
    "username": "admin",
    "password": "your_strong_password"
  }
  ```

#### (2) 安全隔离机制
- **Web 控制台安全防护**：访问主页 `/` 时必须先通过账号密码登录；登录后保持安全 Cookie 会话，顶栏支持随时注销退出。
- **库存明细查看保护**：获取全量库存数据 `GET /api/stock` 受到严格保护（防止他人窃取节点），需在登录后或携带 Basic Auth 访问。
- **自动化增删免鉴权**：**外部自动化脚本添加/删除节点与订阅的 API（`/api/add-nodes`、`/api/delete-nodes` 等）完全免认证**，外部爬虫或定时任务可直接无障碍 POST/DELETE。
- **客户端订阅不受阻碍**：通过固定专属短链（如 `/x/:token` 或 `/:token`）拉取的订阅直接面向客户端放行，v2rayN、Clash 等客户端在任何设备上均可无感更新订阅。

### 4. 自动化管理 API (增删节点免鉴权)

> 💡 **提示**：外部自动化脚本通过以下 API 添加或删除节点/订阅**无需认证**，调用后**客户端所配置的固定短链无需更改，直接点击更新即可自动同步最新数据**。

#### (1) 获取当前固定 SubToken
- **`GET /api/sub-token`** (需要认证)
  ```json
  { "token": "27hyh93aaaacnvopogvw" }
  ```

#### (2) 获取库存数据
- **`GET /api/stock`**
  ```json
  {
    "subscriptions": ["https://example.com/sub1"],
    "nodes": ["vmess://...", "trojan://..."],
    "subToken": "27hyh93aaaacnvopogvw"
  }
  ```

#### (3) 批量保存输入源至库存
- **`POST /api/stock`**
  ```json
  {
    "content": "https://example.com/sub\ntrojan://...#Node1\nvless://...#Node2"
  }
  ```

#### (4) 添加节点
- **`POST /api/add-nodes`**
  - 请求体（支持 `nodes`、`node`、`proxies`、`proxy`，可传数组或单个字符串）：
  ```json
  {
    "nodes": [
      "vmess://...",
      "trojan://..."
    ]
  }
  ```

#### (5) 删除节点
- **`DELETE /api/delete-nodes`**
  - 请求体（支持完整节点链接或根据 `#备注名` 精准删除）：
  ```json
  {
    "nodes": [
      "Node1",
      "trojan://..."
    ]
  }
  ```

#### (6) 添加订阅源
- **`POST /api/add-subscriptions`**
  - 请求体（支持 `subscription`、`subscriptions`、`url`、`urls`）：
  ```json
  {
    "subscription": "https://example.com/sub"
  }
  ```

#### (7) 删除订阅源
- **`DELETE /api/delete-subscriptions`**
  - 请求体：
  ```json
  {
    "subscription": "https://example.com/sub"
  }
  ```

---

## 参考项目
- [sub-converter](https://github.com/eooce/sub-converter)
- [Merge-sub](https://github.com/eooce/Merge-sub)

## 📄 许可证
MIT License
