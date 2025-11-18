# Agent Guidelines

## Config Request Validation

- When extending `App\Http\Requests\Admin\ConfigSave`, always convert existing rule entries to arrays before appending closures (e.g. wrap in `array_merge`).
- Guard custom validators (like `deposit_bounus`) against non-array inputs to avoid `[] operator not supported for strings` runtime errors.

Keep these precautions in mind whenever adjusting validation logic to prevent save failures in the admin panel.

## SSO Config Validation

- When adding validation closures in `App\Http\Requests\Admin\ConfigSave`, always normalize string rules (e.g., `'nullable|string'`) into arrays before `array_merge`, otherwise the validator will try to call a nonexistent `validateNullable|string` method and saving will fail. Use a helper like `explode('|', $rule)` or reuse the existing `normalizeRule()` pattern.

## Frontend Login Buttons (Telegram/SSO)

- If adding login buttons via JS on `#/login`, ensure the helper that finds the button container (`findAuthActionContainer`) is declared in global scope before both Telegram and SSO modules run. Keeping it inside one IIFE will break the other module and both buttons disappear.
- Use the `.v2board-auth-box .form-group.mb-0` container first, then fall back to `.form-group.mb-0`, and finally to the parent of the last `.block-content button.btn` to tolerate theme changes.
- Match the primary login button style: `btn btn-block btn-primary font-w400 mt-3`; switch to `btn-secondary` only for loading/disabled states.
