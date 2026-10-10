export const formLogicFn = (t) => {
    window.formData = function () {
        // Inline parseSurgeConfigInput to make it available in toString()
        const parseSurgeValue = (rawValue = '') => {
            const trimmed = rawValue.trim();
            if (trimmed === '') return '';
            const unquoted = trimmed.replace(/^"(.*)"$/, '$1');
            const lower = unquoted.toLowerCase();
            if (lower === 'true') return true;
            if (lower === 'false') return false;
            if (/^-?\d+(\.\d+)?$/.test(unquoted)) return Number(unquoted);
            return unquoted;
        };

        const convertSurgeIniToJson = (content) => {
            const lines = content.split(/\r?\n/);
            const config = {};
            let currentSection = null;
            const ensureObject = (key) => {
                if (!config[key]) config[key] = {};
                return config[key];
            };
            const ensureArray = (key) => {
                if (!config[key]) config[key] = [];
                return config[key];
            };
            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line || line.startsWith(';') || line.startsWith('#')) continue;
                const sectionMatch = line.match(/^\[(.+)]$/);
                if (sectionMatch) {
                    currentSection = sectionMatch[1].trim();
                    continue;
                }
                if (!currentSection) continue;
                const sectionName = currentSection.toLowerCase();
                if (sectionName === 'general' || sectionName === 'replica') {
                    const equalsIndex = line.indexOf('=');
                    if (equalsIndex === -1) continue;
                    const key = line.slice(0, equalsIndex).trim();
                    const value = line.slice(equalsIndex + 1).trim();
                    if (!key) continue;
                    const target = ensureObject(sectionName);
                    target[key] = parseSurgeValue(value);
                } else if (sectionName === 'proxy') {
                    ensureArray('proxies').push(line);
                } else if (sectionName === 'proxy group') {
                    ensureArray('proxy-groups').push(line);
                } else if (sectionName === 'rule') {
                    ensureArray('rules').push(line);
                } else {
                    ensureArray(sectionName).push(line);
                }
            }
            if (!config.general && !config.replica && !config.proxies && !config['proxy-groups']) {
                throw new Error('Unable to parse Surge INI content');
            }
            return config;
        };

        const parseSurgeConfigInput = (content) => {
            const trimmed = content.trim();
            if (!trimmed) throw new Error('Config content is empty');
            try {
                return { configObject: JSON.parse(trimmed), convertedFromIni: false };
            } catch {
                const converted = convertSurgeIniToJson(content);
                return { configObject: converted, convertedFromIni: true };
            }
        };

        return {
            input: '',
            showAdvanced: false,
            // Accordion states for each section (二级手风琴状态)
            accordionSections: {
                rules: true,        // 规则选择 - 默认展开
                customRules: false, // 自定义规则
                general: false,     // 通用设置
                baseConfig: false,  // 基础配置
                ua: false          // User Agent
            },
            selectedRules: [],
            selectedPredefinedRule: 'balanced',
            subconverterCopied: false,
            groupByCountry: false,
            includeAutoSelect: true,
            enableClashUI: false,
            externalController: '',
            externalUiDownloadUrl: '',
            configType: 'singbox',
            configEditor: '',
            savingConfig: false,
            currentConfigId: '',
            saveConfigText: '',
            savingConfigText: '',
            configContentRequiredText: '',
            configSaveFailedText: '',
            configValidationState: '',
            configValidationMessage: '',
            customUA: '',
            inputViewMode: 'cards', // 'cards' | 'text'
            loading: false,
            loadingStock: false,
            stockNotice: '',
            showFullUrls: false,
            fixedSubToken: '',
            generatedLinks: null,
            shortenedLinks: null,
            shortening: false,
            customShortCode: '',
            parsingUrl: false,
            parseDebounceTimer: null,
            // These will be populated from window.APP_TRANSLATIONS
            processingText: '',
            convertText: '',
            shortenLinksText: '',
            shorteningText: '',
            showFullLinksText: '',

            get parsedInputNodes() {
                const text = (this.input || '').trim();
                if (!text) return [];

                const safeBase64Decode = (str) => {
                    if (!str) return null;
                    try {
                        let b64 = str.replace(/-/g, '+').replace(/_/g, '/').trim();
                        while (b64.length % 4) b64 += '=';
                        if (typeof window !== 'undefined' && typeof window.atob === 'function') {
                            const binary = window.atob(b64);
                            const bytes = new Uint8Array(binary.length);
                            for (let i = 0; i < binary.length; i++) {
                                bytes[i] = binary.charCodeAt(i);
                            }
                            return new TextDecoder('utf-8').decode(bytes);
                        } else if (typeof Buffer !== 'undefined') {
                            return Buffer.from(b64, 'base64').toString('utf8');
                        }
                    } catch {}
                    return null;
                };

                const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const result = [];
                for (let i = 0; i < rawLines.length; i++) {
                    const url = rawLines[i];
                    let type = 'NODE';
                    let name = '';
                    let address = '';
                    let badgeClass = 'bg-gray-100 text-gray-700 dark:bg-gray-750 dark:text-gray-300 border-gray-200 dark:border-gray-650';

                    // 1. 尝试从 URL 末尾的 # 提取显式备注
                    const hashIndex = url.indexOf('#');
                    if (hashIndex !== -1) {
                        try {
                            name = decodeURIComponent(url.slice(hashIndex + 1).trim());
                        } catch {
                            name = url.slice(hashIndex + 1).trim();
                        }
                    }

                    const lower = url.toLowerCase();
                    if (lower.startsWith('hysteria2://') || lower.startsWith('hy2://')) {
                        type = 'HY2';
                        badgeClass = 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60';
                    } else if (lower.startsWith('vless://')) {
                        type = 'VLESS';
                        badgeClass = 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60';
                    } else if (lower.startsWith('trojan://')) {
                        type = 'TROJAN';
                        badgeClass = 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60';
                    } else if (lower.startsWith('vmess://')) {
                        type = 'VMESS';
                        badgeClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
                        const rawB64 = url.slice(8).trim();
                        const hIdx = rawB64.indexOf('#');
                        const b64Part = hIdx !== -1 ? rawB64.slice(0, hIdx) : rawB64;
                        const decoded = safeBase64Decode(b64Part);
                        if (decoded) {
                            try {
                                const vmessObj = JSON.parse(decoded);
                                if (vmessObj.ps && !name) {
                                    name = String(vmessObj.ps).trim();
                                }
                                if (vmessObj.add) {
                                    address = vmessObj.port ? `${vmessObj.add}:${vmessObj.port}` : String(vmessObj.add);
                                }
                            } catch {}
                        }
                    } else if (lower.startsWith('ss://')) {
                        type = 'SS';
                        badgeClass = 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60';
                        let rest = url.slice(5).trim();
                        const hIdx = rest.indexOf('#');
                        if (hIdx !== -1) {
                            rest = rest.slice(0, hIdx);
                        }
                        if (rest.includes('@')) {
                            address = rest.split('@')[1];
                        } else {
                            const decoded = safeBase64Decode(rest);
                            if (decoded && decoded.includes('@')) {
                                address = decoded.split('@')[1];
                            }
                        }
                    } else if (lower.startsWith('ssr://')) {
                        type = 'SSR';
                        badgeClass = 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60';
                        const rest = url.slice(6).trim();
                        const decoded = safeBase64Decode(rest);
                        if (decoded) {
                            const parts = decoded.split('/?');
                            if (parts[0]) {
                                const hostParts = parts[0].split(':');
                                if (hostParts.length >= 2) address = `${hostParts[0]}:${hostParts[1]}`;
                            }
                            if (parts[1]) {
                                const params = new URLSearchParams(parts[1]);
                                const remarksB64 = params.get('remarks');
                                if (remarksB64 && !name) {
                                    const decRemarks = safeBase64Decode(remarksB64);
                                    if (decRemarks) name = decRemarks;
                                }
                            }
                        }
                    } else if (lower.startsWith('tuic://')) {
                        type = 'TUIC';
                        badgeClass = 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/60';
                    } else if (lower.startsWith('http://') || lower.startsWith('https://')) {
                        type = 'SUB';
                        badgeClass = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60';
                    }

                    // 通用地址解析 (如果前面未解析出)
                    if (!address) {
                        try {
                            if (url.includes('@')) {
                                const afterAt = url.split('@')[1];
                                address = afterAt.split('?')[0].split('#')[0];
                            } else if (url.startsWith('http://') || url.startsWith('https://')) {
                                const u = new URL(url);
                                address = u.host;
                            }
                        } catch {}
                    }

                    result.push({
                        index: i,
                        raw: url,
                        type,
                        name: name || `节点 #${i + 1}`,
                        address: address || '',
                        badgeClass
                    });
                }
                return result;
            },

            switchInputView(mode) {
                this.inputViewMode = mode;
                try { localStorage.setItem('inputViewMode', mode); } catch {}
            },

            removeNodeAtIndex(idx) {
                const list = this.parsedInputNodes;
                if (idx >= 0 && idx < list.length) {
                    list.splice(idx, 1);
                    this.input = list.map(item => item.raw).join('\n\n');
                    localStorage.setItem('inputTextarea', this.input);
                    this.stockNotice = '已移除所选节点';
                    setTimeout(() => { this.stockNotice = ''; }, 2000);
                }
            },

            copyNodeUrl(url) {
                if (!url) return;
                navigator.clipboard.writeText(url).then(() => {
                    this.stockNotice = '已复制节点链接到剪贴板';
                    setTimeout(() => { this.stockNotice = ''; }, 2000);
                }).catch(() => {});
            },

            formatInputSpacing() {
                const list = this.parsedInputNodes;
                if (list.length > 0) {
                    this.input = list.map(item => item.raw).join('\n\n');
                    localStorage.setItem('inputTextarea', this.input);
                    this.stockNotice = `已重新规整 ${list.length} 个节点（空行分隔）`;
                    setTimeout(() => { this.stockNotice = ''; }, 2500);
                }
            },

            init() {
                // Fetch fixed subToken from backend
                fetch('/api/sub-token').then(r => r.json()).then(d => {
                    if (d?.token) this.fixedSubToken = d.token;
                }).catch(() => {});

                // Load translations
                if (window.APP_TRANSLATIONS) {
                    this.processingText = window.APP_TRANSLATIONS.processing;
                    this.convertText = window.APP_TRANSLATIONS.convert;
                    this.shortenLinksText = window.APP_TRANSLATIONS.shortenLinks;
                    this.shorteningText = window.APP_TRANSLATIONS.shortening;
                    this.showFullLinksText = window.APP_TRANSLATIONS.showFullLinks;
                    this.saveConfigText = window.APP_TRANSLATIONS.saveConfig;
                    this.savingConfigText = window.APP_TRANSLATIONS.savingConfig;
                    this.configContentRequiredText = window.APP_TRANSLATIONS.configContentRequired;
                    this.configSaveFailedText = window.APP_TRANSLATIONS.configSaveFailed;
                }

                // Load saved data
                this.input = localStorage.getItem('inputTextarea') || '';
                const savedViewMode = localStorage.getItem('inputViewMode');
                if (savedViewMode) this.inputViewMode = savedViewMode;
                this.showAdvanced = localStorage.getItem('advancedToggle') === 'true';
                this.groupByCountry = localStorage.getItem('groupByCountry') === 'true';
                this.includeAutoSelect = localStorage.getItem('includeAutoSelect') !== 'false';
                this.enableClashUI = localStorage.getItem('enableClashUI') === 'true';
                this.externalController = localStorage.getItem('externalController') || '';
                this.externalUiDownloadUrl = localStorage.getItem('externalUiDownloadUrl') || '';
                this.customUA = localStorage.getItem('userAgent') || '';
                this.configEditor = localStorage.getItem('configEditor') || '';
                this.configType = localStorage.getItem('configType') || 'singbox';
                this.customShortCode = localStorage.getItem('customShortCode') || '';
                const initialUrlParams = new URLSearchParams(window.location.search);
                this.currentConfigId = initialUrlParams.get('configId') || '';

                // Load accordion states
                const savedAccordion = localStorage.getItem('accordionSections');
                if (savedAccordion) {
                    try {
                        this.accordionSections = JSON.parse(savedAccordion);
                    } catch (e) {
                        // If parsing fails, keep defaults
                    }
                }

                // Initialize rules
                this.applyPredefinedRule();

                // Watchers to save state
                this.$watch('input', val => {
                    localStorage.setItem('inputTextarea', val);
                    this.handleInputChange(val);
                });
                this.$watch('showAdvanced', val => localStorage.setItem('advancedToggle', val));
                this.$watch('groupByCountry', val => localStorage.setItem('groupByCountry', val));
                this.$watch('includeAutoSelect', val => localStorage.setItem('includeAutoSelect', val));
                this.$watch('enableClashUI', val => localStorage.setItem('enableClashUI', val));
                this.$watch('externalController', val => localStorage.setItem('externalController', val));
                this.$watch('externalUiDownloadUrl', val => localStorage.setItem('externalUiDownloadUrl', val));
                this.$watch('customUA', val => localStorage.setItem('userAgent', val));
                this.$watch('configEditor', val => {
                    localStorage.setItem('configEditor', val);
                    this.resetConfigValidation();
                });
                this.$watch('configType', val => {
                    localStorage.setItem('configType', val);
                    this.resetConfigValidation();
                });
                this.$watch('customShortCode', val => localStorage.setItem('customShortCode', val));
                this.$watch('accordionSections', val => localStorage.setItem('accordionSections', JSON.stringify(val)), { deep: true });
            },

            toggleAccordion(section) {
                this.accordionSections[section] = !this.accordionSections[section];
            },

            applyPredefinedRule() {
                if (this.selectedPredefinedRule === 'custom') return;

                // PREDEFINED_RULE_SETS will be injected globally
                const rules = window.PREDEFINED_RULE_SETS;
                if (rules && rules[this.selectedPredefinedRule]) {
                    this.selectedRules = rules[this.selectedPredefinedRule];
                }
            },

            getSubconverterUrl() {
                const origin = window.location.origin;
                const params = new URLSearchParams();

                // Use preset name directly if a predefined rule set is selected
                if (this.selectedPredefinedRule && this.selectedPredefinedRule !== 'custom') {
                    params.append('selectedRules', this.selectedPredefinedRule);
                } else if (this.selectedPredefinedRule === 'custom') {
                    params.append('selectedRules', JSON.stringify(this.selectedRules));
                }

                // Include customRules when available (best-effort; may make URL long)
                try {
                    const customRulesInput = document.querySelector('input[name="customRules"]');
                    const customRules = customRulesInput && customRulesInput.value ? JSON.parse(customRulesInput.value) : [];
                    if (Array.isArray(customRules) && customRules.length > 0) {
                        params.append('customRules', JSON.stringify(customRules));
                    }
                } catch { }

                if (!this.includeAutoSelect) {
                    params.append('include_auto_select', 'false');
                }

                if (this.groupByCountry) {
                    params.append('group_by_country', 'true');
                }

                // Include lang parameter so subconverter gets correct group names
                const appLang = window.APP_LANG || 'zh-CN';
                if (appLang !== 'zh-CN') {
                    params.append('lang', appLang);
                }

                const queryString = params.toString();
                return origin + '/subconverter' + (queryString ? '?' + queryString : '');
            },

            copySubconverterUrl() {
                const url = this.getSubconverterUrl();
                navigator.clipboard.writeText(url).then(() => {
                    this.subconverterCopied = true;
                    setTimeout(() => this.subconverterCopied = false, 2000);
                }).catch(() => {});
            },

            resetConfigValidation() {
                this.configValidationState = '';
                this.configValidationMessage = '';
            },

            async saveBaseConfig() {
                const content = (this.configEditor || '').trim();
                if (!content) {
                    alert(this.configContentRequiredText || window.APP_TRANSLATIONS.configContentRequired);
                    return;
                }

                let payloadContent = this.configEditor;
                if (this.configType === 'surge') {
                    try {
                        const { configObject } = parseSurgeConfigInput(this.configEditor);
                        payloadContent = JSON.stringify(configObject);
                    } catch (parseError) {
                        const prefix = window.APP_TRANSLATIONS.configValidationError || 'Config validation error:';
                        alert(`${prefix} ${parseError?.message || ''}`.trim());
                        return;
                    }
                }

                this.savingConfig = true;
                try {
                    const response = await fetch('/config', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            type: this.configType,
                            content: payloadContent
                        })
                    });
                    const responseText = await response.text();
                    if (!response.ok) {
                        throw new Error(responseText || response.statusText || 'Request failed');
                    }
                    const configId = responseText.trim();
                    if (!configId) {
                        throw new Error('Missing config ID');
                    }
                    this.currentConfigId = configId;
                    this.updateConfigIdInUrl(configId);

                    const successMessage = window.APP_TRANSLATIONS.saveConfigSuccess || 'Configuration saved successfully!';
                    alert(`${successMessage}\nID: ${configId}`);
                } catch (error) {
                    console.error('Failed to save base config:', error);
                    const errorPrefix = this.configSaveFailedText || window.APP_TRANSLATIONS.configSaveFailed || 'Failed to save configuration';
                    alert(`${errorPrefix}: ${error?.message || 'Unknown error'}`);
                } finally {
                    this.savingConfig = false;
                }
            },

            validateBaseConfig() {
                const content = (this.configEditor || '').trim();
                if (!content) {
                    this.configValidationState = 'error';
                    this.configValidationMessage = this.configContentRequiredText || window.APP_TRANSLATIONS.configContentRequired;
                    return;
                }

                try {
                    if (this.configType === 'clash') {
                        if (!window.jsyaml || !window.jsyaml.load) {
                            throw new Error(window.APP_TRANSLATIONS.parserUnavailable || 'Parser unavailable. Please refresh and try again.');
                        }
                        window.jsyaml.load(content);
                        this.configValidationState = 'success';
                        this.configValidationMessage =
                            window.APP_TRANSLATIONS.validYamlConfig || 'YAML config is valid';
                    } else if (this.configType === 'surge') {
                        parseSurgeConfigInput(this.configEditor);
                        this.configValidationState = 'success';
                        this.configValidationMessage =
                            window.APP_TRANSLATIONS.validJsonConfig || 'JSON config is valid';
                    } else {
                        JSON.parse(content);
                        this.configValidationState = 'success';
                        this.configValidationMessage =
                            window.APP_TRANSLATIONS.validJsonConfig || 'JSON config is valid';
                    }
                } catch (error) {
                    this.configValidationState = 'error';
                    const prefix = window.APP_TRANSLATIONS.configValidationError || 'Config validation error: ';
                    this.configValidationMessage = `${prefix}${error?.message || ''}`;
                }
            },

            clearBaseConfig() {
                if (confirm(window.APP_TRANSLATIONS.confirmClearConfig)) {
                    this.configEditor = '';
                    localStorage.removeItem('configEditor');
                    this.currentConfigId = '';
                    this.updateConfigIdInUrl(null);
                }
            },

            clearAll() {
                if (confirm(window.APP_TRANSLATIONS.confirmClearAll)) {
                    this.input = '';
                    this.generatedLinks = null;
                    this.shortenedLinks = null;
                    this.customShortCode = '';
                    // Also clear from localStorage
                    localStorage.removeItem('customShortCode');
                }
            },

            updateConfigIdInUrl(configId) {
                const url = new URL(window.location.href);
                if (configId) {
                    url.searchParams.set('configId', configId);
                } else {
                    url.searchParams.delete('configId');
                }
                window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
            },

            async loadFromStock() {
                this.loadingStock = true;
                this.stockNotice = '';
                try {
                    const res = await fetch('/api/stock');
                    if (!res.ok) throw new Error('获取库存失败');
                    const data = await res.json();
                    if (data?.subToken) {
                        this.fixedSubToken = data.subToken;
                    }
                    const stockSubs = Array.isArray(data?.subscriptions) ? data.subscriptions : [];
                    const stockNodes = Array.isArray(data?.nodes)
                        ? data.nodes
                        : (typeof data?.nodes === 'string' ? data.nodes.split('\n') : []);
                    const allStockItems = [...stockSubs, ...stockNodes].map(s => s.trim()).filter(Boolean);

                    if (allStockItems.length === 0) {
                        this.stockNotice = '库存中暂无保存的节点或订阅';
                        setTimeout(() => { this.stockNotice = ''; }, 3500);
                        return;
                    }

                    const currentLines = (this.input || '').split('\n').map(s => s.trim()).filter(Boolean);
                    if (currentLines.length === 0) {
                        this.input = allStockItems.join('\n\n');
                        this.stockNotice = `已成功从库存加载 ${allStockItems.length} 项（已按节点空行分隔）`;
                    } else {
                        const seen = new Set();
                        const merged = [];
                        for (const item of currentLines) {
                            if (!seen.has(item)) {
                                seen.add(item);
                                merged.push(item);
                            }
                        }
                        let addedCount = 0;
                        for (const item of allStockItems) {
                            if (!seen.has(item)) {
                                seen.add(item);
                                merged.push(item);
                                addedCount++;
                            }
                        }
                        this.input = merged.join('\n\n');
                        this.stockNotice = `已合并 ${addedCount} 个新项目 (去重后共 ${merged.length} 项)`;
                    }
                    localStorage.setItem('inputTextarea', this.input);
                    setTimeout(() => { this.stockNotice = ''; }, 4000);
                } catch (e) {
                    console.error('Failed to load stock:', e);
                    this.stockNotice = '加载库存失败，请稍后重试';
                    setTimeout(() => { this.stockNotice = ''; }, 3500);
                } finally {
                    this.loadingStock = false;
                }
            },

            async submitForm() {
                this.loading = true;
                try {
                    // 1. 自动将当前输入源中的节点和订阅保存到库存
                    try {
                        const saveRes = await fetch('/api/stock', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: this.input })
                        });
                        if (saveRes.ok) {
                            const saveJson = await saveRes.json();
                            if (saveJson?.token) {
                                this.fixedSubToken = saveJson.token;
                            }
                        }
                    } catch (e) {
                        console.warn('Auto save stock warning:', e);
                    }

                    // 确定固定短链 Code
                    let token = this.customShortCode?.trim() || this.fixedSubToken;
                    if (!token) {
                        try {
                            const tokenRes = await fetch('/api/sub-token');
                            const tokenJson = await tokenRes.json();
                            if (tokenJson?.token) {
                                token = tokenJson.token;
                                this.fixedSubToken = token;
                            }
                        } catch {}
                    }
                    if (!token) token = 'sub';

                    // 2. 构造指向该订阅合并源的完整参数
                    const origin = window.location.origin;
                    const tokenUrl = `${origin}/${token}`;

                    const customRulesInput = document.querySelector('input[name="customRules"]');
                    const customRules = customRulesInput && customRulesInput.value ? JSON.parse(customRulesInput.value) : [];

                    const params = new URLSearchParams();
                    params.append('config', tokenUrl);
                    params.append('ua', this.customUA);
                    params.append('selectedRules', JSON.stringify(this.selectedRules));
                    params.append('customRules', JSON.stringify(customRules));

                    if (this.groupByCountry) params.append('group_by_country', 'true');
                    if (!this.includeAutoSelect) params.append('include_auto_select', 'false');
                    if (this.enableClashUI) params.append('enable_clash_ui', 'true');
                    if (this.externalController) params.append('external_controller', this.externalController);
                    if (this.externalUiDownloadUrl) params.append('external_ui_download_url', this.externalUiDownloadUrl);

                    const urlParams = new URLSearchParams(window.location.search);
                    const configId = this.currentConfigId || urlParams.get('configId');
                    if (configId) {
                        params.append('configId', configId);
                    }

                    const queryString = params.toString();

                    // 完整长链接（用于展开查看）
                    this.generatedLinks = {
                        xray: origin + '/xray?' + queryString,
                        singbox: origin + '/singbox?' + queryString,
                        clash: origin + '/clash?' + queryString,
                        surge: origin + '/surge?' + queryString
                    };

                    // 3. 直接生成固定短链接
                    this.shortenedLinks = {
                        xray: `${origin}/x/${token}`,
                        singbox: `${origin}/b/${token}`,
                        clash: `${origin}/c/${token}`,
                        surge: `${origin}/s/${token}`
                    };

                    // 同步向后端注册短链 query 映射
                    fetch(`${origin}/shorten-v2?url=${encodeURIComponent(origin + '/clash?' + queryString)}&shortCode=${encodeURIComponent(token)}`).catch(() => {});

                    this.showFullUrls = false;

                    // 滚动到结果区
                    setTimeout(() => {
                        const resultsDiv = document.querySelector('.mt-12');
                        if (resultsDiv) {
                            resultsDiv.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 100);

                } catch (error) {
                    console.error('Error generating links:', error);
                    alert(window.APP_TRANSLATIONS.errorGeneratingLinks || '生成链接失败');
                } finally {
                    this.loading = false;
                }
            },

            async shortenLinks() {
                // Check if links are already shortened
                if (this.shortenedLinks) {
                    alert(window.APP_TRANSLATIONS.alreadyShortened);
                    return;
                }

                if (!this.generatedLinks) {
                    return;
                }

                this.shortening = true;
                try {
                    const origin = window.location.origin;
                    const shortened = {};

                    // Use custom short code if provided, otherwise let backend generate it once
                    let shortCode = this.customShortCode.trim();
                    let isFirstRequest = true;

                    // Shorten each link type
                    for (const [type, url] of Object.entries(this.generatedLinks)) {
                        try {
                            let apiUrl = `${origin}/shorten-v2?url=${encodeURIComponent(url)}`;

                            // For the first request, either use custom code or let backend generate
                            // For subsequent requests, use the code from first request
                            if (shortCode) {
                                apiUrl += `&shortCode=${encodeURIComponent(shortCode)}`;
                            }

                            const response = await fetch(apiUrl);
                            if (!response.ok) {
                                throw new Error(`Failed to shorten ${type} link`);
                            }
                            const returnedCode = await response.text();

                            // If this is the first request and no custom code was provided,
                            // use the backend-generated code for all subsequent requests
                            if (isFirstRequest && !shortCode) {
                                shortCode = returnedCode;
                            }
                            isFirstRequest = false;

                            // Map types to their corresponding path prefixes
                            const prefixMap = {
                                xray: 'x',
                                singbox: 'b',
                                clash: 'c',
                                surge: 's'
                            };

                            shortened[type] = `${origin}/${prefixMap[type]}/${returnedCode}`;
                        } catch (error) {
                            console.error(`Error shortening ${type} link:`, error);
                            throw error;
                        }
                    }

                    this.shortenedLinks = shortened;
                } catch (error) {
                    console.error('Error shortening links:', error);
                    alert(window.APP_TRANSLATIONS.shortenFailed);
                } finally {
                    this.shortening = false;
                }
            },

            // Handle input change with debounce
            handleInputChange(val) {
                // Clear previous timer
                if (this.parseDebounceTimer) {
                    clearTimeout(this.parseDebounceTimer);
                }

                // If input is empty, don't try to parse
                if (!val || !val.trim()) {
                    return;
                }

                // Debounce for 500ms
                this.parseDebounceTimer = setTimeout(() => {
                    this.tryParseSubscriptionUrl(val.trim());
                }, 500);
            },

            // Check if input looks like a subscription URL
            isSubscriptionUrl(text) {
                // Check if it's a single line URL (not multiple lines)
                if (text.includes('\n')) {
                    return false;
                }

                try {
                    const url = new URL(text);
                    // Check if it matches our short link pattern: /[bcxs]/[code]
                    const pathMatch = url.pathname.match(/^\/([bcxs])\/([a-zA-Z0-9_-]+)$/);
                    if (pathMatch) {
                        return true;
                    }

                    // Check if it's a full subscription URL with query params
                    const fullMatch = url.pathname.match(/^\/(singbox|clash|xray|surge)$/);
                    if (fullMatch && url.search) {
                        return true;
                    }

                    return false;
                } catch {
                    return false;
                }
            },

            // Try to parse subscription URL
            async tryParseSubscriptionUrl(text) {
                if (!this.isSubscriptionUrl(text)) {
                    return;
                }

                this.parsingUrl = true;
                try {
                    let urlToParse;

                    try {
                        urlToParse = new URL(text);
                    } catch {
                        return;
                    }

                    // Check if it's a short link
                    const shortMatch = urlToParse.pathname.match(/^\/([bcxs])\/([a-zA-Z0-9_-]+)$/);

                    if (shortMatch) {
                        // It's a short link, resolve it first
                        const response = await fetch(`/resolve?url=${encodeURIComponent(text)}`);
                        if (!response.ok) {
                            console.warn('Failed to resolve short URL');
                            return;
                        }

                        const data = await response.json();
                        if (!data.originalUrl) {
                            console.warn('No original URL returned');
                            return;
                        }

                        urlToParse = new URL(data.originalUrl);
                    }

                    // Now parse the full URL and populate form
                    this.populateFormFromUrl(urlToParse);

                    // Show a success message
                    const message = window.APP_TRANSLATIONS?.urlParsedSuccess || '已成功解析订阅链接配置';
                    console.log(message);

                } catch (error) {
                    console.error('Error parsing subscription URL:', error);
                } finally {
                    this.parsingUrl = false;
                }
            },

            // Populate form fields from parsed URL
            populateFormFromUrl(url) {
                const params = new URLSearchParams(url.search);

                // Extract config (the original subscription URLs)
                const config = params.get('config');
                if (config) {
                    this.input = config;
                }

                // Extract selectedRules
                const selectedRules = params.get('selectedRules');
                if (selectedRules) {
                    try {
                        const parsed = JSON.parse(selectedRules);
                        if (Array.isArray(parsed)) {
                            this.selectedRules = parsed;
                            this.selectedPredefinedRule = 'custom';
                        }
                    } catch (e) {
                        console.warn('Failed to parse selectedRules:', e);
                    }
                }

                // Extract customRules
                const customRules = params.get('customRules');
                if (customRules) {
                    try {
                        const parsed = JSON.parse(customRules);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            // Dispatch custom event for CustomRules component to listen
                            window.dispatchEvent(new CustomEvent('restore-custom-rules', {
                                detail: { rules: parsed }
                            }));
                        }
                    } catch (e) {
                        console.warn('Failed to parse customRules:', e);
                    }
                }

                // Extract other parameters
                this.groupByCountry = params.get('group_by_country') === 'true';
                this.includeAutoSelect = params.get('include_auto_select') !== 'false';
                this.enableClashUI = params.get('enable_clash_ui') === 'true';

                const externalController = params.get('external_controller');
                if (externalController) {
                    this.externalController = externalController;
                }

                const externalUiDownloadUrl = params.get('external_ui_download_url');
                if (externalUiDownloadUrl) {
                    this.externalUiDownloadUrl = externalUiDownloadUrl;
                }

                const ua = params.get('ua');
                if (ua) {
                    this.customUA = ua;
                }

                const configId = params.get('configId');
                if (configId) {
                    this.currentConfigId = configId;
                    this.updateConfigIdInUrl(configId);
                }

                // Expand advanced options if any advanced settings are present
                if (selectedRules || customRules || this.groupByCountry || this.enableClashUI ||
                    externalController || externalUiDownloadUrl || ua || configId) {
                    this.showAdvanced = true;
                }
            }
        }
    }
};
