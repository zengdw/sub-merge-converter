/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { PREDEFINED_RULE_SETS, UNIFIED_RULES } from '../config/index.js';
import { CustomRules } from './CustomRules.jsx';
import { ValidatedTextarea } from './ValidatedTextarea.jsx';
import { formLogicFn } from './formLogic.js';

const LINK_FIELDS = [
  { key: 'xray', labelKey: 'xrayLink' },
  { key: 'singbox', labelKey: 'singboxLink' },
  { key: 'clash', labelKey: 'clashLink' },
  { key: 'surge', labelKey: 'surgeLink' }
];

export const Form = (props) => {
  const { t, lang } = props;

  const translations = {
    processing: t('processing'),
    convert: t('convert'),
    saveConfigSuccess: t('saveConfigSuccess'),
    saveConfig: t('saveConfig'),
    savingConfig: t('savingConfig'),
    configContentRequired: t('configContentRequired'),
    configSaveFailed: t('configSaveFailed'),
    confirmClearConfig: t('confirmClearConfig'),
    confirmClearAll: t('confirmClearAll'),
    confirmOverwriteStock: t('confirmOverwriteStock'),
    errorGeneratingLinks: t('errorGeneratingLinks'),
    shortenLinks: t('shortenLinks'),
    shortening: t('shortening'),
    alreadyShortened: t('alreadyShortened'),
    shortenFailed: t('shortenFailed'),
    customShortCode: t('customShortCode'),
    optional: t('optional'),
    customShortCodePlaceholder: t('customShortCodePlaceholder'),
    showFullLinks: t('showFullLinks')
  };

  const scriptContent = `
    window.APP_TRANSLATIONS = ${JSON.stringify(translations)};
    window.PREDEFINED_RULE_SETS = ${JSON.stringify(PREDEFINED_RULE_SETS)};
    window.APP_LANG = ${JSON.stringify(lang || 'zh-CN')};
    if (typeof __name === 'undefined') { var __name = function(fn) { return fn; }; }
    (${formLogicFn.toString()})();
  `;

  return (
    <div x-data="formData()" x-init="init()" class="max-w-4xl mx-auto">
      <form {...{'x-on:submit.prevent': 'submitForm'}} class="space-y-8">

      {/* Input Section */}
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-md">
        {/* Header: Label, Mode Switcher, Actions */}
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-3 flex-wrap">
            <span class="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <i class="fas fa-link text-sm"></i>
            </span>
            <label for="input" class="text-lg font-semibold text-gray-900 dark:text-white">
              {t('shareUrls')}
            </label>

            {/* View Mode Toggle: Cards vs Raw Text */}
            <div class="inline-flex p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl text-xs font-medium">
              <button
                type="button"
                x-on:click="switchInputView('cards')"
                x-bind:class="inputViewMode === 'cards' ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'"
                class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5"
                title={t('nodeListTooltip')}
              >
                <i class="fas fa-layer-group text-xs"></i>
                <span>{t('nodeList')}</span>
                <span
                  x-show="parsedInputNodes.length > 0"
                  x-text="parsedInputNodes.length"
                  class="px-1.5 py-0.2 rounded-full text-[10px] bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-semibold"
                ></span>
              </button>
              <button
                type="button"
                x-on:click="switchInputView('text')"
                x-bind:class="inputViewMode === 'text' ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'"
                class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5"
                title={t('sourceTextTooltip')}
              >
                <i class="fas fa-code text-xs"></i>
                <span>{t('sourceText')}</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div class="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              x-on:click="loadFromStock()"
              x-bind:disabled="loadingStock"
              class="px-2.5 py-1 text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors flex items-center gap-1.5 border border-primary-200/50 dark:border-primary-800/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              title={t('loadFromStockTooltip')}
            >
              <i class="fas" x-bind:class="loadingStock ? 'fa-spinner fa-spin' : 'fa-box-open'"></i>
              <span>{t('loadFromStock')}</span>
            </button>
            
            <button
              type="button"
              x-show="parsedInputNodes.length > 1"
              x-on:click="formatInputSpacing()"
              class="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
              title={t('formatSpacingTooltip')}
            >
              <i class="fas fa-align-left text-xs"></i>
              <span class="hidden sm:inline">{t('formatSpacing')}</span>
            </button>

            <button
              type="button"
              x-on:click="navigator.clipboard.readText().then(text => { input = text; formatInputSpacing(); }).catch(() => {})"
              class="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
              title={t('paste')}
            >
              <i class="fas fa-paste text-xs"></i>
              <span class="hidden sm:inline">{t('paste')}</span>
            </button>

            <button
              type="button"
              x-show="input"
              x-on:click="input = ''"
              class="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1"
              title={t('clear')}
            >
              <i class="fas fa-times text-xs"></i>
              <span class="hidden sm:inline">{t('clear')}</span>
            </button>
          </div>
        </div>

        {/* View 1: Cards View */}
        <div x-show="inputViewMode === 'cards'" class="transition-all duration-200">
          {/* Empty State */}
          <div
            x-show="parsedInputNodes.length === 0"
            class="py-10 px-4 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col items-center justify-center gap-3"
          >
            <div class="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center text-lg">
              <i class="fas fa-cubes"></i>
            </div>
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('noNodeData')}
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
              {t('emptyNodePrompt')}
            </p>
            <div class="flex items-center gap-2 mt-1">
              <button
                type="button"
                x-on:click="loadFromStock()"
                class="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <i class="fas fa-box-open"></i>
                <span>{t('loadFromStock')}</span>
              </button>
              <button
                type="button"
                x-on:click="switchInputView('text')"
                class="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition cursor-pointer"
              >
                {t('switchToSourceText')}
              </button>
            </div>
          </div>

          {/* Cards List */}
          <div
            x-show="parsedInputNodes.length > 0"
            class="space-y-3 max-h-[460px] overflow-y-auto pr-1"
          >
            <template x-for="(node, idx) in parsedInputNodes" {...{ ':key': 'idx' }}>
              <div class="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-800/80 hover:border-primary-400/60 dark:hover:border-primary-500/60 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm flex flex-col gap-2">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      class="px-2 py-0.5 rounded text-[11px] font-bold border tracking-wider uppercase shrink-0"
                      x-bind:class="node.badgeClass"
                      x-text="node.type"
                    ></span>
                    <span
                      class="font-semibold text-sm text-gray-900 dark:text-white truncate"
                      x-text="node.name"
                      title={t('nodeRemark')}
                    ></span>
                    <span
                      x-show="node.address"
                      class="text-xs font-mono text-gray-400 dark:text-gray-500 truncate hidden md:inline"
                      x-text="node.address"
                    ></span>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      x-on:click="copyNodeUrl(node.raw)"
                      class="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors cursor-pointer"
                      title={t('copyNodeUrl')}
                    >
                      <i class="far fa-copy text-xs"></i>
                    </button>
                    <button
                      type="button"
                      x-on:click="removeNodeAtIndex(idx)"
                      class="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title={t('deleteNode')}
                    >
                      <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </div>
                <div
                  class="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate bg-white/70 dark:bg-gray-900/60 px-2.5 py-1.5 rounded-lg border border-gray-150 dark:border-gray-755 select-all"
                  x-text="node.raw"
                  title={t('rawNodeUrl')}
                ></div>
              </div>
            </template>
          </div>
        </div>

        {/* View 2: Raw Text View (Always in DOM for form submission & x-model) */}
        <div x-show="inputViewMode === 'text'" class="transition-all duration-200">
          <textarea
            id="input"
            name="input"
            x-model="input"
            rows={7}
            placeholder={t('urlPlaceholder')}
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono text-xs sm:text-sm leading-relaxed bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-y placeholder-gray-400 dark:placeholder-gray-500"
          ></textarea>
          <div class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t('inputTip')}</span>
            <span x-show="parsedInputNodes.length > 0" x-text="`${parsedInputNodes.length} ${t('itemsUnit')}`" class="font-medium text-primary-600 dark:text-primary-400"></span>
          </div>
        </div>

        {/* Notice line */}
        <div
          x-show="stockNotice"
          x-text="stockNotice"
          class="mt-3 text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-1.5 transition-all"
          style="display: none;"
        ></div>
      </div>

      {/* Advanced Options Toggle */}
      <div 
        class="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" 
        x-on:click="showAdvanced = !showAdvanced"
        role="button"
        tabindex="0"
        {...{
          'x-on:keydown.enter.prevent': 'showAdvanced = !showAdvanced',
          'x-on:keydown.space.prevent': 'showAdvanced = !showAdvanced'
        }}
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <i class="fas fa-sliders-h"></i>
          </div>
          <span class="font-semibold text-gray-900 dark:text-white">{t('advancedOptions')}</span>
        </div>
        <div 
          class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-transform duration-300" 
          x-bind:class="{'rotate-180': showAdvanced}"
        >
          <i class="fas fa-chevron-down"></i>
        </div>
      </div>

  {/* Advanced Options Content */ }
  <div x-show="showAdvanced" {...{'x-transition:enter': 'transition ease-out duration-300', 'x-transition:enter-start': 'opacity-0 transform -translate-y-4', 'x-transition:enter-end': 'opacity-100 transform translate-y-0', 'x-transition:leave': 'transition ease-in duration-200', 'x-transition:leave-start': 'opacity-100 transform translate-y-0', 'x-transition:leave-end': 'opacity-0 transform -translate-y-4'}} class="space-y-6">

    {/* Rule Selection */ }
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i class="fas fa-filter text-gray-400"></i>
          {t('ruleSelection')}
        </h3>
        <select x-model="selectedPredefinedRule" x-on:change="applyPredefinedRule()" class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
        <option value="custom">{t('custom')}</option>
        <option value="minimal">{t('minimal')}</option>
        <option value="balanced">{t('balanced')}</option>
        <option value="comprehensive">{t('comprehensive')}</option>
      </select>
          </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {UNIFIED_RULES.map((rule) => (
      <label class="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group">
        <input
          type="checkbox"
          value={rule.name}
          x-model="selectedRules" 
                    x-on:change="selectedPredefinedRule = 'custom'"
        class="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                  />
        <span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
          {t(`outboundNames.${rule.name}`)}
        </span>
      </label>
    ))}
  </div>

          </div>

  {/* Custom Rules Component */ }
  <CustomRules t={t} />

    {/* General Options */ }
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <i class="fas fa-cog text-gray-400"></i>
              {t('generalSettings')}
            </h3>
            
            <div class="space-y-4">
              <label class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                <span class="font-medium text-gray-700 dark:text-gray-300">{t('groupByCountry')}</span>
                <div class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" x-model="groupByCountry" class="sr-only peer" />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </div>
              </label>

              <label class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                <span class="font-medium text-gray-700 dark:text-gray-300">{t('includeAutoSelect')}</span>
                <div class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" x-model="includeAutoSelect" class="sr-only peer" />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </div>
              </label>

              <label class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                <span class="font-medium text-gray-700 dark:text-gray-300">{t('enableClashUI')}</span>
                <div class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" x-model="enableClashUI" class="sr-only peer" />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </div>
              </label>

              <div
                x-show="enableClashUI"
                {...{
                  'x-transition:enter': 'transition ease-out duration-200',
                  'x-transition:enter-start': 'opacity-0 transform -translate-y-2',
                  'x-transition:enter-end': 'opacity-100 transform translate-y-0',
                  'x-transition:leave': 'transition ease-in duration-150',
                  'x-transition:leave-start': 'opacity-100 transform translate-y-0',
                  'x-transition:leave-end': 'opacity-0 transform -translate-y-2'
                }}
                class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
              >
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('externalController')}</label>
                  <input type="text" x-model="externalController" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder={t('externalControllerPlaceholder')} />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('externalUiDownloadUrl')}</label>
                  <input type="text" x-model="externalUiDownloadUrl" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder={t('externalUiDownloadUrlPlaceholder')} />
                </div>
              </div>
          </div>
          </div>

  {/* Subconverter External Config */}
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
      <i class="fas fa-file-export text-gray-400"></i>
      {t('subconverterConfigTitle')}
    </h3>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('subconverterConfigDesc')}</p>
    <div class="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <p class="font-mono text-sm text-gray-600 dark:text-gray-400 break-all" x-text="getSubconverterUrl()"></p>
    </div>
    <div class="mt-3 flex justify-end">
      <button
        type="button"
        x-on:click="copySubconverterUrl()"
        class="px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
        x-bind:class="subconverterCopied ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
      >
        <i class="fas" x-bind:class="subconverterCopied ? 'fa-check' : 'fa-copy'"></i>
        <span x-text={`subconverterCopied ? '${t('copiedSubconverterUrl')}' : '${t('copySubconverterUrl')}'`}></span>
      </button>
    </div>
  </div>

  {/* Base Config */ }
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <i class="fas fa-file-code text-gray-400"></i>
                {t('baseConfigSettings')}
              </h3>
              <select x-model="configType" class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option value="singbox">SingBox (JSON)</option>
                <option value="clash">Clash (YAML)</option>
                <option value="surge">Surge (JSON/INI)</option>
              </select>
          </div>
            
            <ValidatedTextarea
              id="configEditor"
              name="configEditor"
              model="configEditor"
              rows={5}
              placeholder="Paste your custom config here..."
              variant="mono"
              containerClass="mt-0 group"
              labelWrapperClass="flex items-center justify-end mb-2"
              labelActionsWrapperClass="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              pasteLabel={t('paste')}
              clearLabel={t('clear')}
              validation={{
                button: {
                  key: 'validate-config',
                  label: t('validateConfig'),
                  className:
                    'px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2',
                  attrs: {
                    'x-on:click': 'validateBaseConfig()'
                  }
                },
                success: {
                  show: "configValidationState === 'success'",
                  textExpr: 'configValidationMessage'
                },
                error: {
                  show: "configValidationState === 'error'",
                  textExpr: 'configValidationMessage'
                }
              }}
              inlineActionsWrapperClass="absolute bottom-4 right-4 flex gap-2"
              preserveLabelSpace={false}
            />
            
            <div class="flex justify-end gap-3 mt-4">
              <button 
                type="button" 
                x-on:click="saveBaseConfig()" 
                x-bind:disabled="savingConfig"
                class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <i class="fas" x-bind:class="savingConfig ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                <span x-text="savingConfig ? savingConfigText : saveConfigText">{t('saveConfig')}</span>
              </button>
              <button type="button" x-on:click="clearBaseConfig()" class="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium text-sm" >
  { t('clearConfig') }
              </button>
          </div>
          </div >

  {/* User Agent */ }
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <i class="fas fa-user-secret text-gray-400"></i>
              {t('UASettings')}
            </h3>
            <input 
              type="text" 
              x-model="customUA" 
              class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
              placeholder="curl/7.74.0" 
            />
          </div>
        </div>

  {/* Action Buttons */ }
  <div class="flex flex-col sm:flex-row gap-4">
          <button 
            type="submit" 
            class="flex-1 py-3.5 px-6 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            x-bind:disabled="loading"
          >
            <i class="fas fa-sync-alt" x-bind:class="loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'"></i>
            <span x-text="loading ? processingText : convertText">{t('convert')}</span>
          </button>

  <button
    type="button" 
            x-on:click="clearAll()"
