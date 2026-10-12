/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO } from '../constants.js';

export const SUPPORTED_LANGUAGES = [
    { code: 'zh-CN', label: '简体中文', short: '中文', flag: '🇨🇳' },
    { code: 'en-US', label: 'English', short: 'EN', flag: '🇺🇸' },
    { code: 'ru', label: 'Русский', short: 'RU', flag: '🇷🇺' },
    { code: 'fa', label: 'فارسی', short: 'FA', flag: '🇮🇷' }
];

export const Navbar = ({ lang = 'zh-CN' }) => {
    const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0];

    return (
        <nav class="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800 z-50 transition-all duration-300">
            <div class="container mx-auto px-4">
                <div class="flex items-center justify-between h-16">
                    <a href="#" class="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                        <img src="/favicon.ico" alt={`${APP_NAME} logo`} class="w-6 h-6" />
                        <span>{APP_NAME}</span>
                    </a>
                    <div class="flex items-center gap-2 sm:gap-3">
                        <a
                            href={GITHUB_REPO}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="px-3.5 py-1.5 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden md:flex items-center gap-2 font-medium"
                        >
                            <i class="fab fa-github"></i>
                            <span>GitHub</span>
                        </a>

                        {/* Language Selector Dropdown */}
                        <div class="relative" x-data="{ langMenuOpen: false }">
                            <button
                                type="button"
                                class="px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
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
                                class="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-150 dark:border-gray-700 py-1.5 z-50 overflow-hidden"
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

                        {/* Dark Mode Toggle */}
                        <button
                            class="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            x-on:click="toggleDarkMode()"
                            aria-label="Toggle dark mode"
                        >
                            <i class="fas" x-bind:class="darkMode ? 'fa-sun' : 'fa-moon'"></i>
                        </button>

                        {/* Logout Button */}
                        <a
                            href="/logout"
                            class="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1.5 text-sm"
                            title="退出登录"
                        >
                            <i class="fas fa-sign-out-alt"></i>
                            <span class="hidden sm:inline text-xs font-medium">退出</span>
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    );
};
