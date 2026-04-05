<#import "template.ftl" as layout>
<@layout.mainLayout active='password' bodyClass='user'; section>
    <form action="${url.passwordUrl}" class="form-horizontal" method="post">
        
        <input type="hidden" id="stateChecker" name="stateChecker" value="${stateChecker!''}">

        <div class="form-group">
            <label for="password">${msg("accountCurrentPasswordLabel")}</label>
            <div class="password-wrap">
                <input type="password" id="password" name="password" class="input" autocomplete="current-password" autofocus placeholder="${msg("accountCurrentPasswordPlaceholder")}">
            </div>
        </div>

        <div class="form-group">
            <label for="password-new">${msg("accountNewPasswordLabel")}</label>
            <div class="password-wrap">
                <input type="password" id="password-new" name="password-new" class="input" autocomplete="new-password" placeholder="${msg("accountNewPasswordPlaceholder")}">
            </div>
        </div>

        <div class="form-group">
            <label for="password-confirm">${msg("accountConfirmPasswordLabel")}</label>
            <div class="password-wrap">
                <input type="password" id="password-confirm" name="password-confirm" class="input" autocomplete="new-password" placeholder="${msg("accountConfirmPasswordPlaceholder")}">
            </div>
        </div>

        <div class="form-buttons" style="margin-top: 24px;">
            <button type="submit" class="btn-login" name="submitAction" value="Save">${msg("accountSaveButton")}</button>
        </div>
        
        <div style="text-align: center; margin-top: 16px;">
            <a href="${url.referrerUrl!url.accountUrl}" style="color: #475569; text-decoration: none; font-size: 0.875rem;">${msg("accountBackLink")}</a>
        </div>
    </form>
</@layout.mainLayout>
