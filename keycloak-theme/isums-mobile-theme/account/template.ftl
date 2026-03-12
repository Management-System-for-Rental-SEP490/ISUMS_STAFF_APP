<#macro mainLayout active bodyClass>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ISUMS APP - Đổi mật khẩu</title>
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
            <h1 class="app-name">ISUMS APP</h1>
            <p class="tagline">Cập nhật mật khẩu bảo vệ tài khoản</p>
        </header>
        <main class="card">
            <#if message?has_content>
                <div class="alert alert-${message.type}">
                    <#if message.type=='success'><span class="pficon pficon-ok"></span></#if>
                    <#if message.type=='error'><span class="pficon pficon-error-circle-o"></span></#if>
                    <span class="kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>
            <#nested>
        </main>
    </div>
    <script>
        // Tái sử dụng script toggle password từ login.js nếu cần
        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            if (input.type === "password") {
                input.type = "text";
            } else {
                input.type = "password";
            }
        }
    </script>
</body>
</html>
</#macro>
