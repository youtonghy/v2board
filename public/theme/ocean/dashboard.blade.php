<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" href="/theme/{{$theme}}/assets/components.chunk.css?v={{$version}}">
    <link rel="stylesheet" href="/theme/{{$theme}}/assets/umi.css?v={{$version}}">
    @if (file_exists(public_path("/theme/{$theme}/assets/custom.css")))
        <link rel="stylesheet" href="/theme/{{$theme}}/assets/custom.css?v={{$version}}">
    @endif
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no">
    @php ($colors = [
        'darkblue' => '#3b5998',
        'black' => '#343a40',
        'default' => '#0665d0',
        'green' => '#319795'
    ])
    <meta name="theme-color" content="{{$colors[$theme_config['theme_color']]}}">

    <title>{{$title}}</title>
    <!-- <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Nunito+Sans:300,400,400i,600,700"> -->
    <script>window.routerBase = "/";</script>
    <script>
        window.settings = {
            title: '{{$title}}',
            assets_path: '/theme/{{$theme}}/assets',
            theme: {
                sidebar: '{{$theme_config['theme_sidebar']}}',
                header: '{{$theme_config['theme_header']}}',
                color: '{{$theme_config['theme_color']}}',
            },
            version: '{{$version}}',
            background_url: '{{$theme_config['background_url']}}',
            description: '{{$description}}',
            i18n: [
                'zh-CN',
                'en-US',
                'ja-JP',
                'vi-VN',
                'ko-KR',
                'zh-TW',
                'fa-IR'
            ],
            logo: '{{$logo}}',
            telegram_login_enable: {{$telegram_login_enable}},
            sso_login_enable: {{$sso_login_enable ?? 0}},
            sso_provider: '{{$sso_provider ?? 'casdoor'}}'
        }
    </script>
    <script src="/theme/{{$theme}}/assets/i18n/zh-CN.js?v={{$version}}"></script>
    <script src="/theme/{{$theme}}/assets/i18n/zh-TW.js?v={{$version}}"></script>
    <script src="/theme/{{$theme}}/assets/i18n/en-US.js?v={{$version}}"></script>
    <script src="/theme/{{$theme}}/assets/i18n/ja-JP.js?v={{$version}}"></script>
    <script src="/theme/{{$theme}}/assets/i18n/vi-VN.js?v={{$version}}"></script>
    <script src="/theme/{{$theme}}/assets/i18n/ko-KR.js?v={{$version}}"></script>
    <script src="/theme/{{$theme}}/assets/i18n/fa-IR.js?v={{$version}}"></script>
</head>

<body>
<div id="root"></div>
{!! $theme_config['custom_html'] !!}
<script src="/theme/{{$theme}}/assets/vendors.async.js?v={{$version}}"></script>
<script src="/theme/{{$theme}}/assets/components.async.js?v={{$version}}"></script>
<script src="/theme/{{$theme}}/assets/umi.js?v={{$version}}"></script>
@if (file_exists(public_path("/theme/{$theme}/assets/custom.js")))
    <script src="/theme/{{$theme}}/assets/custom.js?v={{$version}}"></script>
@endif
<script>
/* Circular Traffic Progress - Inline Force */
(function() {
    function initCircularProgress() {
        var hash = window.location.hash || '';
        if (hash.indexOf('#/dashboard') !== 0) return;

        var block = null;
        var titles = document.querySelectorAll('.block-title');
        for (var i = 0; i < titles.length; i++) {
            if (titles[i].textContent.indexOf('我的订阅') !== -1) {
                block = titles[i].closest('.block');
                break;
            }
        }

        if (!block) return;

        if (block.querySelector('.ocean-circular-progress')) return;

        var progressBar = block.querySelector('.progress-bar');
        if (!progressBar) return;

        var widthStyle = progressBar.style.width || '0%';
        var percentage = parseFloat(widthStyle);
        
        var textContainer = block.querySelector('.font-size-sm.font-w600.mb-3');
        var usedText = '';
        var totalText = '';
        var onlineText = '';
        var expireText = '';
        
        // Find expiration text separately as it might be in a different element or text node
        // Search through all text nodes in the block content
        var contentBlock = block.querySelector('.block-content');
        if (contentBlock) {
             var allText = contentBlock.textContent;
             // Look for "于 YYYY/MM/DD 到期" or "该订阅长期有效"
             // Also handle "到期时间: YYYY-MM-DD" just in case
             var expireMatch = allText.match(/于\s*(\d{4}\/\d{1,2}\/\d{1,2})\s*到期/);
             if (!expireMatch) {
                 expireMatch = allText.match(/到期时间\s*[:：]?\s*(.*?)(\n|$)/);
             }
             
             if (expireMatch) {
                 expireText = expireMatch[1].trim();
             } else if (allText.indexOf('该订阅长期有效') !== -1) {
                 expireText = '长期有效';
             }
             
             // Hide the expiration text element if found
             // The text is usually in a <p class="font-size-sm text-muted">
             var elements = contentBlock.querySelectorAll('p.font-size-sm.text-muted');
             for (var i = 0; i < elements.length; i++) {
                 var text = elements[i].textContent;
                 if ((text.indexOf('于') !== -1 && text.indexOf('到期') !== -1) || text.indexOf('该订阅长期有效') !== -1) {
                     elements[i].style.display = 'none';
                 }
             }
        }
        
        if (textContainer) {
            var text = textContainer.textContent;
            // Try to parse "已用 X GB / 总计 Y GB" and "在线设备 X/Y"
            // Note: The text might contain newlines or extra spaces
            var match = text.match(/已用\s*(.*?)\s*\/\s*总计\s*(.*?)\s*(在线设备.*)/);
            if (!match) {
                 // Fallback if online devices is not present or format differs
                 match = text.match(/已用\s*(.*?)\s*\/\s*总计\s*(.*)/);
            }
            
            if (match) {
                usedText = match[1];
                totalText = match[2];
                if (match[3]) {
                    onlineText = match[3].trim();
                }
            }
        }

        var originalProgress = block.querySelector('.progress');
        if (originalProgress) originalProgress.style.display = 'none';
        if (textContainer) textContainer.style.display = 'none';

        var circleContainer = document.createElement('div');
        circleContainer.className = 'ocean-circular-progress';
        circleContainer.innerHTML = `
            <div class="traffic-info">
                <div class="traffic-item">
                    <span class="label">已用</span>
                    <span class="value used">${usedText}</span>
                </div>
                <div class="traffic-divider"></div>
                <div class="traffic-item">
                    <span class="label">总计</span>
                    <span class="value total">${totalText}</span>
                </div>
                <div class="traffic-item">
                    <span class="label">设备</span>
                    <span class="value online">${onlineText.replace('在线设备', '').trim()}</span>
                </div>
                <div class="traffic-item">
                    <span class="label">到期</span>
                    <span class="value expire">${expireText}</span>
                </div>
            </div>
            <div class="circular-chart-container">
                <svg viewBox="0 0 36 36" class="circular-chart">
                    <path class="circle-bg"
                        d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path class="circle"
                        stroke-dasharray="${percentage}, 100"
                        d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="20.35" class="percentage">${percentage.toFixed(1)}%</text>
                </svg>
            </div>
        `;

        var contentBlock = block.querySelector('.block-content');
        if (contentBlock) {
            contentBlock.appendChild(circleContainer);
        }
    }
    setInterval(initCircularProgress, 1000);
})();
</script>
</body>

</html>
