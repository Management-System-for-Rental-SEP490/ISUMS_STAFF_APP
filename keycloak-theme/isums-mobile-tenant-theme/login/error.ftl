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
        <div id="kc-error-message" class="reset-form">
            <p class="instruction">${kcSanitize(message.summary)?no_esc}</p>
            <#if traceId??>
                <p class="instruction" id="traceId">${msg("traceIdSupportMessage", traceId)}</p>
            </#if>
            <#if skipLink??>
            <#else>
                <#if client?? && client.baseUrl?has_content>
                    <p class="form-actions"><a id="backToApplication" href="${client.baseUrl}" class="btn-login" style="display:inline-block;text-align:center;text-decoration:none">${msg("backToApplication")}</a></p>
                </#if>
            </#if>
            <div class="back-to-login">
                <a href="<@layout.isumsLinkUrl rawUrl=url.loginUrl />" class="link-back">${msg("backToLogin")}</a>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>
