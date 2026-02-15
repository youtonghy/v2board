# V2Board Standalone Frontend Panel

A standalone frontend-backend separated web panel for V2Board. This panel can be deployed independently and only requires configuring the backend API URL.

## Quick Start

1. **Configure the Backend URL**

   Edit `config.js` and set your V2Board backend API URL:

   ```javascript
   window.V2BoardConfig = {
       apiBaseUrl: 'https://your-v2board-backend.com',
       // ... other settings
   };
   ```

2. **Deploy the Panel**

   Upload all files to your web server. The panel can be served from any static file hosting service (Nginx, Apache, Vercel, Netlify, etc.).

3. **Access the Panel**

   Open `index.html` in your browser or navigate to your deployed URL.

## Configuration Options

Edit `config.js` to customize your panel:

| Option | Description | Default |
|--------|-------------|---------|
| `apiBaseUrl` | Your V2Board backend URL | `''` (same domain) |
| `title` | Site title | `'V2Board Panel'` |
| `logo` | Logo URL | `''` |
| `telegram_login_enable` | Enable Telegram login | `false` |
| `sso_login_enable` | Enable SSO login | `false` |
| `sso_provider` | SSO provider name | `'casdoor'` |

## CORS Configuration

If deploying on a different domain than your backend, you need to enable CORS in the admin security settings first.

1. Go to `Admin -> Config -> Security`.
2. Enable `Allow Frontend-Backend Separation (CORS)`.
3. Set `CORS Allowed Origins` (one origin per line).
4. Keep your frontend domain in the whitelist.

By default this feature is disabled, so cross-origin frontend deployments are blocked until explicitly enabled.

### For Nginx (Backend)

If you terminate requests at Nginx and override headers there, keep the same whitelist policy and do not use `*`:

```nginx
location /api/ {
    add_header 'Access-Control-Allow-Origin' 'https://your-frontend-domain.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    if ($request_method = OPTIONS) {
        return 204;
    }
}
```

### Same Domain Deployment

If deploying on the same domain (recommended), no CORS configuration is needed. Simply leave `apiBaseUrl` empty.

## File Structure

```
standalone-panel/
├── index.html          # Main HTML file
├── config.js           # Configuration file (edit this!)
├── README.md           # This file
└── assets/
    ├── css/
    │   └── style.css   # Styles
    └── js/
        └── app.js      # Application logic
```

## Features

- ✅ Login / Register
- ✅ Dashboard with subscription info
- ✅ Plan subscription
- ✅ Order management
- ✅ Payment integration
- ✅ Ticket support system
- ✅ Knowledge base
- ✅ Invite system
- ✅ Profile management
- ✅ Telegram login
- ✅ SSO login
- ✅ TOTP 2FA

## License

This frontend is based on the Fantastic theme for V2Board.
