<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "aboveCard">
        <div class="reset-page-brand-above" role="banner">
            <div class="reset-brand-hero">
                <div class="logo reset-brand-hero-logo">
                    <img src="${url.resourcesPath}/img/logob.png" alt="" />
                </div>
                <span class="reset-brand-mark">${msg("appName")}</span>
            </div>
        </div>
    <#elseif section = "header">
        <@layout.isumsSiteFooterV2 />
    <#elseif section = "form">
        <script>document.title='${msg("logoutConfirmTitle")?js_string}';</script>
        <div id="kc-logout-confirm" class="reset-form isums-info-pane">
            <div class="isums-info-pane__badge" aria-hidden="true">
                <svg class="isums-info-pane__check" viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="22" fill="url(#isumsLogoutGradStaff)" stroke="rgba(37,99,235,0.35)" stroke-width="1.5"/>
                    <path d="M19 17h-4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M27 30l5-6-5-6M19 24h13" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <defs>
                        <linearGradient id="isumsLogoutGradStaff" x1="12" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#2563eb"/>
                            <stop offset="1" stop-color="#7c3aed"/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            <p class="isums-info-pane__message">${msg("logoutConfirmHeader")}</p>
            <form class="form-actions isums-info-pane__actions" action="${url.logoutConfirmAction}" method="POST">
                <input type="hidden" name="session_code" value="${logoutConfirm.code}">
                <button type="submit" name="confirmLogout" id="kc-logout" class="btn-login btn-login-block">
                    <span class="btn-login-inner">
                        <span class="btn-login-label">${msg("doLogout")}</span>
                    </span>
                </button>
            </form>
            <#if !logoutConfirm.skipLink && (client.baseUrl)?has_content>
            <div class="back-to-login isums-info-pane__fallback">
                <a href="${client.baseUrl}" class="link-back">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="icon-arrow">
                        <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                    </svg>
                    <span>${msg("backToApplication")}</span>
                </a>
            </div>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
