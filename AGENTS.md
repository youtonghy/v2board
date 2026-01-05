# Agent Guidelines

本项目的关键约束按“模块块”组织，便于后期分块维护和扩展。

## 模块 A：ConfigSave 验证规则

- 在 `App\Http\Requests\Admin\ConfigSave` 中扩展规则时，先把原有规则转换为数组再追加闭包（例如使用 `array_merge` 包裹）。
- 自定义验证器（如 `deposit_bounus`）必须先判断输入是否为数组，避免 `[] operator not supported for strings` 运行时错误。

提示：所有与后台保存相关的校验逻辑都遵循上述两条，避免保存失败。

## 模块 B：SSO 配置验证

- 在 `App\Http\Requests\Admin\ConfigSave` 里追加闭包校验时，先规范化字符串规则（如 `'nullable|string'`）为数组再 `array_merge`，否则会触发不存在的 `validateNullable|string` 方法。
- 可使用 `explode('|', $rule)` 或复用已有的 `normalizeRule()` 流程进行规则规范化。

## 模块 C：前端登录按钮（Telegram/SSO）

- 通过 JS 在 `#/login` 注入按钮时，`findAuthActionContainer` 必须在全局作用域声明，并在 Telegram/SSO 模块运行前可用；放在某个 IIFE 内会导致另一模块无法访问，按钮消失。
- 容器查找优先级：`.v2board-auth-box .form-group.mb-0` → `.form-group.mb-0` → 最后一个 `.block-content button.btn` 的父级，确保主题切换兼容。
- 按钮样式与主登录按钮一致：`btn btn-block btn-primary font-w400 mt-3`；仅在加载/禁用态切换为 `btn-secondary`。
