<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        <header class="header">
            <div class="logo">
                <img src="${url.resourcesPath}/img/logob.png" alt="ISUMS Logo" />
            </div>
            <h1 class="app-name">ISUMS APP</h1>
            <p class="tagline">${msg("loginTitle")}</p>
        </header>
    <#elseif section = "form">
        <form id="kc-form-login" action="${url.loginAction}" method="post">
            <div class="form-group">
                <#if usernameEditDisabled??>
                    <input tabindex="1" id="username" class="input" name="username" value="${(login.username!'')}" type="text" disabled />
                <#else>
                    <input tabindex="1" id="username" class="input" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="username" placeholder="${msg("usernamePlaceholder")}" />
                </#if>
            </div>

            <div class="form-group">
                <label for="password">${msg("password")}</label>
                <div class="password-wrap">
                    <input tabindex="2" id="password" class="input" name="password" type="password" autocomplete="current-password" placeholder="••••••••" />
                    <button type="button" class="toggle-password" onclick="togglePassword()" aria-label="${msg("passwordToggle")}">👁</button>
                </div>
            </div>

            <#if realm.rememberMe && !usernameEditDisabled??>
                <div class="form-group">
                    <div class="checkbox">
                        <label>
                            <#if login.rememberMe??>
                                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                            <#else>
                                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                            </#if>
                        </label>
                    </div>
                </div>
            </#if>

            <#if realm.resetPasswordAllowed>
                <a href="${url.loginResetCredentialsUrl}" class="forgot-link">${msg("Forgot Password")}</a>
            </#if>

            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>

            <button tabindex="4" type="submit" class="btn-login" name="login" id="kc-login">${msg("Login")}</button>
        </form>
    </#if>
</@layout.registrationLayout>
