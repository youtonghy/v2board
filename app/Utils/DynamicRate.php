<?php

namespace App\Utils;

use DateTime;
use DateTimeZone;
use InvalidArgumentException;

class DynamicRate
{
    public static function sanitize($segments)
    {
        if (empty($segments)) {
            return null;
        }

        if (!is_array($segments)) {
            throw new InvalidArgumentException('动态倍率格式错误');
        }

        $normalized = [];
        foreach ($segments as $index => $segment) {
            if (!is_array($segment)) {
                throw new InvalidArgumentException('动态倍率格式错误');
            }

            $startRaw = isset($segment['start']) ? trim((string)$segment['start']) : '';
            $endRaw = isset($segment['end']) ? trim((string)$segment['end']) : '';

            if ($startRaw === '' || $endRaw === '') {
                throw new InvalidArgumentException('动态倍率时间段不能为空');
            }

            $startMinutes = self::parseTimeToMinutes($startRaw, false);
            $endMinutes = self::parseTimeToMinutes($endRaw, true);

            if ($startMinutes === null || $endMinutes === null) {
                throw new InvalidArgumentException('动态倍率时间格式应为 HH:MM');
            }

            if ($startMinutes >= $endMinutes) {
                throw new InvalidArgumentException('动态倍率时间段起始时间需小于结束时间');
            }

            if (!array_key_exists('rate', $segment) || $segment['rate'] === '') {
                throw new InvalidArgumentException('动态倍率值不能为空');
            }

            if (!is_numeric($segment['rate'])) {
                throw new InvalidArgumentException('动态倍率需为数字');
            }

            $normalized[] = [
                'start' => self::formatMinutes($startMinutes),
                'end' => self::formatMinutes($endMinutes),
                'rate' => (float)$segment['rate']
            ];
        }

        usort($normalized, function ($a, $b) {
            return self::parseTimeToMinutes($a['start'], false) <=> self::parseTimeToMinutes($b['start'], false);
        });

        $cursor = 0;
        foreach ($normalized as $segment) {
            $start = self::parseTimeToMinutes($segment['start'], false);
            $end = self::parseTimeToMinutes($segment['end'], true);

            if ($start !== $cursor) {
                throw new InvalidArgumentException('动态倍率需覆盖全天且时间段需连续无间隙');
            }

            $cursor = $end;
        }

        if ($cursor !== 1440) {
            throw new InvalidArgumentException('动态倍率需覆盖全天且时间段需连续无间隙');
        }

        return $normalized;
    }

    private static function parseTimeToMinutes(string $time, bool $allowMidnightEnd): ?int
    {
        if ($allowMidnightEnd && $time === '24:00') {
            return 1440;
        }

        if (!preg_match('/^(\d{2}):(\d{2})$/', $time, $matches)) {
            return null;
        }

        $hour = (int)$matches[1];
        $minute = (int)$matches[2];

        if ($hour < 0 || $hour > 23 || $minute < 0 || $minute > 59) {
            return null;
        }

        return $hour * 60 + $minute;
    }

    private static function formatMinutes(int $minutes): string
    {
        $minutes = max(0, min(1440, $minutes));
        if ($minutes === 1440) {
            return '24:00';
        }
        $hours = intdiv($minutes, 60);
        $mins = $minutes % 60;
        return sprintf('%02d:%02d', $hours, $mins);
    }

    public static function resolveActiveRate(array $server, ?DateTime $now = null): float
    {
        $baseRate = isset($server['rate']) ? (float)$server['rate'] : 1.0;
        if (empty($server['dynamic_rate']) || !is_array($server['dynamic_rate'])) {
            return $baseRate;
        }

        $now = $now ?: new DateTime('now', new DateTimeZone(config('app.timezone', 'UTC')));
        $minutes = ((int)$now->format('H')) * 60 + (int)$now->format('i');

        foreach ($server['dynamic_rate'] as $segment) {
            if (!isset($segment['start'], $segment['end'], $segment['rate'])) {
                continue;
            }
            $start = self::parseTimeToMinutes((string)$segment['start'], false);
            $end = self::parseTimeToMinutes((string)$segment['end'], true);
            if ($start === null || $end === null) {
                continue;
            }
            if ($minutes >= $start && $minutes < $end) {
                return (float)$segment['rate'];
            }
        }

        return $baseRate;
    }
}

