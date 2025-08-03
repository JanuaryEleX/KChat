import { useState, useEffect } from 'react';
import { Settings } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import { getAvailableModels } from '../services/modelService';
import { loadSettings, saveSettings } from '../services/storageService';

const defaultSettings: Settings = {
  theme: 'light',
  language: 'en',
  apiKey: [],
  showSuggestions: false,
  defaultModel: 'gemini-1.0-pro', // 默认模型可以根据需要调整
  suggestionModel: 'gemini-1.0-pro',
  autoTitleGeneration: true,
  titleGenerationModel: 'gemini-1.0-pro',
  languageDetectionModel: 'gemini-1.0-pro',
  defaultSearch: false,
  useSearchOptimizerPrompt: false,
  showThoughts: true,
  enableGlobalSystemPrompt: false,
  globalSystemPrompt: '',
  optimizeFormatting: false,
  thinkDeeper: false,
  apiBaseUrl: '',
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [availableModels, setAvailableModels] = useState<string[]>(['gemini-1.0-pro', 'gemini-1.5-flash']);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const { setLanguage } = useLocalization();

  // Effect 1: 加载设置并应用环境变量
  useEffect(() => {
    const loadedSettings = loadSettings();
    const initialSettings = { ...defaultSettings, ...loadedSettings };
    if (!loadedSettings && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      initialSettings.theme = 'dark';
    }

    // [修改点 1] 使用 import.meta.env.VITE_API_BASE_URL 覆盖 API Base URL
    if (import.meta.env.VITE_API_BASE_URL) {
      initialSettings.apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    }

    // [修改点 2] 使用 import.meta.env.VITE_API_KEY 覆盖 API Key
    // 这使得环境变量的优先级高于用户本地存储的 Key
    if (import.meta.env.VITE_API_KEY) {
      // 环境变量中的 apiKey 应该是一个字符串，我们把它放到数组里
      initialSettings.apiKey = [import.meta.env.VITE_API_KEY];
    }

    setSettings(initialSettings);
    setLanguage(initialSettings.language);
    setIsStorageLoaded(true);
  }, [setLanguage]);

  // Effect 2: 保存设置到本地存储
  useEffect(() => {
    if (!isStorageLoaded) return;
    saveSettings(settings);
    document.body.classList.toggle('dark-mode', settings.theme === 'dark');
    setLanguage(settings.language);
  }, [settings, isStorageLoaded, setLanguage]);

  // Effect 3: 获取可用模型
  useEffect(() => {
    // [修改点 3] 这里的逻辑不再需要检查 process.env，因为它已经在第一个 effect 中处理过了
    const apiKeys = settings.apiKey || [];
    if (isStorageLoaded && apiKeys.length > 0) {
      getAvailableModels(apiKeys, settings.apiBaseUrl).then(models => {
        if (!models || models.length === 0) return;
        const allModels = [...new Set([...models, ...availableModels])];
        setAvailableModels(allModels);
        setSettings(current => {
          const newDefaults: Partial<Settings> = {};
          if (!allModels.includes(current.defaultModel)) newDefaults.defaultModel = allModels[0];
          // 为其他模型设置合理的默认值
          if (!allModels.includes(current.suggestionModel)) newDefaults.suggestionModel = allModels[0];
          if (!allModels.includes(current.titleGenerationModel)) newDefaults.titleGenerationModel = allModels[0];
          if (!allModels.includes(current.languageDetectionModel)) newDefaults.languageDetectionModel = allModels[0];
          return Object.keys(newDefaults).length > 0 ? { ...current, ...newDefaults } : current;
        });
      });
    }
  }, [isStorageLoaded, settings.apiKey, settings.apiBaseUrl]);

  return { settings, setSettings, availableModels, isStorageLoaded };
};
