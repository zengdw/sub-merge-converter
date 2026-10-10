/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO } from '../constants.js';

export const Navbar = () => {
    return (
        <nav class="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800 z-50 transition-all duration-300">
            <div class="container mx-auto px-4">
                <div class="flex items-center justify-between h-16">
                    <a href="#" class="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                        <img src="/favicon.ico" alt={`${APP_NAME} logo`} class="w-6 h-6" />
                        <span>{APP_NAME}</span>
                    </a>
                    <div class="flex items-center gap-3">
                        <a
                            href={GITHUB_REPO}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="px-4 py-2 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium"
                        >
                            <i class="fab fa-github"></i>
                            <span>GitHub</span>
                        </a>
                        <button
                            class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                            x-on:click="toggleDarkMode()"
                            aria-label="Toggle dark mode"
                        >
                            <i class="fas" x-bind:class="darkMode ? 'fa-sun' : 'fa-moon'"></i>
                        </button>
                        <a
                            href="/logout"
                            class="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1.5 text-sm"
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
