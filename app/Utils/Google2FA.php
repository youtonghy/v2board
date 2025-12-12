<?php

namespace App\Utils;

class Google2FA
{
    /**
     * Verify the key against the code.
     *
     * @param string $secret
     * @param string $code
     * @param int $discrepancy
     * @param int|null $currentTimeSlice
     * @return bool
     */
    public static function verifyKey($secret, $code, $discrepancy = 1, $currentTimeSlice = null)
    {
        if ($currentTimeSlice === null) {
            $currentTimeSlice = floor(time() / 30);
        }

        if (strlen($code) != 6) {
            return false;
        }

        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $calculatedCode = self::getCode($secret, $currentTimeSlice + $i);
            if (hash_equals($calculatedCode, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the code for a specific time slice.
     *
     * @param string $secret
     * @param int|null $timeSlice
     * @return string
     */
    public static function getCode($secret, $timeSlice = null)
    {
        if ($timeSlice === null) {
            $timeSlice = floor(time() / 30);
        }

        $secretkey = self::base32Decode($secret);

        // Pack time into binary string
        $time = chr(0) . chr(0) . chr(0) . chr(0) . pack('N*', $timeSlice);
        
        // Hash it with HMAC-SHA1
        $hmac = hash_hmac('sha1', $time, $secretkey, true);
        
        // Use last nibble of result as index/offset
        $offset = ord(substr($hmac, -1)) & 0x0F;
        
        // grab 4 bytes of the result
        $hashpart = substr($hmac, $offset, 4);
        
        // Unpak binary value
        $value = unpack('N', $hashpart);
        $value = $value[1];
        // Only 32 bits
        $value = $value & 0x7FFFFFFF;

        $modulo = pow(10, 6);
        return str_pad($value % $modulo, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Generate a secret key.
     *
     * @param int $length
     * @return string
     */
    public static function generateSecretKey($length = 16)
    {
        $b32 = "234567QWERTYUIOPASDFGHJKLZXCVBNM";
        $secret = "";
        for ($i = 0; $i < $length; $i++) {
            $secret .= $b32[rand(0, 31)];
        }
        return $secret;
    }

    private static function base32Decode($secret)
    {
        if (empty($secret)) return '';

        // Be tolerant of common formatting: lowercase and spaces.
        $secret = strtoupper((string)$secret);
        $secret = preg_replace('/\s+/', '', $secret);

        $base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        $base32charsFlipped = array_flip(str_split($base32chars));

        $paddingCharCount = substr_count($secret, '=');
        $allowedValues = array(6, 4, 3, 1, 0);
        if (!in_array($paddingCharCount, $allowedValues)) {
            return false;
        }
        for ($i = 0; $i < 4; $i++) {
            if ($paddingCharCount == $allowedValues[$i] &&
                substr($secret, -($allowedValues[$i])) != str_repeat('=', $allowedValues[$i])) {
                return false;
            }
        }
        $secret = str_replace('=', '', $secret);
        $secret = str_split($secret);
        $binaryString = "";
        for ($i = 0; $i < count($secret); $i = $i + 8) {
            $x = "";
            // NOTE: $base32charsFlipped is a map (char => index); use key existence check.
            if (!isset($base32charsFlipped[$secret[$i]])) {
                return false;
            }
            for ($j = 0; $j < 8; $j++) {
                if (!isset($secret[$i + $j])) {
                    // If we don't have a full chunk, treat missing chars as padding (stop).
                    break;
                }
                if (!isset($base32charsFlipped[$secret[$i + $j]])) {
                    return false;
                }
                $x .= str_pad(base_convert($base32charsFlipped[$secret[$i + $j]], 10, 2), 5, '0', STR_PAD_LEFT);
            }
            $eightBits = str_split($x, 8);
            for ($z = 0; $z < count($eightBits); $z++) {
                $binaryString .= (($y = chr(base_convert($eightBits[$z], 2, 10))) || ord($y) == 48) ? $y : "";
            }
        }
        return $binaryString;
    }
}
