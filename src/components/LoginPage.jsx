/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { Layout } from './Layout.jsx';
import { APP_NAME } from '../constants.js';
import { SUPPORTED_LANGUAGES } from './Navbar.jsx';

export const LoginPage = ({ error = false, lang = 'zh-CN' }) => {
    const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0];

    return (
        <Layout title={`登录 - ${APP_NAME}`} description="请输入管理员账号密码以访问服务">
            <div class="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden">
                {/* Background decorative glows */}
                <div class="absolute -top-40 -left-40 w-96 h-96 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 dark:purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

                {/* Top right action buttons */}
                <div class="absolute top-6 right-6 flex items-center gap-2.5 z-20">
                    {/* Language Selector Dropdown */}
                    <div class="relative" x-data="{ langMenuOpen: false }">
                        <button
                            type="button"
                            class="px-2.5 py-2 rounded-xl bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200/80 dark:border-gray-700/80 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                            x-on:click="langMenuOpen = !langMenuOpen"
                            aria-label="Switch language"
                            title="切换语言 / Switch language"
                        >
                            <i class="fas fa-globe text-primary-500"></i>
                            <span>{currentLangObj.short}</span>
                            <i class="fas fa-chevron-down text-[10px] text-gray-400 transition-transform duration-200" x-bind:class="langMenuOpen ? 'rotate-180' : ''"></i>
                        </button>

                        <div
                            x-cloak
                            x-show="langMenuOpen"
                            {...{
                                'x-on:click.outside': 'langMenuOpen = false',
                                'x-transition:enter': 'transition ease-out duration-150',
                                'x-transition:enter-start': 'opacity-0 scale-95 translate-y-1',
                                'x-transition:enter-end': 'opacity-100 scale-100 translate-y-0',
                                'x-transition:leave': 'transition ease-in duration-100',
                                'x-transition:leave-start': 'opacity-100 scale-100 translate-y-0',
                                'x-transition:leave-end': 'opacity-0 scale-95 translate-y-1'
                            }}
                            class="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-850 rounded-xl shadow-xl border border-gray-150 dark:border-gray-700 py-1.5 z-50 overflow-hidden"
                        >
                            {SUPPORTED_LANGUAGES.map((l) => (
                                <button
                                    type="button"
                                    key={l.code}
                                    class={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                        l.code === lang
                                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                                    }`}
                                    x-on:click={`document.cookie = 'lang=${l.code};path=/;max-age=31536000'; const u = new URL(window.location.href); u.searchParams.set('lang', '${l.code}'); window.location.href = u.href;`}
                                >
                                    <span class="flex items-center gap-2">
                                        <span>{l.flag}</span>
                                        <span>{l.label}</span>
                                    </span>
                                    {l.code === lang && <i class="fas fa-check text-[10px] text-primary-500"></i>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        class="p-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                        x-on:click="toggleDarkMode()"
                        aria-label="Toggle dark mode"
                    >
                        <i class="fas" x-bind:class="darkMode ? 'fa-sun' : 'fa-moon'"></i>
                    </button>
                </div>

                {/* Login Card */}
                <div class="w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/80 dark:border-gray-700/80 p-8 transition-all duration-300 z-10">
                    <div class="text-center mb-8">
                        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 shadow-sm border border-primary-200/40 dark:border-primary-800/40">
                            <i class="fas fa-shield-alt text-2xl"></i>
                        </div>
                        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {APP_NAME}
                        </h1>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            服务已启用安全访问控制，请输入账号密码继续
                        </p>
                    </div>

                    {error && (
                        <div class="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2.5 animate-shake">
                            <i class="fas fa-exclamation-circle text-sm"></i>
                            <span>账号或密码错误，请检查配置后重试</span>
                        </div>
                    )}

                    <form method="POST" action="/login" class="space-y-5" x-data="{ showPass: false, submitting: false }" x-on:submit="submitting = true">
                        <div>
                            <label for="username" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                                管理员账号
                            </label>
                            <div class="relative">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                                    <i class="fas fa-user text-sm"></i>
                                </span>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    required
                                    autofocus
                                    autocomplete="username"
                                    placeholder="请输入账号 (如 zengd)"
                                    class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label for="password" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                                访问密码
                            </label>
                            <div class="relative">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                                    <i class="fas fa-lock text-sm"></i>
                                </span>
                                <input
                                    x-bind:type="showPass ? 'text' : 'password'"
                                    id="password"
                                    name="password"
                                    required
                                    autocomplete="current-password"
                                    placeholder="请输入密码"
                                    class="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                                />
                                <button
                                    type="button"
                                    x-on:click="showPass = !showPass"
                                    class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    aria-label="Toggle password visibility"
                                >
                                    <i class="fas" x-bind:class="showPass ? 'fa-eye-slash' : 'fa-eye'"></i>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            x-bind:disabled="submitting"
                            class="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            <i class="fas" x-bind:class="submitting ? 'fa-spinner fa-spin' : 'fa-sign-in-alt'"></i>
                            <span x-text="submitting ? '正在验证...' : '立即登录'">立即登录</span>
                        </button>
                    </form>

                    <div class="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/60 text-center">
                        <p class="text-[11px] text-gray-400 dark:text-gray-500">
                            提示：可在服务端环境变量（AUTH_USERNAME / AUTH_PASSWORD）或 data/credentials.json 中直接修改账号密码
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
