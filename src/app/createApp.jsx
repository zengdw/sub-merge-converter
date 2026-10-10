/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Layout } from '../components/Layout.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { Form } from '../components/Form.jsx';
import { LoginPage } from '../components/LoginPage.jsx';
import { Footer } from '../components/Footer.jsx';
import { UpdateChecker } from '../components/UpdateChecker.jsx';
import { SingboxConfigBuilder } from '../builders/SingboxConfigBuilder.js';
import { ClashConfigBuilder } from '../builders/ClashConfigBuilder.js';
import { SurgeConfigBuilder } from '../builders/SurgeConfigBuilder.js';
import { createTranslator, resolveLanguage } from '../i18n/index.js';
import { encodeBase64, tryDecodeSubscriptionLines } from '../utils.js';
import { APP_NAME, APP_SUBTITLE } from '../constants.js';
import { ShortLinkService } from '../services/shortLinkService.js';
import { ConfigStorageService } from '../services/configStorageService.js';
import { ServiceError, MissingDependencyError } from '../services/errors.js';
import { normalizeRuntime } from '../runtime/runtimeConfig.js';
import { PREDEFINED_RULE_SETS, SING_BOX_CONFIG, SING_BOX_CONFIG_V1_11, generateSubconverterConfig } from '../config/index.js';

const DEFAULT_USER_AGENT = 'curl/7.74.0';

