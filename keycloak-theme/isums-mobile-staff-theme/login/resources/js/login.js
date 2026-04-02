function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleButton = document.querySelector('.toggle-password');
    
    if (passwordInput && toggleButton) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleButton.textContent = '👁';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('kc-form-login');
    const loginButton = document.getElementById('kc-login');
    if (form && loginButton) {
        form.addEventListener('submit', () => {
            loginButton.disabled = true;
        });
    }
});
