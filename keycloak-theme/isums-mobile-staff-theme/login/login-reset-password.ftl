<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=false renderHeaderSlot=false; section>
    <#if section = "aboveCard">
        <div class="reset-page-brand-above" role="banner">
            <div class="reset-brand-hero">
                <div class="logo reset-brand-hero-logo">
                    <img src="${url.resourcesPath}/img/logob.png" alt="" />
                </div>
                <span class="reset-brand-mark">${msg("appName")}</span>
            </div>
        </div>
    <#elseif section = "form">
        <script>document.title='${msg("resetPasswordPageTitle")?js_string}';</script>
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
        </form>
    </#if>
</@layout.registrationLayout>
