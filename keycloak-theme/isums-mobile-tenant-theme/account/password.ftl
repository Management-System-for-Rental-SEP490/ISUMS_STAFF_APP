<#import "template.ftl" as layout>
<@layout.mainLayout active='password' bodyClass='user'; section>
    <form action="${url.passwordUrl}" class="form-horizontal" method="post">
        
        <input type="hidden" id="stateChecker" name="stateChecker" value="${stateChecker!''}">

        <div class="form-group">
            <label for="password">Mật khẩu hiện tại</label>
            <div class="password-wrap">
                <input type="password" id="password" name="password" class="input" autocomplete="current-password" autofocus placeholder="Nhập mật khẩu hiện tại">
            </div>
        </div>

        <div class="form-group">
            <label for="password-new">Mật khẩu mới</label>
            <div class="password-wrap">
                <input type="password" id="password-new" name="password-new" class="input" autocomplete="new-password" placeholder="Nhập mật khẩu mới">
            </div>
        </div>

        <div class="form-group">
            <label for="password-confirm">Xác nhận mật khẩu mới</label>
            <div class="password-wrap">
                <input type="password" id="password-confirm" name="password-confirm" class="input" autocomplete="new-password" placeholder="Nhập lại mật khẩu mới">
            </div>
        </div>

        <div class="form-buttons" style="margin-top: 24px;">
            <button type="submit" class="btn-login" name="submitAction" value="Save">Lưu thay đổi</button>
        </div>
        
        <div style="text-align: center; margin-top: 16px;">
            <a href="${url.referrerUrl!url.accountUrl}" style="color: #6b7280; text-decoration: none; font-size: 0.875rem;">Quay lại</a>
        </div>
    </form>
</@layout.mainLayout>
