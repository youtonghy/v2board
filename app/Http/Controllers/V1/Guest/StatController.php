<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Models\StatUser;
use Illuminate\Support\Facades\DB;

class StatController extends Controller
{
    private const TRAFFIC_OVERVIEW_UNIT_BYTES = 536870912; // 512MB

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
                return $this->convertBytesToTrafficUnit($usage);
            })
            ->values()
            ->all();

        return response([
            'data' => [
                'total' => $this->convertBytesToTrafficUnit($totalUsageBytes),
                'top' => $topUsage
            ]
        ]);
    }

    private function convertBytesToTrafficUnit($bytes): int
    {
        $converted = round(((float)$bytes) / self::TRAFFIC_OVERVIEW_UNIT_BYTES);
        return $converted > 0 ? (int)$converted : 0;
    }
}
