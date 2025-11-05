<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class TelegramBroadcast extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target' => 'required|string|in:all,active,history,plan',
            'message' => 'required|string|min:1|max:2000',
            'plan_ids' => 'array',
            'plan_ids.*' => 'integer|exists:v2_plan,id'
        ];
    }
}