class="px-6 py-3.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
  >
  <i class="fas fa-trash-alt"></i>
{ t('clear') }
          </button>
        </div>
      </form>

  {/* Results Section */ }
  <div x-cloak x-show="generatedLinks" x-data="{ copied: null }" {...{'x-transition:enter': 'transition ease-out duration-500', 'x-transition:enter-start': 'opacity-0 transform translate-y-8', 'x-transition:enter-end': 'opacity-100 transform translate-y-0'}} class="mt-12">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-all duration-300 hover:shadow-md">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
              <i class="fas fa-link text-sm"></i>
            </span>
            {t('subscriptionLinks')}
          </h2>
          <p class="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1.5 font-medium">
            <i class="fas fa-check-circle"></i>
            <span>{t('autoSavedNotice')}</span>
          </p>
        </div>

        <button
          type="button"
          x-on:click="showFullUrls = !showFullUrls"
          class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <i class="fas" x-bind:class="showFullUrls ? 'fa-compress-alt' : 'fa-expand-alt'"></i>
          <span x-text={`showFullUrls ? '${t('showShortLinks')}' : '${t('showFullLinksBtn')}'`}></span>
        </button>
      </div>

      <div class="mt-6 space-y-4">
        {LINK_FIELDS.map((field) => (
          <div class="relative group" key={field.key}>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t(field.labelKey)}
              </label>
              <span class="text-xs text-gray-400 dark:text-gray-500 font-mono" x-show="!showFullUrls">{t('fixedShortLink')}</span>
            </div>
            <div class="flex gap-2">
              <input
                type="text"
                readonly
                x-bind:value={`showFullUrls ? generatedLinks?.${field.key} : (shortenedLinks ? shortenedLinks?.${field.key} : generatedLinks?.${field.key})`}
                class="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:border-transparent transition-all duration-200 font-mono text-sm"
                x-bind:class="!showFullUrls ? 'text-primary-600 dark:text-primary-400 font-semibold focus:ring-primary-500' : 'text-gray-600 dark:text-gray-400 focus:ring-green-500'"
              />
              <button
                type="button"
                x-on:click={`navigator.clipboard.writeText((showFullUrls ? generatedLinks : (shortenedLinks || generatedLinks))?.${field.key}); copied = '${field.key}'; setTimeout(() => copied = null, 2000)`}
                class="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer"
                x-bind:class={`copied === '${field.key}' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : ''`}
                title={t('copy')}
              >
                <i class="fas" x-bind:class={`copied === '${field.key}' ? 'fa-check' : 'fa-copy'`}></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custom short code optional control */}
      <div class="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div class="flex items-center gap-2">
          <i class="fas fa-info-circle text-primary-500"></i>
          <span>{t('clientSyncNotice')}</span>
        </div>
        <div class="flex items-center gap-2">
          <span>{t('customShortCodeLabel')}</span>
          <input
            type="text"
            x-model="customShortCode"
            placeholder={t('customShortCodeDefault')}
            class="px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs w-28 text-center focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  </div>

  {/* Custom Stock Overwrite Confirmation Modal */}
  <div
        x-cloak
        x-show="showStockOverwriteModal"
        class="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
        {...{
          'x-transition:enter': 'transition ease-out duration-300',
          'x-transition:enter-start': 'opacity-0',
          'x-transition:enter-end': 'opacity-100',
          'x-transition:leave': 'transition ease-in duration-200',
          'x-transition:leave-start': 'opacity-100',
          'x-transition:leave-end': 'opacity-0'
        }}
      >
        {/* Backdrop */}
        <div
          class="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm transition-opacity"
          x-on:click="cancelStockOverwrite()"
        ></div>

        {/* Modal Card */}
        <div
          class="relative w-full max-w-md bg-white dark:bg-gray-850 rounded-2xl shadow-2xl border border-gray-150 dark:border-gray-700/80 overflow-hidden transform transition-all z-10"
          {...{
            'x-transition:enter': 'transition ease-out duration-300',
            'x-transition:enter-start': 'opacity-0 translate-y-4 scale-95',
            'x-transition:enter-end': 'opacity-100 translate-y-0 scale-100',
            'x-transition:leave': 'transition ease-in duration-200',
            'x-transition:leave-start': 'opacity-100 translate-y-0 scale-100',
            'x-transition:leave-end': 'opacity-0 translate-y-4 scale-95'
          }}
        >
          {/* Top highlight bar */}
          <div class="h-1.5 w-full bg-gradient-to-r from-amber-400 via-rose-500 to-primary-500"></div>

          <div class="p-6">
            {/* Header: Icon, Title, Close Button */}
            <div class="flex items-start justify-between gap-4 mb-5">
              <div class="flex items-center gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 flex items-center justify-center text-xl flex-shrink-0 shadow-sm border border-amber-200/50 dark:border-amber-700/40">
                  <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div>
                  <h3 id="modal-headline" class="text-base font-bold text-gray-900 dark:text-white">
                    {t('stockOverwriteModalTitle')}
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('stockOverwriteModalSubtitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                x-on:click="cancelStockOverwrite()"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors cursor-pointer"
                title={t('cancel')}
              >
                <i class="fas fa-times text-sm"></i>
              </button>
            </div>

            {/* Stats Badge Grid */}
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div class="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
                <div class="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <i class="fas fa-boxes text-xs"></i>
                  <span>{t('stockExistingNodes')}</span>
                </div>
                <div class="text-lg font-bold text-blue-900 dark:text-blue-200 mt-1">
                  <span x-text="stockOverwriteInfo.totalCount"></span>
                  <span class="text-xs font-normal text-blue-600 dark:text-blue-400 ml-1">{t('itemsUnit')}</span>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40">
                <div class="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <i class="fas fa-trash-alt text-xs"></i>
                  <span>{t('stockMissingNodes')}</span>
                </div>
                <div class="text-lg font-bold text-rose-900 dark:text-rose-200 mt-1">
                  <span x-text="stockOverwriteInfo.missingCount"></span>
                  <span class="text-xs font-normal text-rose-600 dark:text-rose-400 ml-1">{t('itemsUnit')}</span>
                </div>
              </div>
            </div>

            {/* Warning Message Box */}
            <div class="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-800/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed mb-4 flex items-start gap-2.5">
              <i class="fas fa-info-circle text-amber-500 mt-0.5 flex-shrink-0"></i>
              <span>{t('stockOverwriteModalDesc')}</span>
            </div>

            {/* Action Buttons */}
            <div class="space-y-2.5">
              {/* Primary Recommended: Merge & Convert */}
              <button
                type="button"
                x-on:click="mergeStockAndSubmit()"
                class="w-full py-2.5 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl font-semibold shadow-md shadow-primary-500/25 hover:shadow-primary-500/35 transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <i class="fas fa-object-group"></i>
                <span>{t('mergeStockAndConvert')}</span>
              </button>

              <div class="flex items-center gap-2 pt-1">
                {/* Secondary: Cancel */}
                <button
                  type="button"
                  x-on:click="cancelStockOverwrite()"
                  class="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i class="fas fa-arrow-left text-[11px]"></i>
                  <span>{t('cancelReturn')}</span>
                </button>

                {/* Dangerous: Force Overwrite */}
                <button
                  type="button"
                  x-on:click="confirmStockOverwrite()"
                  class="flex-1 py-2 px-3 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title={t('confirmOverwriteStockBtn')}
                >
                  <i class="fas fa-exclamation-circle text-[11px]"></i>
                  <span>{t('confirmOverwriteStockBtn')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
