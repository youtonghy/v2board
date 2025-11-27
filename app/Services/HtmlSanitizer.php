<?php

namespace App\Services;

/**
 * Lightweight HTML Sanitizer to prevent XSS attacks.
 * Allows only safe HTML tags and attributes for content display.
 */
class HtmlSanitizer
{
    /**
     * Allowed HTML tags
     */
    private const ALLOWED_TAGS = [
        'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span', 'div',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote', 'pre', 'code',
        'hr',
    ];

    /**
     * Allowed attributes per tag
     */
    private const ALLOWED_ATTRIBUTES = [
        '*' => ['class', 'id', 'style'],
        'a' => ['href', 'title', 'target', 'rel'],
        'img' => ['src', 'alt', 'title', 'width', 'height', 'loading'],
        'td' => ['colspan', 'rowspan'],
        'th' => ['colspan', 'rowspan'],
    ];

    /**
     * Dangerous CSS properties to remove
     */
    private const DANGEROUS_CSS = [
        'behavior',
        'expression',
        'javascript',
        'vbscript',
        'moz-binding',
    ];

    /**
     * Sanitize HTML content
     */
    public static function clean(?string $html): string
    {
        if (empty($html)) {
            return '';
        }

        // Remove null bytes and other dangerous characters
        $html = str_replace("\0", '', $html);

        // Remove script, style, and other dangerous tags completely
        $html = preg_replace('/<(script|style|iframe|frame|frameset|object|embed|applet|meta|link|base|form|input|button|select|textarea)[^>]*>.*?<\/\1>/is', '', $html);
        $html = preg_replace('/<(script|style|iframe|frame|frameset|object|embed|applet|meta|link|base|form|input|button|select|textarea)[^>]*\/?>/is', '', $html);

        // Remove event handlers (onclick, onerror, etc.)
        $html = preg_replace('/\s+on\w+\s*=\s*["\'][^"\']*["\'/is', '', $html);
        $html = preg_replace('/\s+on\w+\s*=\s*[^\s>]+/is', '', $html);

        // Remove javascript: and data: URLs
        $html = preg_replace('/href\s*=\s*["\']?\s*(javascript|data|vbscript):/is', 'href="#blocked:', $html);
        $html = preg_replace('/src\s*=\s*["\']?\s*(javascript|data|vbscript):/is', 'src="#blocked:', $html);

        // Use DOMDocument for proper parsing if available
        if (class_exists('DOMDocument')) {
            $html = self::sanitizeWithDom($html);
        }

        return $html;
    }

    /**
     * Sanitize using DOMDocument for more thorough cleaning
     */
    private static function sanitizeWithDom(string $html): string
    {
        // Suppress warnings for malformed HTML
        libxml_use_internal_errors(true);

        $dom = new \DOMDocument('1.0', 'UTF-8');

        // Wrap in a container to handle fragments
        $wrapped = '<div id="__sanitizer_wrapper__">' . $html . '</div>';
        $dom->loadHTML('<?xml encoding="UTF-8">' . $wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);

        libxml_clear_errors();

        // Remove disallowed tags
        self::removeDisallowedTags($dom);

        // Clean attributes
        self::cleanAttributes($dom);

        // Extract the content
        $wrapper = $dom->getElementById('__sanitizer_wrapper__');
        if ($wrapper) {
            $result = '';
            foreach ($wrapper->childNodes as $child) {
                $result .= $dom->saveHTML($child);
            }
            return $result;
        }

        return strip_tags($html, '<' . implode('><', self::ALLOWED_TAGS) . '>');
    }

    /**
     * Remove disallowed tags from DOM
     */
    private static function removeDisallowedTags(\DOMDocument $dom): void
    {
        $xpath = new \DOMXPath($dom);

        // Find all elements
        $nodes = $xpath->query('//*');
        $toRemove = [];

        foreach ($nodes as $node) {
            if ($node->nodeType !== XML_ELEMENT_NODE) {
                continue;
            }

            $tagName = strtolower($node->nodeName);

            // Skip wrapper
            if ($node->getAttribute('id') === '__sanitizer_wrapper__') {
                continue;
            }

            if (!in_array($tagName, self::ALLOWED_TAGS)) {
                $toRemove[] = $node;
            }
        }

        // Remove disallowed nodes (replace with their text content)
        foreach ($toRemove as $node) {
            $textNode = $dom->createTextNode($node->textContent);
            $node->parentNode->replaceChild($textNode, $node);
        }
    }

