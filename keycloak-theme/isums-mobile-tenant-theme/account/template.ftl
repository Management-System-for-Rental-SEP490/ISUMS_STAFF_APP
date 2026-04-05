<#macro mainLayout active bodyClass>
<!DOCTYPE html>
<html lang="${locale.currentLanguageTag!'vi'}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1" />
    <meta name="theme-color" content="#3bb582" media="(prefers-color-scheme: light)" />
    <title>${msg("accountPageTitle")}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link href="${url.resourcesPath}/css/login.css" rel="stylesheet" />
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="logo">
                <img src="${url.resourcesPath}/img/logob.png" alt="ISUMS Logo" />
            </div>
            <h1 class="app-name">${msg("appName")}</h1>
        </header>
        <main class="card">
            <#if message?has_content && message.type == 'error'>
                <div class="alert alert-${message.type}">
                    <span class="pficon pficon-error-circle-o"></span>
                    <span class="kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>
            <#nested>
        </main>
    </div>
    <script>
        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            if (input.type === "password") {
                input.type = "text";
            } else {
                input.type = "password";
            }
        }
        document.addEventListener("DOMContentLoaded", function () {
            var kickTimer;
            document.addEventListener(
                "focusout",
                function (ev) {
                    var t = ev.target;
                    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
                        clearTimeout(kickTimer);
                        kickTimer = setTimeout(function () {
                            try {
                                window.scrollTo(0, window.pageYOffset || 0);
                            } catch (e) {}
                        }, 180);
                    }
                },
                true
            );
        });
    </script>
</body>
</html>
</#macro>
