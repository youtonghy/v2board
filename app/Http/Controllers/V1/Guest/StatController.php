<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Models\StatUser;
use Illuminate\Support\Facades\DB;

class StatController extends Controller
{
    public function todayTrafficOverview()
    {
        $startAt = strtotime(date('Y-m-d'));
        $endAt = strtotime('+1 day', $startAt);

        $baseQuery = StatUser::where('record_at', '>=', $startAt)
            ->where('record_at', '<', $endAt)
            ->where('record_type', 'd');

        $totalUsageBytes = (float)((clone $baseQuery)
            ->select(DB::raw('COALESCE(SUM((u + d) * server_rate), 0) as total_usage'))
            ->value('total_usage') ?? 0);

        $topUsage = (clone $baseQuery)
            ->select(DB::raw('SUM((u + d) * server_rate) as total_usage'))
            ->groupBy('user_id')
            ->orderBy('total_usage', 'DESC')
            ->limit(5)
            ->pluck('total_usage')
            ->map(function ($usage) {
                return round($usage / 1073741824, 4);
            })
            ->values()
            ->all();

        return response([
            'data' => [
                'total_usage_gb' => round($totalUsageBytes / 1073741824, 4),
                'top_usage_gb' => $topUsage,
                'unit' => 'GB'
            ]
        ]);
    }
}
