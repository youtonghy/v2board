(function () {
  const userConfig = {
    /**
     * 后端地址（必填）
     * - 示例：https://api.example.com
     * - 为空则默认使用当前站点同源（适合前后端同域部署）
     */
    api_base: "",

    /**
     * 可选：站点标题（不填则用后端域名自动生成）
     */
    title: "",

    /**
     * 可选：开启/关闭登录按钮（不填会在运行时从后端 `/api/v3/guest/comm/config` 覆盖）
     */
    telegram_login_enable: 0,
    sso_login_enable: 0,

    /**
     * 可选：SSO Provider（默认 casdoor）
     */
    sso_provider: "casdoor",

    /**
     * 主题配置（可选）
     */
    theme_color: "default",
    background_url: "",

    /**
     * 自定义 HTML（可选，例如统计代码）
     */
    custom_html: ""
  };

  window.settings = Object.assign(
    {
      assets_path: "./assets",
      version: "standalone",
      description: "",
      logo: "",
      i18n: ["zh-CN", "en-US", "ja-JP", "vi-VN", "ko-KR", "zh-TW", "fa-IR"],
      theme: { color: "default" },
      background_url: ""
    },
    window.settings || {},
    {
      api_base: userConfig.api_base,
      title: userConfig.title,
      telegram_login_enable: userConfig.telegram_login_enable,
      sso_login_enable: userConfig.sso_login_enable,
      sso_provider: userConfig.sso_provider,
      theme: { color: userConfig.theme_color },
      background_url: userConfig.background_url,
      custom_html: userConfig.custom_html
    }
  );
})();
