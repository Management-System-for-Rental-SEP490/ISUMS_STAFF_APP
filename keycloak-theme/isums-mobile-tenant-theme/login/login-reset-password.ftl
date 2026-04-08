<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=false; section>
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
        <form id="kc-reset-password-form" class="reset-form" action="<@layout.isumsFormActionUrl rawAction=url.loginAction />" method="post">
            <div class="form-group">
                <label for="username">${msg("emailOrUsername")}</label>
                <input type="text" id="username" name="username" class="input" autofocus value="${(auth.attemptedUsername!'')}" aria-invalid="<#if messagesPerField.existsError('username')>true</#if>" placeholder="${msg("resetPasswordPlaceholder")}"/>
                
                <#if messagesPerField.existsError('username')>
                    <span id="input-error-username" class="input-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('username'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn-login">${msg("submitAction")}</button>
            </div>
            
            <div class="back-to-login">
                <a href="<@layout.isumsLinkUrl rawUrl=url.loginUrl />" class="link-back">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="icon-arrow">
                        <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                    </svg>
                    <span>${msg("backToLogin")}</span>
                </a>
            </div>
        </form>
    <#elseif section = "info">
        
    </#if>
</@layout.registrationLayout>
