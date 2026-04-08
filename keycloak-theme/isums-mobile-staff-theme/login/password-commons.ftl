<#-- Khớp theme base Keycloak: checkbox đăng xuất phiên khác khi đổi mật khẩu -->
<#macro logoutOtherSessions>
    <div class="form-group">
        <div class="checkbox">
            <label>
                <input type="checkbox" id="logout-sessions" name="logout-sessions" value="on">
                ${msg("logoutOtherSessions")}
            </label>
        </div>
    </div>
</#macro>