export function createApp(bindings = {}) {
    const runtime = normalizeRuntime(bindings);
    const services = {
        shortLinks: runtime.kv ? new ShortLinkService(runtime.kv, { shortLinkTtlSeconds: runtime.config.shortLinkTtlSeconds }) : null,
        configStorage: runtime.kv ? new ConfigStorageService(runtime.kv, { configTtlSeconds: runtime.config.configTtlSeconds }) : null,
        mergeSub: runtime.mergeSub || null
    };

    const app = new Hono();

    // 检查请求是否已经通过认证（Cookie Session 或 Basic Auth）
    const isRequestAuthenticated = async (c) => {
        if (!services.mergeSub) return true;
        const authEnabled = await services.mergeSub.isAuthEnabled();
        if (!authEnabled) return true;

        // 1. 验证 Cookie Session
        const sessionToken = getCookie(c, 'sub_auth');
        if (sessionToken) {
            const validSession = await services.mergeSub.verifySessionToken(sessionToken);
            if (validSession) return true;
        }

        // 2. 验证 Authorization: Basic Header
        const authHeader = c.req.header('authorization');
        if (authHeader) {
            const validBasic = await services.mergeSub.verifyAuth(authHeader);
            if (validBasic) return true;
        }

        return false;
    };

    // 页面访问守卫（未登录跳转至 /login）
    const requirePageAuth = async (c, next) => {
        const authenticated = await isRequestAuthenticated(c);
        if (!authenticated) {
            return c.redirect('/login');
        }
        await next();
    };

    // API 访问守卫（未认证返回 401 JSON + WWW-Authenticate）
    const requireApiAuth = async (c, next) => {
        const authenticated = await isRequestAuthenticated(c);
        if (!authenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized', message: '需要管理员账号密码认证' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'WWW-Authenticate': 'Basic realm="SubMergeConverter"'
                }
            });
        }
        await next();
    };

    app.use('*', async (c, next) => {
        const acceptLanguage = getRequestHeader(c.req, 'Accept-Language');
        const lang = c.req.query('lang') || acceptLanguage?.split(',')[0] || 'zh-CN';
        c.set('lang', lang);
        c.set('t', createTranslator(lang));
        await next();
    });

    // 登录页面路由
    app.get('/login', async (c) => {
        const authenticated = await isRequestAuthenticated(c);
        if (authenticated) {
            return c.redirect('/');
        }
        const hasError = c.req.query('error') === '1';
        const lang = c.get('lang');
        return c.html(<LoginPage error={hasError} lang={lang} />);
    });

    // 登录验证提交
    app.post('/login', async (c) => {
        try {
            let username = '';
            let password = '';
            const contentType = c.req.header('content-type') || '';
            if (contentType.includes('application/json')) {
                const body = await c.req.json().catch(() => ({}));
                username = body.username?.trim();
                password = body.password?.trim();
            } else {
                const body = await c.req.parseBody().catch(() => ({}));
                username = typeof body.username === 'string' ? body.username.trim() : '';
                password = typeof body.password === 'string' ? body.password.trim() : '';
            }

            if (!services.mergeSub) return c.redirect('/');
            const valid = await services.mergeSub.verifyUserPassword(username, password);
            if (!valid) {
                if (contentType.includes('application/json')) {
                    return c.json({ success: false, error: '账号或密码错误' }, 401);
                }
                return c.redirect('/login?error=1');
            }

            const token = await services.mergeSub.getSessionToken();
            setCookie(c, 'sub_auth', token, {
                path: '/',
                httpOnly: true,
                maxAge: 60 * 60 * 24 * 30, // 30天有效
                sameSite: 'Lax'
            });

            if (contentType.includes('application/json')) {
                return c.json({ success: true, message: '登录成功' });
            }
            return c.redirect('/');
        } catch (error) {
            return c.redirect('/login?error=1');
        }
    });

    // 退出登录路由
    app.get('/logout', (c) => {
        deleteCookie(c, 'sub_auth', { path: '/' });
        return c.redirect('/login');
    });

    app.get('/', requirePageAuth, (c) => {
        const t = c.get('t');
        const lang = resolveLanguage(c.get('lang'));
        const subtitle = APP_SUBTITLE[lang] || APP_SUBTITLE['zh-CN'];

        return c.html(
            <Layout title={t('pageTitle')} description={t('pageDescription')} keywords={t('pageKeywords')}>
                <div class="flex flex-col min-h-screen">
                    <Navbar />
                    <main class="flex-1">
                        <div class="container mx-auto px-4 py-8 pt-24">
                            <div class="max-w-4xl mx-auto">
                                <div class="text-center mb-12 pt-8">
                                    <h1 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                                        {APP_NAME}
                                    </h1>
                                    <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                                        {subtitle}
                                    </p>
                                </div>
                                <Form t={t} lang={lang} />
                            </div>
                        </div>
                    </main>
                    <Footer />
                    <UpdateChecker />
                </div>
            </Layout>
        );
    });

    app.get('/singbox', async (c) => {
        try {
            let config = c.req.query('config');
            if (!config) {
                return c.text('Missing config parameter', 400);
            }
            config = await resolveConfigInput(config, c.req, services.mergeSub);

            const selectedRules = parseSelectedRules(c.req.query('selectedRules'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const ua = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const enableClashUI = parseBooleanFlag(c.req.query('enable_clash_ui'));
            const externalController = c.req.query('external_controller');
            const externalUiDownloadUrl = c.req.query('external_ui_download_url');
            const configId = c.req.query('configId');
            const lang = c.get('lang');

            const requestedSingboxVersion = c.req.query('singbox_version') || c.req.query('sb_version') || c.req.query('sb_ver');
            const requestUserAgent = getRequestHeader(c.req, 'User-Agent');
            const singboxConfigVersion = resolveSingboxConfigVersion(requestedSingboxVersion, requestUserAgent);

            let baseConfig = singboxConfigVersion === '1.11' ? SING_BOX_CONFIG_V1_11 : SING_BOX_CONFIG;
            if (configId) {
                const storage = requireConfigStorage(services.configStorage);
                const storedConfig = await storage.getConfigById(configId);
                if (storedConfig) {
                    baseConfig = storedConfig;
                }
            }

            const builder = new SingboxConfigBuilder(
                config,
                selectedRules,
                customRules,
                baseConfig,
                lang,
                ua,
                groupByCountry,
                enableClashUI,
                externalController,
                externalUiDownloadUrl,
                singboxConfigVersion,
                includeAutoSelect
            );
            await builder.build();
            const userinfo = builder.getSubscriptionUserinfo();
            if (userinfo) {
                c.header('subscription-userinfo', userinfo);
            }
            return c.json(builder.config);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/clash', async (c) => {
        try {
            let config = c.req.query('config');
            if (!config) {
                return c.text('Missing config parameter', 400);
            }
            config = await resolveConfigInput(config, c.req, services.mergeSub);

            const selectedRules = parseSelectedRules(c.req.query('selectedRules'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const ua = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const enableClashUI = parseBooleanFlag(c.req.query('enable_clash_ui'));
            const externalController = c.req.query('external_controller');
            const externalUiDownloadUrl = c.req.query('external_ui_download_url');
            const configId = c.req.query('configId');
            const lang = c.get('lang');

            let baseConfig;
            if (configId) {
                const storage = requireConfigStorage(services.configStorage);
                baseConfig = await storage.getConfigById(configId);
            }

            const builder = new ClashConfigBuilder(
                config,
                selectedRules,
                customRules,
                baseConfig,
                lang,
                ua,
                groupByCountry,
                enableClashUI,
                externalController,
                externalUiDownloadUrl,
                includeAutoSelect
            );
            await builder.build();
            const userinfo = builder.getSubscriptionUserinfo();
            const headers = { 'Content-Type': 'text/yaml; charset=utf-8' };
            if (userinfo) {
                headers['subscription-userinfo'] = userinfo;
            }
            return c.text(builder.formatConfig(), 200, headers);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/surge', async (c) => {
        try {
            let config = c.req.query('config');
            if (!config) {
                return c.text('Missing config parameter', 400);
            }
            config = await resolveConfigInput(config, c.req, services.mergeSub);

            const selectedRules = parseSelectedRules(c.req.query('selectedRules'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const ua = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const configId = c.req.query('configId');
            const lang = c.get('lang');

            let baseConfig;
            if (configId) {
                const storage = requireConfigStorage(services.configStorage);
                baseConfig = await storage.getConfigById(configId);
            }

            const builder = new SurgeConfigBuilder(
                config,
                selectedRules,
                customRules,
                baseConfig,
                lang,
                ua,
                groupByCountry,
                includeAutoSelect
            );
            builder.setSubscriptionUrl(c.req.url);
            await builder.build();

            const userinfo = builder.getSubscriptionUserinfo();
            if (userinfo) {
                c.header('subscription-userinfo', userinfo);
            }
            return c.text(builder.formatConfig());
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/subconverter', (c) => {
        try {
            const rawSelectedRules = c.req.query('selectedRules');
            let selectedRules;

            if (!rawSelectedRules) {
                selectedRules = PREDEFINED_RULE_SETS.balanced;
            } else if (PREDEFINED_RULE_SETS[rawSelectedRules]) {
                selectedRules = PREDEFINED_RULE_SETS[rawSelectedRules];
            } else {
                try {
                    const parsed = JSON.parse(rawSelectedRules);
                    if (Array.isArray(parsed)) {
                        selectedRules = parsed;
                    } else {
                        return c.text('Invalid selectedRules: must be a preset name (minimal, balanced, comprehensive) or a JSON array', 400);
                    }
                } catch {
                    return c.text(`Invalid selectedRules: "${rawSelectedRules}" is not a valid preset name or JSON array. Valid presets: minimal, balanced, comprehensive`, 400);
                }
            }

            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const lang = c.get('lang');

            const config = generateSubconverterConfig({
                selectedRules,
                customRules,
                lang,
                includeAutoSelect,
                groupByCountry
            });

            return c.text(config, 200, {
                'Content-Type': 'text/plain; charset=utf-8'
            });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/xray', async (c) => {
        let inputString = c.req.query('config');
        if (!inputString) {
            return c.text('Missing config parameter', 400);
        }
        inputString = await resolveConfigInput(inputString, c.req, services.mergeSub);

        const proxylist = inputString.split('\n');
        const finalProxyList = [];
        let subscriptionUserinfo;
        const userAgent = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
        const headers = { 'User-Agent': userAgent };

        for (const proxy of proxylist) {
            const trimmedProxy = proxy.trim();
            if (!trimmedProxy) continue;

            if (trimmedProxy.startsWith('http://') || trimmedProxy.startsWith('https://')) {
                try {
                    const response = await fetch(trimmedProxy, { method: 'GET', headers });
                    const fetchedUserinfo = response.headers.get('subscription-userinfo');
                    if (fetchedUserinfo && subscriptionUserinfo === undefined) {
                        subscriptionUserinfo = fetchedUserinfo;
                    }
                    const text = await response.text();
                    let processed = tryDecodeSubscriptionLines(text, { decodeUriComponent: true });
                    if (!Array.isArray(processed)) processed = [processed];
                    finalProxyList.push(...processed.filter(item => typeof item === 'string' && item.trim() !== ''));
                } catch (e) {
                    runtime.logger.warn('Failed to fetch the proxy', e);
                }
            } else {
                let processed = tryDecodeSubscriptionLines(trimmedProxy);
                if (!Array.isArray(processed)) processed = [processed];
                finalProxyList.push(...processed.filter(item => typeof item === 'string' && item.trim() !== ''));
            }
        }

        const finalString = finalProxyList.join('\n');
        if (!finalString) {
            return c.text('Missing config parameter', 400);
        }

        const responseHeaders = {};
        if (subscriptionUserinfo) {
            responseHeaders['subscription-userinfo'] = subscriptionUserinfo;
        }

        return c.text(encodeBase64(finalString), 200, responseHeaders);
    });

    app.get('/shorten-v2', async (c) => {
        try {
            const url = c.req.query('url');
            if (!url) {
                return c.text('Missing URL parameter', 400);
            }
            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch {
                return c.text('Invalid URL parameter', 400);
            }
            const queryString = parsedUrl.search;

            const shortLinks = requireShortLinkService(services.shortLinks);
            const code = await shortLinks.createShortLink(queryString, c.req.query('shortCode'));
            return c.text(code);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    const handleSubExport = async (c) => {
        if (!services.mergeSub) return c.text('MergeSub service not available', 500);
        try {
            const queryCFIP = c.req.query('CFIP');
            const queryCFPORT = c.req.query('CFPORT');
            const base64Content = await services.mergeSub.generateMergedSubscription(queryCFIP, queryCFPORT);
            return c.text(base64Content, 200, {
                'Content-Type': 'text/plain; charset=utf-8'
            });
        } catch (error) {
            runtime.logger.error?.('Error generating merged subscription', error);
            return c.text('Internal Server Error', 500);
        }
    };

    const redirectHandler = (prefix) => async (c) => {
        try {
            if (services.mergeSub) await services.mergeSub.init();
            const code = c.req.param('code');
            const token = services.mergeSub ? services.mergeSub.getSubToken() : null;
            let originalParam = null;
            if (services.shortLinks) {
                try {
                    originalParam = await services.shortLinks.resolveShortCode(code);
                } catch {}
            }
            const url = new URL(c.req.url);
            if (token && code === token) {
                // 如果是固定的 subToken：强制确保 config 参数始终指向当前服务的最新库存合并源！
                if (originalParam) {
                    try {
                        const sp = new URLSearchParams(originalParam.startsWith('?') ? originalParam.slice(1) : originalParam);
                        sp.set('config', `${url.origin}/${token}`);
                        originalParam = '?' + sp.toString();
                    } catch {
                        originalParam = `?config=${encodeURIComponent(`${url.origin}/${token}`)}`;
                    }
                } else {
                    originalParam = `?config=${encodeURIComponent(`${url.origin}/${token}`)}`;
                }
            }
            if (!originalParam) return c.text('Short URL not found', 404);

            return c.redirect(`${url.origin}/${prefix}${originalParam}`);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    };

    app.get('/s/:code', redirectHandler('surge'));
    app.get('/b/:code', redirectHandler('singbox'));
    app.get('/c/:code', redirectHandler('clash'));
    app.get('/x/:code', async (c) => {
        if (services.mergeSub) await services.mergeSub.init();
        const code = c.req.param('code');
        const token = services.mergeSub ? services.mergeSub.getSubToken() : null;
        if (token && code === token) {
            // v2rayN 等客户端请求固定短链 /x/:token 时，直接返回最新合并的 Base64 内容
            return handleSubExport(c);
        }
        return redirectHandler('xray')(c);
    });

    app.post('/config', async (c) => {
        try {
            const { type, content } = await c.req.json();
            const storage = requireConfigStorage(services.configStorage);
            const configId = await storage.saveConfig(type, content);
            return c.text(configId);
        } catch (error) {
            if (error instanceof SyntaxError) {
                return c.text(`Invalid format: ${error.message}`, 400);
            }
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/resolve', async (c) => {
        try {
            const shortUrl = c.req.query('url');
            const t = c.get('t');
            if (!shortUrl) return c.text(t('missingUrl'), 400);

            let urlObj;
            try {
                urlObj = new URL(shortUrl);
            } catch {
                return c.text(t('invalidShortUrl'), 400);
            }
            const pathParts = urlObj.pathname.split('/');
            if (pathParts.length < 3) return c.text(t('invalidShortUrl'), 400);

            const prefix = pathParts[1];
            const shortCode = pathParts[2];
            if (!['b', 'c', 'x', 's'].includes(prefix)) return c.text(t('invalidShortUrl'), 400);

            const shortLinks = requireShortLinkService(services.shortLinks);
            const originalParam = await shortLinks.resolveShortCode(shortCode);
            if (!originalParam) return c.text(t('shortUrlNotFound'), 404);

            const mapping = { b: 'singbox', c: 'clash', x: 'xray', s: 'surge' };
            const originalUrl = `${urlObj.origin}/${mapping[prefix]}${originalParam}`;
            return c.json({ originalUrl });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    const requireAdminAuth = async (c, next) => {
        if (!services.mergeSub) return next();
        const authHeader = c.req.header('authorization');
        const valid = await services.mergeSub.verifyAuth(authHeader);
        if (!valid) {
            return new Response('认证失败', {
                status: 401,
                headers: {
                    'WWW-Authenticate': 'Basic realm="Node"'
                }
            });
        }
        await next();
    };

    // 管理页面路由
    app.get('/admin', requireAdminAuth, async (c) => {
        if (runtime.assetFetcher) {
            const req = new Request(new URL('/admin/index.html', c.req.url).toString(), {
                headers: c.req.raw.headers
            });
            const res = await runtime.assetFetcher(req);
            if (res.status === 200) return res;
        }
        return c.text('Admin page not found', 404);
    });

    app.get('/admin/change-password.html', requireAdminAuth, async (c) => {
        if (runtime.assetFetcher) {
            const req = new Request(new URL('/admin/change-password.html', c.req.url).toString(), {
                headers: c.req.raw.headers
            });
            const res = await runtime.assetFetcher(req);
            if (res.status === 200) return res;
        }
        return c.text('Change password page not found', 404);
    });

    // 获取 SUB_TOKEN 的路由
    app.get('/get-sub-token', requireAdminAuth, (c) => {
        const token = services.mergeSub ? services.mergeSub.getSubToken() : '';
        return c.json({ token });
    });

    // 获取 API_URL
    app.get('/get-apiurl', requireAdminAuth, (c) => {
        const urlObj = new URL(c.req.url);
        const currentDomain = urlObj.origin;
        const configuredApiUrl = services.mergeSub ? services.mergeSub.getApiUrl() : '';
        return c.json({ ApiUrl: configuredApiUrl || currentDomain });
    });

    // 凭据更新路由
    app.post('/admin/update-credentials', requireAdminAuth, async (c) => {
        try {
            const body = await c.req.json();
            const { username, password, currentPassword } = body || {};
            if (!services.mergeSub) return c.json({ error: 'MergeSub service not available' }, 500);
            await services.mergeSub.updateCredentials({ username, password, currentPassword });
            return c.json({ message: '密码修改成功' });
        } catch (error) {
            return c.json({ error: error.message || '修改失败' }, 400);
        }
    });

    // 获取数据路由
    app.get('/admin/data', requireAdminAuth, async (c) => {
        try {
            if (!services.mergeSub) return c.json({ subscriptions: [], nodes: [] });
            const data = await services.mergeSub.getData();
            return c.json(data);
        } catch (error) {
            return c.json({ error: 'Failed to fetch data' }, 500);
        }
    });

    // 添加订阅路由
    app.post('/admin/add-subscription', requireAdminAuth, async (c) => {
        try {
            const body = await c.req.json();
            const subscription = body.subscription?.trim();
            if (!subscription) return c.json({ error: 'Subscription URL is required' }, 400);
            const { added, existing } = await services.mergeSub.addSubscriptions(subscription);
            if (added.length > 0) {
                const message = added.length === (added.length + existing.length)
                    ? '订阅添加成功'
                    : `成功添加 ${added.length} 个订阅，${existing.length} 个订阅已存在`;
                return c.json({ message }, 200);
            }
            return c.json({ error: '所有订阅已存在' }, 400);
        } catch (error) {
            return c.json({ error: error.message || 'Failed to add subscription' }, 500);
        }
    });

    // 添加节点路由
    app.post('/admin/add-node', requireAdminAuth, async (c) => {
        try {
            const body = await c.req.json();
            const node = body.node?.trim();
            if (!node) return c.json({ error: 'Node is required' }, 400);
            const { added, existing } = await services.mergeSub.addNodes(node);
            if (added.length > 0) {
                const message = added.length === (added.length + existing.length)
                    ? '节点添加成功'
                    : `成功添加 ${added.length} 个节点，${existing.length} 个节点已存在`;
                return c.json({ message }, 200);
            }
            return c.json({ error: '所有节点已存在' }, 400);
        } catch (error) {
            return c.json({ error: error.message || 'Failed to add node' }, 500);
        }
    });

    // 删除订阅路由
    app.post('/admin/delete-subscription', requireAdminAuth, async (c) => {
        try {
            const body = await c.req.json();
            const subscription = body.subscription?.trim();
            if (!subscription) return c.json({ error: 'Subscription URL is required' }, 400);
            const { deleted, notFound } = await services.mergeSub.deleteSubscriptions(subscription);
            if (deleted.length > 0) {
                const message = notFound.length === 0
                    ? '订阅删除成功'
                    : `成功删除 ${deleted.length} 个订阅，${notFound.length} 个订阅不存在`;
                return c.json({ message }, 200);
            }
            return c.json({ error: '未找到要删除的订阅' }, 404);
        } catch (error) {
            return c.json({ error: error.message || 'Failed to delete subscription' }, 500);
        }
    });

    // 删除节点路由
    app.post('/admin/delete-node', requireAdminAuth, async (c) => {
        try {
            const body = await c.req.json();
            const node = body.node?.trim();
            if (!node) return c.json({ error: 'Node is required' }, 400);
            const { deleted, notFound } = await services.mergeSub.deleteNodes(node);
            if (deleted.length > 0) {
                const message = notFound.length === 0
                    ? '节点删除成功'
                    : `成功删除 ${deleted.length} 个节点，${notFound.length} 个节点不存在`;
                return c.json({ message }, 200);
            }
            return c.json({ error: '未找到要删除的节点' }, 404);
        } catch (error) {
            return c.json({ error: error.message || 'Failed to delete node' }, 500);
        }
    });

    // 开放 API 路由 - 添加订阅（免认证，方便外部脚本调用）
    app.post('/api/add-subscriptions', async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const newSubscriptions = body.subscription || body.subscriptions || body.url || body.urls;
            if (!newSubscriptions) return c.json({ error: 'Subscription URL is required' }, 400);
            const { added, existing } = await services.mergeSub.addSubscriptions(newSubscriptions);
            const token = services.mergeSub.getSubToken();
            return c.json({
                success: true,
                added,
                existing,
                token,
                message: added.length > 0 ? `成功添加 ${added.length} 个订阅` : '所有订阅已存在'
            }, 200);
        } catch (error) {
            return c.json({ error: error.message || 'Failed to add subscription' }, 500);
        }
    });

    // 开放 API 路由 - 添加节点（免认证，方便外部脚本调用）
    app.post('/api/add-nodes', async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const newNodes = body.nodes || body.node || body.proxies || body.proxy;
            if (!newNodes) return c.json({ error: 'Nodes are required' }, 400);
            const { added, existing } = await services.mergeSub.addNodes(newNodes);
            const token = services.mergeSub.getSubToken();
            return c.json({
                success: true,
                added,
                existing,
                token,
                message: added.length > 0 ? `成功添加 ${added.length} 个节点` : '所有节点已存在'
            }, 200);
        } catch (error) {
            return c.json({ error: error.message || 'Failed to add nodes' }, 500);
        }
    });

    // 开放 API 路由 - 删除订阅（免认证，方便外部脚本调用）
    app.delete('/api/delete-subscriptions', async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const subsToDelete = body.subscription || body.subscriptions || body.url || body.urls;
            if (!subsToDelete) return c.json({ error: 'Subscription URL is required' }, 400);
            const { deleted, notFound } = await services.mergeSub.deleteSubscriptions(subsToDelete);
            const token = services.mergeSub.getSubToken();
            return c.json({
                success: true,
                deleted,
                notFound,
                token,
                message: deleted.length > 0 ? `成功删除 ${deleted.length} 个订阅` : '未找到要删除的订阅'
            }, deleted.length > 0 ? 200 : 404);
        } catch (error) {
            return c.json({ error: error.message || 'Failed to delete subscription' }, 500);
        }
    });

    // 开放 API 路由 - 删除节点（免认证，方便外部脚本调用）
    app.delete('/api/delete-nodes', async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const nodesToDelete = body.nodes || body.node || body.proxies || body.proxy;
            if (!nodesToDelete) return c.json({ error: 'Nodes are required' }, 400);
            const { deleted, notFound } = await services.mergeSub.deleteNodes(nodesToDelete);
            const token = services.mergeSub.getSubToken();
            return c.json({
                success: true,
                deleted,
                notFound,
                token,
                message: deleted.length > 0 ? `成功删除 ${deleted.length} 个节点` : '未找到要删除的节点'
            }, deleted.length > 0 ? 200 : 404);
        } catch (error) {
            return c.json({ error: error.message || 'Failed to delete nodes' }, 500);
        }
    });

    // API 路由 - 获取库存 (节点与订阅，需要验证)
    app.get('/api/stock', requireApiAuth, async (c) => {
        try {
            if (!services.mergeSub) return c.json({ subscriptions: [], nodes: [], subToken: '' });
            const data = await services.mergeSub.getData();
            return c.json(data);
        } catch (error) {
            return c.json({ error: error.message || 'Failed to fetch stock' }, 500);
        }
    });

    // API 路由 - 保存库存 (自动分类保存节点与订阅，需要验证)
    app.post('/api/stock', requireApiAuth, async (c) => {
        try {
            if (!services.mergeSub) return c.json({ error: 'MergeSub service not available' }, 500);
            const body = await c.req.json();
            const content = typeof body.content === 'string' ? body.content : '';
            const result = await services.mergeSub.saveFromInput(content);
            const token = services.mergeSub.getSubToken();
            return c.json({
                success: true,
                count: {
                    subscriptions: result.subscriptions.length,
                    nodes: result.nodes.length
                },
                token
            });
        } catch (error) {
            return c.json({ error: error.message || 'Failed to save stock' }, 500);
        }
    });

    // API 路由 - 获取固定 subToken（需要验证）
    app.get('/api/sub-token', requireApiAuth, async (c) => {
        if (services.mergeSub) await services.mergeSub.init();
        const token = services.mergeSub ? services.mergeSub.getSubToken() : '';
        return c.json({ token });
    });

    app.get('/sub', handleSubExport);

    // 动态路径匹配 SUB_TOKEN
    app.get('/:token', async (c, next) => {
        if (services.mergeSub) await services.mergeSub.init();
        const token = c.req.param('token');
        if (services.mergeSub && token === services.mergeSub.getSubToken()) {
            return handleSubExport(c);
        }
        await next();
    });

    // 静态资源与兜底拦截
    app.get('*', async (c) => {
        if (!runtime.assetFetcher) {
            return c.notFound();
        }
        try {
            const res = await runtime.assetFetcher(c.req.raw);
            if (res && res.status !== 404) {
                return res;
            }
            return c.notFound();
        } catch (error) {
            runtime.logger.warn?.('Asset fetch failed', error);
            return c.notFound();
        }
    });

    return app;
}

export function parseSelectedRules(raw) {
    if (!raw) return [];

    // 首先检查是否是预设名称 (minimal, balanced, comprehensive)
    // 这确保向后兼容主分支的 API 行为
    if (typeof raw === 'string' && PREDEFINED_RULE_SETS[raw]) {
        return PREDEFINED_RULE_SETS[raw];
    }

    // 尝试解析为 JSON 数组
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // 解析失败，回退到 minimal 预设
        console.warn(`Failed to parse selectedRules: ${raw}, falling back to minimal`);
        return PREDEFINED_RULE_SETS.minimal;
    }
}

function parseJsonArray(raw) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function parseBooleanFlag(value) {
    return value === 'true' || value === true;
}

function parseSemverLike(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const match = trimmed.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
    if (!match) {
        return null;
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: match[3] ? Number(match[3]) : 0
    };
}

function isSingboxLegacyConfig(version) {
    if (!version || Number.isNaN(version.major) || Number.isNaN(version.minor)) {
        return false;
    }
    if (version.major !== 1) {
        return version.major < 1;
    }
    return version.minor < 12;
}

function resolveSingboxConfigVersion(requestedVersion, userAgent) {
    const normalizedRequested = typeof requestedVersion === 'string' ? requestedVersion.trim().toLowerCase() : '';
    if (normalizedRequested && normalizedRequested !== 'auto') {
        if (normalizedRequested === 'legacy') return '1.11';
        if (normalizedRequested === 'latest') return '1.12';
        const parsed = parseSemverLike(normalizedRequested);
        if (parsed) {
            return isSingboxLegacyConfig(parsed) ? '1.11' : '1.12';
        }
    }

    if (typeof userAgent === 'string' && userAgent) {
        const uaMatch = userAgent.match(/sing-box\/(\d+\.\d+(?:\.\d+)?)/i) || userAgent.match(/sing-box\s+(\d+\.\d+(?:\.\d+)?)/i);
        const versionString = uaMatch?.[1];
        const parsed = versionString ? parseSemverLike(versionString) : null;
        if (parsed) {
            return isSingboxLegacyConfig(parsed) ? '1.11' : '1.12';
        }
    }

    return '1.12';
}

function getRequestHeader(request, name) {
    if (!request || !name) {
        return undefined;
    }

    try {
        const value = request.header(name);
        if (value !== undefined) {
            return value;
        }
    } catch {
        // Fallback if HonoRequest.header cannot read from the raw request.
    }

    const headers = request.raw?.headers;
    if (!headers) {
        return undefined;
    }

    if (typeof headers.get === 'function') {
        return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
    }

    if (typeof headers === 'object') {
        const lowerName = name.toLowerCase();
        const headerValue = headers[lowerName] ?? headers[name];
        if (Array.isArray(headerValue)) {
            return headerValue[0];
        }
        return headerValue;
    }

    return undefined;
}

function requireShortLinkService(service) {
    if (!service) {
        throw new MissingDependencyError('Short link functionality is unavailable');
    }
    return service;
}

function requireConfigStorage(service) {
    if (!service) {
        throw new MissingDependencyError('Config storage functionality is unavailable');
    }
    return service;
}

function handleError(c, error, logger) {
    if (error instanceof ServiceError) {
        return c.text(error.message, error.status);
    }
    logger.error?.('Unhandled error', error);
    return c.text(`Error: ${error.message}`, 500);
}

async function resolveConfigInput(config, req, mergeSub) {
    if (!config || !mergeSub) return config;
    await mergeSub.init();
    const token = mergeSub.getSubToken();
    if (!token) return config;

    const lines = config.split('\n');
    let hasMatched = false;
    const replaced = await Promise.all(lines.map(async (line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (trimmed === token || trimmed === 'stock') {
            hasMatched = true;
            return await mergeSub.getMergedNodesPlain();
        }
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            try {
                const u = new URL(trimmed);
                if (u.pathname === `/${token}` || u.pathname === '/sub') {
                    hasMatched = true;
                    const cfip = u.searchParams.get('CFIP');
                    const cfport = u.searchParams.get('CFPORT');
                    return await mergeSub.getMergedNodesPlain(cfip, cfport);
                }
            } catch {}
        }
        return line;
    }));
    return hasMatched ? replaced.join('\n') : config;
}
