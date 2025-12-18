<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

trait UserUpdateParamUtils
{
    private function normalizeOptionalInt($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (!is_numeric($value)) {
            return null;
        }
        return (int) round((float) $value);
    }

    private function filterParamsByExistingColumns(string $table, array $params): array
    {
        try {
            $columns = Schema::getColumnListing($table);
            return array_intersect_key($params, array_flip($columns));
        } catch (\Throwable $e) {
            Log::warning('Failed to read table columns, skip filtering params', [
                'table' => $table,
                'error' => $e->getMessage(),
            ]);
            return $params;
        }
    }
}

