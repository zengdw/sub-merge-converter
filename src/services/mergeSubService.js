import { encodeBase64, decodeBase64 } from '../utils.js';

function cleanNodeString(str) {
    if (!str) return '';
    return str
        .replace(/^["'`]+|["'`]+$/g, '')
        .replace(/,+$/g, '')
        .replace(/\s+/g, '')
        .trim();
}

function tryDecodeBase64(str) {
    if (!str) return '';
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    try {
        if (base64Regex.test(str.trim())) {
            const decoded = decodeBase64(str.trim());
            if (
                decoded.startsWith('vmess://') ||
                decoded.startsWith('vless://') ||
                decoded.startsWith('trojan://') ||
                decoded.startsWith('ss://') ||
                decoded.startsWith('ssr://') ||
                decoded.startsWith('snell://') ||
                decoded.startsWith('juicity://') ||
                decoded.startsWith('hysteria://') ||
                decoded.startsWith('hysteria2://') ||
                decoded.startsWith('tuic://') ||
                decoded.startsWith('anytls://') ||
                decoded.startsWith('wireguard://') ||
                decoded.startsWith('socks5://') ||
                decoded.startsWith('http://') ||
                decoded.startsWith('https://')
            ) {
                return decoded;
            }
        }
    } catch {
        // ignore error
    }
    return str;
}

export class MergeSubService {
    constructor(options = {}) {
        this.kv = options.kv || null;
        this.fs = options.fs || null;
        this.dataDir = options.dataDir || './data';
        this.dataFile = options.dataFile || `${this.dataDir}/data.json`;
        this.credentialsFile = options.credentialsFile || `${this.dataDir}/credentials.json`;
        this.logger = options.logger || console;
        this.apiUrl = options.apiUrl || '';
        this.defaultUsername = options.defaultUsername || 'admin';
        this.defaultPassword = options.defaultPassword || 'admin';
        this.initialSubTokenFromEnv = Boolean(options.subToken);
        this.subToken = options.subToken || this.generateDefaultToken();

        this.cachedCredentials = null;
        this.cachedData = null;
        this.isInitialized = false;
    }

    generateDefaultToken() {
        // 生成默认 20 位随机 Token
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 20; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    async init() {
        if (this.isInitialized) return;
        await this.loadCredentials();
        await this.loadData();
        this.isInitialized = true;
    }

    async loadCredentials() {
        // 1. 尝试从本地文件读取 (Node环境)
        if (this.fs) {
            try {
                const content = await this.fs.readFile(this.credentialsFile, 'utf8');
                const parsed = JSON.parse(content);
                this.cachedCredentials = {
                    username: parsed.username || this.defaultUsername,
                    password: parsed.password || this.defaultPassword
                };
                return this.cachedCredentials;
            } catch {
                // 文件不存在或读取失败，写入初始配置
                const initCreds = {
                    username: this.defaultUsername,
                    password: this.defaultPassword
                };
                try {
                    await this.fs.mkdir(this.dataDir, { recursive: true });
                    await this.fs.writeFile(this.credentialsFile, JSON.stringify(initCreds, null, 2), 'utf8');
                } catch (e) {
                    this.logger.warn?.('Could not write credentials file:', e);
                }
                this.cachedCredentials = initCreds;
                return this.cachedCredentials;
            }
        }

        // 2. 尝试从 KV 读取 (Cloudflare Worker环境)
        if (this.kv) {
            try {
                const stored = await this.kv.get('mergesub:credentials');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    this.cachedCredentials = {
                        username: parsed.username || this.defaultUsername,
                        password: parsed.password || this.defaultPassword
                    };
                    return this.cachedCredentials;
                }
            } catch (e) {
                this.logger.warn?.('Failed reading credentials from KV:', e);
            }
            const initCreds = {
                username: this.defaultUsername,
                password: this.defaultPassword
            };
            try {
                await this.kv.put('mergesub:credentials', JSON.stringify(initCreds));
            } catch (e) {
                this.logger.warn?.('Failed saving credentials to KV:', e);
            }
            this.cachedCredentials = initCreds;
            return this.cachedCredentials;
        }

        // 3. 内存回退
        if (!this.cachedCredentials) {
            this.cachedCredentials = {
                username: this.defaultUsername,
                password: this.defaultPassword
            };
        }
        return this.cachedCredentials;
    }

    async getCredentials() {
        await this.init();
        return this.cachedCredentials;
    }

    async saveCredentials(creds) {
        this.cachedCredentials = creds;
        if (this.fs) {
            try {
                await this.fs.mkdir(this.dataDir, { recursive: true });
                await this.fs.writeFile(this.credentialsFile, JSON.stringify(creds, null, 2), 'utf8');
            } catch (e) {
                this.logger.error?.('Failed saving credentials file:', e);
                return false;
            }
            return true;
        }
        if (this.kv) {
            try {
                await this.kv.put('mergesub:credentials', JSON.stringify(creds));
            } catch (e) {
                this.logger.error?.('Failed saving credentials to KV:', e);
                return false;
            }
            return true;
        }
        return true;
    }

    async verifyAuth(authHeader) {
        await this.init();
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return false;
        }
        try {
            const base64Part = authHeader.substring(6).trim();
            const decoded = decodeBase64(base64Part);
            const colonIndex = decoded.indexOf(':');
            if (colonIndex === -1) return false;
            const user = decoded.substring(0, colonIndex);
            const pass = decoded.substring(colonIndex + 1);

            return user === this.cachedCredentials?.username && pass === this.cachedCredentials?.password;
        } catch (e) {
            this.logger.warn?.('verifyAuth exception:', e);
            return false;
        }
    }

    async isAuthEnabled() {
        await this.init();
        return Boolean(this.cachedCredentials?.username && this.cachedCredentials?.password);
    }

    async verifyUserPassword(username, password) {
        await this.init();
        if (!this.cachedCredentials?.username || !this.cachedCredentials?.password) return false;
        return (
            username === this.cachedCredentials.username &&
            password === this.cachedCredentials.password
        );
    }

    async getSessionToken() {
        await this.init();
        const { username, password } = this.cachedCredentials || {};
        if (!username || !password) return '';
        const raw = `${username}:${password}:${this.subToken}`;
        return encodeBase64(raw);
    }

    async verifySessionToken(token) {
        if (!token) return false;
        const current = await this.getSessionToken();
        return Boolean(current && token === current);
    }

    async updateCredentials({ username, password, currentPassword }) {
        await this.init();
        if (!username || !password || !currentPassword) {
            throw new Error('所有字段都必须填写');
        }
        if (currentPassword !== this.cachedCredentials.password) {
            throw new Error('当前密码错误');
        }
        const updated = { username, password };
        const saved = await this.saveCredentials(updated);
        if (!saved) {
            throw new Error('保存密码失败');
        }
        return true;
    }

    async loadData() {
        if (this.fs) {
            try {
                const content = await this.fs.readFile(this.dataFile, 'utf8');
                const parsed = JSON.parse(content);
                if (parsed.subToken && !this.initialSubTokenFromEnv) {
                    this.subToken = parsed.subToken;
                }
                this.cachedData = {
                    subToken: this.subToken,
                    subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
                    nodes: typeof parsed.nodes === 'string' ? parsed.nodes : ''
                };
                if (!parsed.subToken) {
                    await this.saveData(this.cachedData.subscriptions, this.cachedData.nodes).catch(() => {});
                }
                return this.cachedData;
            } catch {
                const initial = { subToken: this.subToken, subscriptions: [], nodes: '' };
                try {
                    await this.fs.mkdir(this.dataDir, { recursive: true });
                    await this.fs.writeFile(this.dataFile, JSON.stringify(initial, null, 2), 'utf8');
                } catch (e) {
                    this.logger.warn?.('Could not create data file:', e);
                }
                this.cachedData = initial;
                return this.cachedData;
            }
        }

        if (this.kv) {
            try {
                const stored = await this.kv.get('mergesub:data');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.subToken && !this.initialSubTokenFromEnv) {
                        this.subToken = parsed.subToken;
                    }
                    this.cachedData = {
                        subToken: this.subToken,
                        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
                        nodes: typeof parsed.nodes === 'string' ? parsed.nodes : ''
                    };
                    if (!parsed.subToken) {
                        await this.saveData(this.cachedData.subscriptions, this.cachedData.nodes).catch(() => {});
                    }
                    return this.cachedData;
                }
            } catch (e) {
                this.logger.warn?.('Failed reading data from KV:', e);
            }
            this.cachedData = { subToken: this.subToken, subscriptions: [], nodes: '' };
            await this.kv.put('mergesub:data', JSON.stringify(this.cachedData)).catch(() => {});
            return this.cachedData;
        }

        if (!this.cachedData) {
            this.cachedData = { subToken: this.subToken, subscriptions: [], nodes: '' };
        }
        return this.cachedData;
    }

    async saveData(subscriptions, nodes) {
        const payload = {
            subToken: this.subToken,
            subscriptions: Array.isArray(subscriptions) ? subscriptions : [],
            nodes: typeof nodes === 'string' ? nodes : ''
        };
        this.cachedData = payload;

        if (this.fs) {
            try {
                await this.fs.mkdir(this.dataDir, { recursive: true });
                await this.fs.writeFile(this.dataFile, JSON.stringify(payload, null, 2), 'utf8');
            } catch (e) {
                this.logger.error?.('Failed saving data file:', e);
                throw e;
            }
        }
        if (this.kv) {
            try {
                await this.kv.put('mergesub:data', JSON.stringify(payload));
            } catch (e) {
                this.logger.error?.('Failed saving data to KV:', e);
                throw e;
            }
        }
    }

    async saveFromInput(inputText) {
        await this.init();
        const lines = (inputText || '').split('\n').map(l => l.trim()).filter(Boolean);
        const subscriptions = [];
        const nodes = [];
        for (const line of lines) {
            if ((line.startsWith('http://') || line.startsWith('https://')) && !line.includes('@')) {
                subscriptions.push(line);
            } else {
                nodes.push(line);
            }
        }
        await this.saveData(subscriptions, nodes.join('\n'));
        return { subscriptions, nodes };
    }

    async getData() {
        await this.init();
        await this.loadData();
        const nodesList = typeof this.cachedData.nodes === 'string'
            ? this.cachedData.nodes.split('\n').map(n => n.trim()).filter(Boolean)
            : [];
        return {
            subscriptions: this.cachedData.subscriptions || [],
            nodes: nodesList,
            subToken: this.subToken
        };
    }

    getSubToken() {
        return this.subToken;
    }

    getApiUrl() {
        return this.apiUrl;
    }

    async addSubscriptions(subscriptionInput) {
        await this.init();
        await this.loadData();

        const inputList = Array.isArray(subscriptionInput)
            ? subscriptionInput
            : typeof subscriptionInput === 'string'
                ? subscriptionInput.split(/\r?\n/)
                : [];

        const newSubs = inputList.map(s => s.trim()).filter(Boolean);
        if (newSubs.length === 0) {
            throw new Error('Subscription URL is required');
        }

        const currentSubs = [...(this.cachedData.subscriptions || [])];
        const added = [];
        const existing = [];

        for (const sub of newSubs) {
            if (currentSubs.some(s => s.trim() === sub)) {
                existing.push(sub);
            } else {
                added.push(sub);
                currentSubs.push(sub);
            }
        }

        if (added.length > 0) {
            await this.saveData(currentSubs, this.cachedData.nodes);
        }

        return { added, existing };
    }

    async addNodes(nodeInput) {
        await this.init();
        await this.loadData();

        const newNodes = this.extractNodes(nodeInput);
        if (newNodes.length === 0) {
            throw new Error('Node is required');
        }

        let nodesList = typeof this.cachedData.nodes === 'string'
            ? this.cachedData.nodes.split(/\r?\n/).map(n => n.trim()).filter(Boolean)
            : [];

        const added = [];
        const existing = [];

        for (const node of newNodes) {
            const nodeClean = cleanNodeString(node);
            const exists = nodesList.some(n => cleanNodeString(n) === nodeClean);
            if (exists) {
                existing.push(node);
            } else {
                added.push(node);
                nodesList.push(node);
            }
        }

        if (added.length > 0) {
            await this.saveData(this.cachedData.subscriptions, nodesList.join('\n'));
        }

        return { added, existing };
    }

    async deleteSubscriptions(subscriptionInput) {
        await this.init();
        await this.loadData();

        const inputList = Array.isArray(subscriptionInput)
            ? subscriptionInput
            : typeof subscriptionInput === 'string'
                ? subscriptionInput.split(/\r?\n/)
                : [];

        const toDelete = inputList.map(s => cleanNodeString(s)).filter(Boolean);
        if (toDelete.length === 0) {
            throw new Error('Subscription URL is required');
        }

        let currentSubs = [...(this.cachedData.subscriptions || [])];
        const deleted = [];
        const notFound = [];

        for (const item of toDelete) {
            const index = currentSubs.findIndex(s => cleanNodeString(s) === item || s === item);
            if (index !== -1) {
                deleted.push(currentSubs[index]);
                currentSubs.splice(index, 1);
            } else {
                notFound.push(item);
            }
        }

        if (deleted.length > 0) {
            await this.saveData(currentSubs, this.cachedData.nodes);
        }

        return { deleted, notFound };
    }

    async deleteNodes(nodeInput) {
        await this.init();
        await this.loadData();

        const toDelete = this.extractNodes(nodeInput);
        if (toDelete.length === 0) {
            throw new Error('Node is required');
        }

        let nodesList = typeof this.cachedData.nodes === 'string'
            ? this.cachedData.nodes.split(/\r?\n/).map(n => n.trim()).filter(Boolean)
            : [];

        const deleted = [];
        const notFound = [];

        for (const target of toDelete) {
            const targetClean = cleanNodeString(target);
            let foundIdx = -1;
            for (let i = 0; i < nodesList.length; i++) {
                const current = nodesList[i];
                const currentClean = cleanNodeString(current);
                if (currentClean === targetClean) {
                    foundIdx = i;
                    break;
                }
                try {
                    if (decodeURIComponent(currentClean) === decodeURIComponent(targetClean)) {
                        foundIdx = i;
                        break;
                    }
                } catch {}
                if (targetClean.startsWith('#') && currentClean.endsWith(targetClean)) {
                    foundIdx = i;
                    break;
                }
                if (!targetClean.includes('://') && currentClean.endsWith('#' + targetClean)) {
                    foundIdx = i;
                    break;
                }
            }

            if (foundIdx !== -1) {
                deleted.push(nodesList[foundIdx]);
                nodesList.splice(foundIdx, 1);
            } else {
                notFound.push(target);
            }
        }

        if (deleted.length > 0) {
            await this.saveData(this.cachedData.subscriptions, nodesList.join('\n'));
        }

        return { deleted, notFound };
    }

    extractNodes(input) {
        if (!input) return [];
        const rawList = Array.isArray(input)
            ? input
            : typeof input === 'string'
                ? input.split(/\r?\n/)
                : [];
        const results = [];
        for (const item of rawList) {
            if (!item || typeof item !== 'string') continue;
            const decoded = tryDecodeBase64(item.trim());
            const lines = decoded.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
                results.push(cleanNodeString(line));
            }
        }
        return results.filter(Boolean);
    }

    replaceAddressAndPort(content, targetCFIP, targetCFPORT) {
        if (!targetCFIP || !targetCFPORT || !content) {
            return content || '';
        }

        return content.split('\n').map(line => {
            line = line.trim();
            if (!line) return line;

            if (line.startsWith('vmess://')) {
                try {
                    const base64Part = line.substring(8);
                    const decoded = decodeBase64(base64Part);
                    const nodeObj = JSON.parse(decoded);

                    if ((nodeObj.net === 'ws' || nodeObj.net === 'xhttp') && nodeObj.tls === 'tls') {
                        if (!nodeObj.host || nodeObj.host !== nodeObj.add) {
                            nodeObj.add = targetCFIP;
                            nodeObj.port = parseInt(targetCFPORT, 10);
                        }
                        return 'vmess://' + encodeBase64(JSON.stringify(nodeObj));
                    }
                } catch (e) {
                    this.logger.warn?.('Error processing VMess node:', e);
                }
            } else if (line.startsWith('vless://') || line.startsWith('trojan://')) {
                try {
                    if ((line.includes('type=ws') || line.includes('type=xhttp')) && line.includes('security=tls')) {
                        const url = new URL(line);
                        const address = url.hostname;
                        const params = new URLSearchParams(url.search);
                        const host = params.get('host');

                        if (!host || host !== address) {
                            return line.replace(/@([\w.-]+):(\d+)/, (match, h) => {
                                return `@${targetCFIP}:${targetCFPORT}`;
                            });
                        }
                    }
                } catch (e) {
                    this.logger.warn?.('Error processing VLESS/Trojan node:', e);
                }
            }
            return line;
        }).join('\n');
    }

    async fetchSubscription(url) {
        try {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null;

            const res = await fetch(url, {
                signal: controller?.signal,
                headers: {
                    'User-Agent': 'curl/7.74.0'
                }
            });
            if (timeoutId) clearTimeout(timeoutId);

            if (!res.ok) return null;
            return await res.text();
        } catch (e) {
            this.logger.warn?.(`Failed fetching subscription ${url}:`, e);
            return null;
        }
    }

    async getMergedNodesPlain(targetCFIP, targetCFPORT) {
        await this.init();
        await this.loadData();

        const subs = this.cachedData.subscriptions || [];
        const promises = subs.map(async (url) => {
            const text = await this.fetchSubscription(url);
            if (!text) return null;
            try {
                const decoded = decodeBase64(text.trim());
                return this.replaceAddressAndPort(decoded, targetCFIP, targetCFPORT);
            } catch {
                return this.replaceAddressAndPort(text, targetCFIP, targetCFPORT);
            }
        });

        const fetchedSubs = await Promise.all(promises);
        const validSubs = fetchedSubs.filter(Boolean).join('\n');

        const localNodes = this.cachedData.nodes || '';
        const updatedLocalNodes = this.replaceAddressAndPort(localNodes, targetCFIP, targetCFPORT);

        const allNodes = [validSubs, updatedLocalNodes]
            .filter(Boolean)
            .join('\n')
            .split('\n')
            .map(n => n.trim())
            .filter(Boolean);

        return allNodes.join('\n');
    }

    async generateMergedSubscription(targetCFIP, targetCFPORT) {
        const plain = await this.getMergedNodesPlain(targetCFIP, targetCFPORT);
        return encodeBase64(plain);
    }
}
