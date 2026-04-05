(function syncKeyboardInsetAndScroller() {
    var root = document.documentElement;
    var vv = window.visualViewport;
    var resizeRaf = null;
    var lastInset = -1;
    var adjustTimer = null;
    /** Một lần chỉnh sau khi viewport/IME ngừng nhảy — tránh caret lệch do scroll chồng chéo */
    var ADJUST_DEBOUNCE_MS = 80;

    function getScroller() {
        return document.getElementById('isums-scroll-root');
    }

    function applyScrollDelta(delta) {
        if (Math.abs(delta) < 1) return;
        var scroller = getScroller();
        if (scroller) {
            scroller.scrollTop += delta;
        } else {
            window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
        }
    }

    /**
     * Cuộn trong #isums-scroll-root (không window.scroll) — khớp hit-test/caret trên WebView Android.
     * Đưa ô đang focus + nút submit chính vào vùng nhìn thấy phía trên IME.
     */
    function comfortScrollLoginForm() {
        if (!window.visualViewport) return;
        var card = document.querySelector('.card.card-form-first');
        if (!card) return;

        var el = document.activeElement;
        if (!el || !el.matches || !el.matches('.card-form-first input.input, .card-form-first textarea')) {
            return;
        }

        var vv = window.visualViewport;
        var margin = 18;
        var viewTop = vv.offsetTop + margin;
        var viewBottom = vv.offsetTop + vv.height - margin;

        var tops = [];
        var bottoms = [];
        var r0 = el.getBoundingClientRect();
        tops.push(r0.top);
        bottoms.push(r0.bottom);

        var btn = card.querySelector('form button.btn-login[type="submit"]');
        if (btn) {
            var rb = btn.getBoundingClientRect();
            tops.push(rb.top);
            bottoms.push(rb.bottom);
        }

        var unionTop = Math.min.apply(null, tops);
        var unionBottom = Math.max.apply(null, bottoms);
        var avail = viewBottom - viewTop;
        var unionH = unionBottom - unionTop;

        var delta = 0;

        if (unionH > avail - 2) {
            delta = r0.top - viewTop;
        } else {
            var deltaMin = unionBottom - viewBottom;
            var deltaMax = unionTop - viewTop;
            if (deltaMin <= deltaMax) {
                if (deltaMin > 0) delta = deltaMin;
                else if (deltaMax < 0) delta = deltaMax;
                else delta = 0;
            } else {
                delta = r0.top - viewTop;
            }
        }

        applyScrollDelta(delta);
    }

    function scheduleComfortScroll() {
        if (adjustTimer) clearTimeout(adjustTimer);
        adjustTimer = setTimeout(function () {
            adjustTimer = null;
            comfortScrollLoginForm();
        }, ADJUST_DEBOUNCE_MS);
    }

    function setKeyboardInset(options) {
        var forceScroll = options && options.forceScroll === true;
        var inset = 0;
        if (vv) {
            inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
        }
        var changed = inset !== lastInset;
        if (changed) {
            lastInset = inset;
            root.style.setProperty('--isums-keyboard-inset', inset + 'px');
            scheduleComfortScroll();
        } else if (forceScroll) {
            scheduleComfortScroll();
        }
    }

    function scheduleInsetFromResize() {
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(function () {
            resizeRaf = null;
            setKeyboardInset();
        });
    }

    window.__isumsSyncKeyboardInset = function () {
        lastInset = -1;
        setKeyboardInset({ forceScroll: true });
    };

    if (vv) {
        vv.addEventListener('resize', scheduleInsetFromResize);
    }
    window.addEventListener('resize', scheduleInsetFromResize);
    setKeyboardInset();

    document.addEventListener(
        'focusin',
        function (ev) {
            var t = ev.target;
            if (!t || !t.matches || !t.matches('.card-form-first input.input, .card-form-first textarea')) {
                return;
            }
            setKeyboardInset({ forceScroll: true });
        },
        true
    );
})();

(function isumsFormKeyboardLift() {
    var liftTarget =
        document.querySelector('.container.container-form-first') ||
        document.querySelector('.container-form-first');
    if (!liftTarget) return;

    var card = liftTarget.querySelector('main.card, .card.card-form-first');
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
