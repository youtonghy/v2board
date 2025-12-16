/**
 * V2Board Standalone Panel Configuration
 * 
 * Edit this file to configure your panel settings.
 * You only need to set the apiBaseUrl to your backend server address.
 */
window.V2BoardConfig = {
    // ========================================
    // REQUIRED: Backend API URL
    // ========================================
    // Set this to your V2Board backend server URL
    // Example: 'https://api.example.com' or 'https://your-domain.com'
    // Leave empty if serving from the same domain as the backend
    apiBaseUrl: '',

    // ========================================
    // Site Settings
    // ========================================
    // These will be loaded from the backend if not specified
    title: 'V2Board Panel',
    logo: '',
    description: 'Your subscription management panel',

    // ========================================
    // Theme Settings
    // ========================================
    theme: {
        color: 'default', // Options: 'default', 'purple', 'orange'
    },
    background_url: '',

    // ========================================
    // Feature Toggles
    // ========================================
    // These will be overridden by backend config if available
    telegram_login_enable: false,
    sso_login_enable: false,
    sso_provider: 'casdoor',

    // ========================================
    // Supported Languages
    // ========================================
    i18n: [
        'zh-CN',
        'en-US',
        'ja-JP',
        'vi-VN',
        'ko-KR',
        'zh-TW',
        'fa-IR'
    ],

    // ========================================
    // Version
    // ========================================
    version: '1.0.0'
};

// Initialize settings object for compatibility
window.settings = {
    title: window.V2BoardConfig.title,
    assets_path: './assets',
    theme: window.V2BoardConfig.theme,
    version: window.V2BoardConfig.version,
    background_url: window.V2BoardConfig.background_url,
    description: window.V2BoardConfig.description,
    i18n: window.V2BoardConfig.i18n,
    logo: window.V2BoardConfig.logo,
    telegram_login_enable: window.V2BoardConfig.telegram_login_enable ? 1 : 0,
    sso_login_enable: window.V2BoardConfig.sso_login_enable ? 1 : 0,
    sso_provider: window.V2BoardConfig.sso_provider
};
