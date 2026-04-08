<#import "template.ftl" as layout>
<@layout.registrationLayout suppressFloatingErrorAlert=true; section>
    <#if section = "header">
        <@layout.isumsSiteFooterV2 />
    <#elseif section = "form">
        <#if social.providers??>
            <div class="kc-social-wrap kc-social-wrap-first">
                <ul class="social-providers" role="list">
                    <#list social.providers as p>
                    <li>
                        <a id="social-${p.alias}" class="btn-social btn-social-${p.providerId!p.alias}" href="${p.loginUrl}">
                            <span class="btn-social-inner">
                                <#if (p.providerId!"") == "google" || p.alias?lower_case == "google">
                                <svg class="social-svg social-svg-google" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                </#if>
                                <span class="btn-social-label"><#if (p.providerId!"") == "google" || p.alias?lower_case == "google">${msg("socialLoginGoogle")}<#else>${msg("continueWith")} ${p.displayName!}</#if></span>
                            </span>
                        </a>
                    </li>
                    </#list>
                </ul>
            </div>
        </#if>
        <#if realm.password && social.providers??>
            <div class="login-divider login-divider-after-social" role="separator" aria-label="${msg("loginDividerAria")}">
                <span class="login-divider-line"></span>
                <span class="login-divider-text">${msg("loginDividerOr")}</span>
                <span class="login-divider-line"></span>
            </div>
        </#if>
        <#if realm.password>
        <#assign loginBothErr = "">
        <#if messagesPerField.existsError('username','password')>
            <#assign loginBothErr = kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc>
        </#if>
        <#assign loginUserErr = "">
        <#assign loginPassErr = "">
        <#if !loginBothErr?has_content>
            <#if messagesPerField.existsError('username')>
                <#assign loginUserErr = kcSanitize(messagesPerField.get('username'))?no_esc>
            </#if>
            <#if messagesPerField.existsError('password')>
                <#assign loginPassErr = kcSanitize(messagesPerField.get('password'))?no_esc>
            </#if>
        </#if>
        <#assign loginGlobalErr = "">
        <#if !loginBothErr?has_content && !loginUserErr?has_content && !loginPassErr?has_content && message?has_content && message.type == 'error'>
            <#assign loginGlobalErr = kcSanitize(message.summary)?no_esc>
        </#if>
        <#assign showErrOnUser = loginBothErr?has_content || loginUserErr?has_content || loginGlobalErr?has_content />
        <#assign showErrOnPass = loginBothErr?has_content || loginPassErr?has_content || loginGlobalErr?has_content />
        <form id="kc-form-login" action="<@layout.isumsFormActionUrl rawAction=url.loginAction />" method="post">
            <div class="form-group">
                <#if usernameEditDisabled??>
                    <input tabindex="1" id="username" class="input" name="username" value="${(login.username!'')}" type="text" disabled />
                <#else>
                    <input tabindex="1" id="username" class="input<#if showErrOnUser> is-invalid</#if>" name="username" value="${(login.username!'')}" type="text" <#if !social.providers??>autofocus</#if> autocomplete="username" placeholder="${msg("usernamePlaceholder")}" aria-invalid="<#if showErrOnUser>true<#else>false</#if>" />
                </#if>
                <#if showErrOnUser>
                <span id="kc-error-username" class="field-error" aria-live="polite"><#if loginBothErr?has_content>${loginBothErr}<#elseif loginUserErr?has_content>${loginUserErr}<#else>${loginGlobalErr}</#if></span>
                </#if>
            </div>

            <div class="form-group">
                <label for="password">${msg("password")}</label>
                <div class="password-wrap">
                    <input tabindex="2" id="password" class="input<#if showErrOnPass> is-invalid</#if>" name="password" type="password" autocomplete="current-password" placeholder="••••••••" aria-invalid="<#if showErrOnPass>true<#else>false</#if>" />
                    <button type="button" class="toggle-password" onclick="togglePassword()" aria-label="${msg("passwordToggle")}">👁</button>
                </div>
                <#if showErrOnPass>
                <span id="kc-error-password" class="field-error" aria-live="polite"><#if loginBothErr?has_content>${loginBothErr}<#elseif loginPassErr?has_content>${loginPassErr}<#else>${loginGlobalErr}</#if></span>
                </#if>
            </div>

            <#if realm.rememberMe && !usernameEditDisabled?? && realm.resetPasswordAllowed>
                <div class="form-group remember-forgot-row">
                    <div class="checkbox">
                        <label>
                            <#if login.rememberMe??>
                                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                            <#else>
                                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                            </#if>
                        </label>
                    </div>
                    <a href="<@layout.isumsLinkUrl rawUrl=url.loginResetCredentialsUrl />" class="forgot-link forgot-link-inline">${msg("Forgot Password")}</a>
                </div>
            <#else>
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
                    <a href="<@layout.isumsLinkUrl rawUrl=url.loginResetCredentialsUrl />" class="forgot-link">${msg("Forgot Password")}</a>
                </#if>
            </#if>

            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>

            <button tabindex="4" type="submit" class="btn-login" name="login" id="kc-login">${msg("Login")}</button>
        </form>
        </#if>
    </#if>
</@layout.registrationLayout>
