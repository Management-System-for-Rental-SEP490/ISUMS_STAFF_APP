<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false displayInfo=false; section>
    <#if section = "header">
        <@layout.isumsSiteFooterV2 />
    <#elseif section = "aboveCard">
        <div class="reset-page-brand-above" role="banner">
            <div class="reset-brand-hero">
                <div class="logo reset-brand-hero-logo">
                    <img src="${url.resourcesPath}/img/logob.png" alt="" />
                </div>
                <span class="reset-brand-mark">${msg("appName")}</span>
            </div>
        </div>
    <#elseif section = "form">
        <div id="kc-info-message" class="reset-form isums-info-pane<#if message?? && message.type == 'success'> isums-info-pane--success</#if>">
            <#if message?? && message.type == 'success'>
            <div class="isums-info-pane__badge" aria-hidden="true">
                <svg class="isums-info-pane__check" viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="22" fill="url(#isumsOkGradTenant)" stroke="rgba(59,181,130,0.35)" stroke-width="1.5"/>
                    <path d="M15 24.5l6 6 12-14" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    <defs>
                        <linearGradient id="isumsOkGradTenant" x1="12" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#5ed4a8"/>
                            <stop offset="1" stop-color="#3bb582"/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            </#if>
            <p class="isums-info-pane__message">${kcSanitize(message.summary)?no_esc}<#if requiredActions??>: <#list requiredActions as reqActionItem><b>${kcSanitize(msg("requiredAction.${reqActionItem}"))?no_esc}</b><#sep>, </#sep></#list></#if></p>
            <#-- Không dùng client.baseUrl: admin thường đặt Root/Home = URL Keycloak → mở sai host. -->
            <#assign _rtu = msg("returnToAppUrl") />
            <#assign _appPrimary = "" />
            <#assign _appPrimaryIsProceed = false />
            <#if _rtu?contains("://")>
                <#assign _appPrimary = _rtu />
            <#elseif pageRedirectUri?has_content>
                <#assign _appPrimary = pageRedirectUri />
            <#elseif actionUri?has_content>
                <#assign _appPrimary = actionUri />
                <#assign _appPrimaryIsProceed = true />
            </#if>
            <#if skipLink??>
            <#elseif _appPrimary?has_content>
                <div class="form-actions isums-info-pane__actions">
                    <a href="${_appPrimary}" class="btn-login btn-login-block"><#if _appPrimaryIsProceed>${msg("proceedWithAction")}<#else>${msg("backToApplication")}</#if></a>
                </div>
            </#if>
            <#if !_appPrimary?has_content>
            <div class="back-to-login isums-info-pane__fallback">
                <#if message?? && message.type == 'success'>
                    <p class="instruction open-app-hint">${msg("openAppAfterPasswordSuccess")}</p>
                <#else>
                    <a href="<@layout.isumsLinkUrl rawUrl=url.loginUrl />" class="link-back">${msg("backToLogin")}</a>
                </#if>
            </div>
            </#if>
        </div>
        <#if message?? && message.type == 'success'>
        <script>
        (function () {
          try {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === "function") {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: "isums_kc_info_success" }));
            }
          } catch (e) {}
        })();
        </script>
        </#if>
    </#if>
</@layout.registrationLayout>
