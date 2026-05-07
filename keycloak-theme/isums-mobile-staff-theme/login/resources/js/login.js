function togglePassword() {
    var passwordInput = document.getElementById('password');
    var toggleButton = document.querySelector('.toggle-password');
    if (!passwordInput || !toggleButton) return;
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleButton.textContent = '👁';
    }
}

(function syncKeyboardInsetAndScroller() {
    var root = document.documentElement;
    var vv = window.visualViewport;
    var resizeRaf = null;
    var lastInset = -1;
    var adjustTimer = null;
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

    function comfortScrollLoginForm() {
        if (!window.visualViewport) return;
        var card = document.querySelector('main.card, .card.card-form-first, .card');
        if (!card) return;

        var el = document.activeElement;
        if (!el || !el.matches || !el.matches('input.input, textarea, .toggle-password')) return;

        var vv2 = window.visualViewport;
        var margin = 18;
        var viewTop = vv2.offsetTop + margin;
        var viewBottom = vv2.offsetTop + vv2.height - margin;

        var tops = [];
        var bottoms = [];
        var r0 = el.getBoundingClientRect();
        tops.push(r0.top); bottoms.push(r0.bottom);

        var btn = card.querySelector('form button.btn-login[type="submit"], form input[type="submit"].btn-login');
        if (btn) {
            var rb = btn.getBoundingClientRect();
            tops.push(rb.top); bottoms.push(rb.bottom);
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

    if (vv) vv.addEventListener('resize', scheduleInsetFromResize);
    window.addEventListener('resize', scheduleInsetFromResize);
    setKeyboardInset();

    document.addEventListener('focusin', function (e) {
        var t = e.target;
        if (!t || !t.matches || !t.matches('input.input, textarea')) return;
        setKeyboardInset({ forceScroll: true });
    }, true);

    document.addEventListener('focusout', function () {
        setTimeout(setKeyboardInset, 50);
        setTimeout(setKeyboardInset, 200);
    }, true);
})();

(function debugTapOverlay() {
    if (!/[?&]debug=1\b/.test(location.search)) return;
    document.addEventListener('DOMContentLoaded', function () {
        var box = document.createElement('div');
        box.style.cssText = 'position:fixed;left:8px;top:80px;z-index:2147483647;background:rgba(0,0,0,.85);color:#fff;font:11px/1.3 monospace;padding:8px 10px;border-radius:8px;max-width:90vw;pointer-events:none;white-space:pre-wrap';
        box.textContent = 'iw=' + window.innerWidth + ' ih=' + window.innerHeight + ' dpr=' + window.devicePixelRatio + ' vvh=' + (window.visualViewport && window.visualViewport.height);
        document.body.appendChild(box);
        document.addEventListener('touchstart', function (e) {
            var t = e.touches[0];
            var el = document.elementFromPoint(t.clientX, t.clientY);
            var dot = document.createElement('div');
            dot.style.cssText = 'position:fixed;left:' + (t.clientX - 12) + 'px;top:' + (t.clientY - 12) + 'px;width:24px;height:24px;border-radius:50%;background:rgba(255,0,0,.6);z-index:2147483646;pointer-events:none';
            document.body.appendChild(dot);
            setTimeout(function () { dot.remove(); }, 1500);
            box.textContent = 'tap (' + Math.round(t.clientX) + ',' + Math.round(t.clientY) + ') -> ' +
                (el ? (el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : '')) : 'null') +
                '\nvvh=' + (window.visualViewport && window.visualViewport.height) + ' ih=' + window.innerHeight + ' inset=' + getComputedStyle(document.documentElement).getPropertyValue('--isums-keyboard-inset');
        }, true);
    });
})();

(function initLoginUx() {
    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }
    ready(function () {
        var form = document.getElementById('kc-form-login');
        var loginButton = document.getElementById('kc-login');
        if (form && loginButton) {
            form.addEventListener('submit', function () {
                loginButton.setAttribute('aria-busy', 'true');
                loginButton.classList.add('is-submitting');
                setTimeout(function () { loginButton.disabled = true; }, 0);
            });
        }
        var resetForm = document.getElementById('kc-reset-password-form');
        if (resetForm) {
            resetForm.addEventListener('submit', function () {
                var btn = resetForm.querySelector('button[type="submit"], input[type="submit"]');
                if (!btn) return;
                btn.classList.add('is-submitting');
                setTimeout(function () { btn.disabled = true; }, 0);
            });
        }
        var updateForm = document.getElementById('kc-passwd-update-form');
        if (updateForm) {
            updateForm.addEventListener('submit', function () {
                var btn = updateForm.querySelector('input[name="login"], button[type="submit"]');
                if (!btn) return;
                btn.classList.add('is-submitting');
                setTimeout(function () { btn.disabled = true; }, 0);
            });
        }
    });
})();