    /**
     * Clean attributes from all elements
     */
    private static function cleanAttributes(\DOMDocument $dom): void
    {
        $xpath = new \DOMXPath($dom);
        $nodes = $xpath->query('//*');

        foreach ($nodes as $node) {
            if ($node->nodeType !== XML_ELEMENT_NODE || !$node->hasAttributes()) {
                continue;
            }

            $tagName = strtolower($node->nodeName);
            $toRemoveAttrs = [];

            foreach ($node->attributes as $attr) {
                $attrName = strtolower($attr->nodeName);
                $attrValue = $attr->nodeValue;

                // Check if attribute is allowed
                $globalAllowed = self::ALLOWED_ATTRIBUTES['*'] ?? [];
                $tagAllowed = self::ALLOWED_ATTRIBUTES[$tagName] ?? [];
                $allowed = array_merge($globalAllowed, $tagAllowed);

                if (!in_array($attrName, $allowed)) {
                    $toRemoveAttrs[] = $attr->nodeName;
                    continue;
                }

                // Check for dangerous values
                if (self::isDangerousAttributeValue($attrName, $attrValue)) {
                    $toRemoveAttrs[] = $attr->nodeName;
                    continue;
                }

                // Sanitize style attribute
                if ($attrName === 'style') {
                    $cleanStyle = self::sanitizeStyle($attrValue);
                    if ($cleanStyle === '') {
                        $toRemoveAttrs[] = $attr->nodeName;
                    } else {
                        $node->setAttribute($attrName, $cleanStyle);
                    }
                }

                // Sanitize href and src
                if (in_array($attrName, ['href', 'src'])) {
                    $cleanUrl = self::sanitizeUrl($attrValue);
                    if ($cleanUrl === '') {
                        $toRemoveAttrs[] = $attr->nodeName;
                    } else {
                        $node->setAttribute($attrName, $cleanUrl);
                    }
                }

                // Force rel="noopener noreferrer" on external links
                if ($attrName === 'href' && $tagName === 'a') {
                    $node->setAttribute('rel', 'noopener noreferrer');
                }
            }

            foreach ($toRemoveAttrs as $attrName) {
                $node->removeAttribute($attrName);
            }
        }
    }

    /**
     * Check if attribute value is dangerous
     */
    private static function isDangerousAttributeValue(string $name, string $value): bool
    {
        $value = strtolower($value);

        // Check for javascript/vbscript protocols
        if (preg_match('/^\s*(javascript|vbscript|data):/i', $value)) {
            return true;
        }

        // Check for event handlers
        if (preg_match('/^\s*on\w+/i', $name)) {
            return true;
        }

        return false;
    }

    /**
     * Sanitize CSS style attribute
     */
    private static function sanitizeStyle(string $style): string
    {
        // Remove dangerous CSS
        foreach (self::DANGEROUS_CSS as $dangerous) {
            if (stripos($style, $dangerous) !== false) {
                return '';
            }
        }

        // Remove url() with javascript/data
        if (preg_match('/url\s*\(\s*["\']?\s*(javascript|data|vbscript):/i', $style)) {
            return '';
        }

        return $style;
    }

    /**
     * Sanitize URL
     */
    private static function sanitizeUrl(string $url): string
    {
        $url = trim($url);

        // Allow relative URLs
        if (preg_match('/^[\/\.]/', $url) || preg_match('/^#/', $url)) {
            return $url;
        }

        // Allow http, https, mailto
        if (preg_match('/^(https?|mailto):/i', $url)) {
            return $url;
        }

        // Block everything else
        return '';
    }

    /**
     * Escape for safe text display (no HTML allowed)
     */
    public static function escape(?string $text): string
    {
        if (empty($text)) {
            return '';
        }
        return htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
