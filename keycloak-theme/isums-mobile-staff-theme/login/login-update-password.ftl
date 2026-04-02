<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true; section>
    <#if section = "header">
        <header class="header">
            <div class="logo">
                <img src="${url.resourcesPath}/img/logob.png" alt="ISUMS Logo" />
            </div>
            <h1 class="app-name">${msg("updatePasswordTitle")}</h1>
            <p class="tagline">${msg("updatePasswordInstruction")}</p>
        </header>
    <#elseif section = "form">
        <form id="kc-passwd-update-form" class="reset-form" action="${url.loginAction}" method="post">
            <input type="text" id="username" name="username" value="${(username!'')}" autocomplete="username" readonly="readonly" style="display:none;"/>
            <input type="password" id="password" name="password" autocomplete="current-password" style="display:none;"/>

            <div class="form-group">
                <label for="password-new">${msg("newPassword")}</label>
                <div class="password-wrap">
                    <input type="password" id="password-new" name="password-new" class="input" autofocus autocomplete="new-password" placeholder="${msg("newPasswordPlaceholder")}" />
                    <button type="button" class="toggle-password" onclick="togglePasswordNew()" aria-label="${msg("toggleVisibility")}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                        </svg>
                    </button>
                </div>
                <#if messagesPerField.existsError('password','password-confirm')>
                    <span class="input-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.getFirstError('password','password-confirm'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="form-group">
                <label for="password-confirm">${msg("passwordConfirm")}</label>
                <div class="password-wrap">
                    <input type="password" id="password-confirm" name="password-confirm" class="input" autocomplete="new-password" placeholder="${msg("passwordConfirmPlaceholder")}" />
                    <button type="button" class="toggle-password" onclick="togglePasswordConfirm()" aria-label="${msg("toggleVisibility")}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn-login">${msg("updatePasswordAction")}</button>
            </div>
        </form>
        
        <script>
            function togglePasswordNew() {
                var x = document.getElementById("password-new");
                if (x.type === "password") { x.type = "text"; } else { x.type = "password"; }
            }
            function togglePasswordConfirm() {
                var x = document.getElementById("password-confirm");
                if (x.type === "password") { x.type = "text"; } else { x.type = "password"; }
            }
        </script>
    </#if>
</@layout.registrationLayout>
