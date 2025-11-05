# Agent Guidelines

## Config Request Validation

- When extending `App\Http\Requests\Admin\ConfigSave`, always convert existing rule entries to arrays before appending closures (e.g. wrap in `array_merge`).
- Guard custom validators (like `deposit_bounus`) against non-array inputs to avoid `[] operator not supported for strings` runtime errors.

Keep these precautions in mind whenever adjusting validation logic to prevent save failures in the admin panel.
