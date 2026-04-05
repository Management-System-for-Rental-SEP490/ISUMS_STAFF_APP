(function isumsFormKeyboardLift() {
    var liftTarget =
        document.querySelector('.container.container-form-first') ||
        document.querySelector('.container-form-first') ||
        document.querySelector('.container');
    if (!liftTarget) return;

    var card = liftTarget.querySelector('main.card, .card.card-form-first, .card');
    if (!card) return;

    var FIELD_SEL =
        '#kc-form-login input, #kc-form-login textarea, #kc-form-login select, ' +
        '#kc-reset-password-form input, #kc-reset-password-form textarea, #kc-reset-password-form select, ' +
        '#kc-passwd-update-form input, #kc-passwd-update-form textarea, #kc-passwd-update-form select';

    function isField(el) {
        if (!el || typeof el.matches !== 'function' || !card.contains(el)) return false;
        if (!el.matches(FIELD_SEL)) return false;
        if (el.disabled || el.readOnly) return false;
        if (el.type === 'hidden') return false;
        return true;
    }

    function syncLift() {
        var a = document.activeElement;
        liftTarget.classList.remove('isums-keyboard-lift', 'isums-keyboard-lift-reset');
        if (!isField(a)) return;
        if (a.closest && a.closest('#kc-reset-password-form')) {
            liftTarget.classList.add('isums-keyboard-lift-reset');
        } else {
            liftTarget.classList.add('isums-keyboard-lift');
        }
    }

    document.addEventListener(
        'focusin',
        function (e) {
            if (liftTarget.contains(e.target)) syncLift();
        },
        true
    );

    document.addEventListener(
        'focusout',
        function (e) {
            if (liftTarget.contains(e.target)) {
                setTimeout(syncLift, 0);
                setTimeout(syncLift, 50);
                setTimeout(syncLift, 200);
            }
        },
        true
    );

    var vv = window.visualViewport;
    if (vv) {
        vv.addEventListener('resize', function () {
            setTimeout(syncLift, 0);
            setTimeout(syncLift, 100);
            setTimeout(syncLift, 250);
        });
    }
    window.addEventListener('resize', function () {
        setTimeout(syncLift, 0);
    });

    var prevInsetSync = window.__isumsSyncKeyboardInset;
    window.__isumsSyncKeyboardInset = function () {
        if (typeof prevInsetSync === 'function') prevInsetSync();
        setTimeout(syncLift, 0);
        setTimeout(syncLift, 120);
    };
})();

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
