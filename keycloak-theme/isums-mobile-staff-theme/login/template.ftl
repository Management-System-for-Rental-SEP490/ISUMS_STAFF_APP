<#-- Giữ locale khi chuyển trang (LocaleBean: currentLanguageTag). -->
<#macro isumsLinkUrl rawUrl><#assign _sep = rawUrl?contains("?")?then("&", "?")/><#assign _lc = (locale.currentLanguageTag)!'vi'/>${rawUrl}${_sep}kc_locale=${_lc?url('UTF-8')}&ui_locales=${_lc?url('UTF-8')}</#macro>

<#-- Giữ locale khi POST form (reset / đổi mật khẩu). -->
<#macro isumsFormActionUrl rawAction><#assign _sep = rawAction?contains("?")?then("&", "?")/><#assign _lc = (locale.currentLanguageTag)!'vi'/>${rawAction}${_sep}kc_locale=${_lc?url('UTF-8')}&ui_locales=${_lc?url('UTF-8')}</#macro>

<#macro isumsSiteFooterV2>
<footer class="header header-site-footer site-footer-v2" aria-label="${msg("footerAriaLabel")}">
  <div class="site-footer-v2-version" role="status">
    <span class="site-footer-v2-pill">${msg("footerBadge")}</span>
    <span class="site-footer-v2-dot" aria-hidden="true"></span>
    <span class="site-footer-v2-build">${msg("footerBuild")}</span>
  </div>
  <p class="site-footer-v2-support">${msg("footerSupportLine")}</p>
  <nav class="site-footer-v2-links" aria-label="${msg("footerNavAria")}">
    <a href="#" class="site-footer-v2-link">${msg("footerLinkPrivacy")}</a>
    <a href="#" class="site-footer-v2-link">${msg("footerLinkTerms")}</a>
    <a href="#" class="site-footer-v2-link">${msg("footerLinkSupport")}</a>
  </nav>
  <p class="site-footer-v2-copy">${msg("footerCopyrightFull")}</p>
</footer>
</#macro>

<#-- suppressFloatingErrorAlert: ẩn thông báo lỗi chung trong card khi trùng lỗi từng ô -->
<#-- renderHeaderSlot: false = không gọi slot header (trang quên MK không có footer) -->
<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true suppressFloatingErrorAlert=false renderHeaderSlot=true>
<!DOCTYPE html>
<html lang="${locale.currentLanguageTag!'vi'}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1, interactive-widget=resizes-content" />
    <meta name="theme-color" content="#37b584" media="(prefers-color-scheme: light)" />
    <title>${msg("loginPageTitle")}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link href="${url.resourcesPath}/css/login.css" rel="stylesheet" />
</head>
<body>
    <div id="isums-scroll-root" class="isums-scroll-root">
    <div class="container container-form-first">
        <#nested "aboveCard">
        <main class="card card-form-first">
            <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <#assign hideGlobalError = suppressFloatingErrorAlert && message.type == 'error' />
            <#if !hideGlobalError>
            <div class="alert alert-${message.type} alert-in-card" role="alert" aria-live="polite">
                <span class="alert-in-card-body">${kcSanitize(message.summary)?no_esc}</span>
            </div>
            </#if>
            </#if>
            <#nested "form">
        </main>
        <#if renderHeaderSlot>
        <#nested "header">
        </#if>
    </div>
    </div>
    <script src="${url.resourcesPath}/js/login.js"></script>
</body>
</html>
</#macro>
