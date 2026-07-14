/**
 * Class-end warning: red flip clock overlay at 3 minutes to go.
 * Requires a Teach tab open in Chrome (page overlay, not OS-wide).
 */
(function ClassEndAlert() {
  const ALERT_MINUTES = 3;
  const CHECK_MS = 1000;
  const STORAGE_DISMISS = 'teach-class-end-dismissed';
  const STORAGE_POS = 'teach-class-end-pos';

  /** Alert fire times: [hour24, minute]. day: 0=Sun … 6=Sat. null day = every weekday Mon–Fri. */
  const DAILY = [
    [9, 7],
    [10, 17],
  ];
  const BY_DAY = {
    1: [[13, 57]], // Mon
    2: [[11, 52], [12, 2]], // Tue
    3: [[11, 17], [12, 27]], // Wed (12:27pm)
    4: [[11, 52], [12, 2], [13, 57]], // Thu
    5: [[10, 52], [12, 2]], // Fri
  };

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  let panel = null;
  let activeSlot = null; // { key, endAt }
  let digits = [];
  let ampmEl = null;
  let countdownEl = null;
  let drag = null;

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function slotKey(d, h, m) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}|${pad2(h)}:${pad2(m)}`;
  }

  function todaySlots(now) {
    const day = now.getDay();
    if (day === 0 || day === 6) return [];
    const list = DAILY.concat(BY_DAY[day] || []);
    return list.map(([h, m]) => ({ h, m, key: slotKey(now, h, m) }));
  }

  function getDismissed() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_DISMISS) || '{}');
    } catch (_) {
      return {};
    }
  }

  function markDismissed(key) {
    const map = getDismissed();
    map[key] = 1;
    try {
      sessionStorage.setItem(STORAGE_DISMISS, JSON.stringify(map));
    } catch (_) {}
  }

  function isDismissed(key) {
    return Boolean(getDismissed()[key]);
  }

  function findActiveSlot(now) {
    const slots = todaySlots(now);
    for (const s of slots) {
      if (isDismissed(s.key)) continue;
      const start = new Date(now);
      start.setHours(s.h, s.m, 0, 0);
      const end = new Date(start.getTime() + ALERT_MINUTES * 60 * 1000);
      if (now >= start && now < end) {
        return { key: s.key, start, end };
      }
    }
    return null;
  }

  function ensureStyles() {
    if (document.getElementById('class-end-alert-styles')) return;
    const style = document.createElement('style');
    style.id = 'class-end-alert-styles';
    style.textContent = `
      .class-end-alert{
        --cea-red:#7a1018;
        --cea-red-deep:#4a080c;
        --cea-cream:#fff5f4;
        position:fixed;top:18px;left:50%;transform:translateX(-50%);
        z-index:2147483000;width:min(420px,calc(100vw - 24px));
        border-radius:18px;overflow:hidden;
        border:1px solid rgba(255,80,90,.45);
        background:linear-gradient(180deg,var(--cea-red),var(--cea-red-deep));
        box-shadow:0 18px 50px rgba(90,8,14,.45),0 0 0 1px rgba(255,255,255,.08) inset;
        color:var(--cea-cream);font-family:system-ui,-apple-system,sans-serif;
        user-select:none;touch-action:none;
        animation:ceaIn .35s cubic-bezier(.2,.8,.2,1);
      }
      @keyframes ceaIn{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      .class-end-alert.is-dragging{animation:none;cursor:grabbing}
      .class-end-alert__chrome{
        display:flex;align-items:center;justify-content:space-between;gap:10px;
        padding:10px 12px 6px;cursor:grab;
      }
      .class-end-alert__label{
        font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
        color:rgba(255,245,244,.88);
      }
      .class-end-alert__dismiss{
        appearance:none;border:1px solid rgba(255,245,244,.25);background:rgba(0,0,0,.2);
        color:var(--cea-cream);border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700;
        cursor:pointer;
      }
      .class-end-alert__dismiss:hover{background:rgba(0,0,0,.35)}
      .class-end-alert__body{padding:4px 14px 14px}
      .class-end-alert__countdown{
        margin:0 0 10px;font-size:14px;font-weight:700;letter-spacing:.04em;
        color:rgba(255,245,244,.9);
      }
      .class-end-alert__countdown strong{font-variant-numeric:tabular-nums;font-size:18px;color:#fff}
      .cea-flip{
        display:flex;align-items:stretch;height:72px;border-radius:12px;overflow:hidden;
        border:1px solid rgba(0,0,0,.35);background:var(--cea-red-deep);
      }
      .cea-panel{position:relative;display:flex;flex-direction:column;min-width:0}
      .cea-panel.time{flex:1;display:flex;align-items:center;justify-content:center;background:var(--cea-red-deep)}
      .cea-panel.time::after{
        content:'';position:absolute;left:0;right:0;top:50%;height:1px;
        background:rgba(0,0,0,.55);pointer-events:none;z-index:5;
      }
      .cea-panel.date{flex:0 0 64px;border-left:1px solid rgba(255,245,244,.12)}
      .cea-half{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
      .cea-half.upper{background:var(--cea-red-deep);border-bottom:1px solid rgba(0,0,0,.55)}
      .cea-half.lower{background:#3a060a}
      .cea-row{position:relative;z-index:2;display:flex;align-items:flex-end;gap:2px;padding:0 12px 0 10px}
      .cea-digit{position:relative;width:34px;height:58px;perspective:180px}
      .cea-digit .base,.cea-digit .flap{
        position:absolute;left:0;width:100%;height:50%;overflow:hidden;background:transparent;
      }
      .cea-digit .base.upper{top:0}.cea-digit .base.lower{bottom:0}
      .cea-digit .base span,.cea-digit .flap span{
        position:absolute;left:0;width:100%;height:58px;display:flex;align-items:center;justify-content:center;
        font-size:40px;font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff5f4;
        text-shadow:0 1px 2px rgba(0,0,0,.5);
      }
      .cea-digit .base.upper span,.cea-digit .flap.upper span{top:0}
      .cea-digit .base.lower span,.cea-digit .flap.lower span{bottom:0}
      .cea-digit .flap{z-index:2;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:var(--cea-red-deep)}
      .cea-digit .flap.upper{top:0;border-bottom:1px solid rgba(0,0,0,.55);transform-origin:center bottom}
      .cea-digit .flap.lower{bottom:0;background:#3a060a;transform-origin:center top;transform:rotateX(90deg);z-index:1}
      .cea-digit.flip .flap.upper{animation:ceaFlipTop .45s ease-in forwards}
      .cea-digit.flip .flap.lower{animation:ceaFlipBottom .45s ease-out forwards}
      @keyframes ceaFlipTop{0%{transform:rotateX(0)}100%{transform:rotateX(-90deg)}}
      @keyframes ceaFlipBottom{0%{transform:rotateX(90deg)}100%{transform:rotateX(0)}}
      .cea-colon{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;width:10px;height:58px;align-self:center}
      .cea-colon i{display:block;width:5px;height:5px;border-radius:50%;background:#fff5f4}
      .cea-ampm{font-size:12px;font-weight:800;letter-spacing:.08em;color:rgba(255,245,244,.85);margin:0 0 8px 6px}
      .cea-dow{font-size:13px;font-weight:800;letter-spacing:.1em;color:rgba(255,245,244,.88);align-self:flex-end;margin-bottom:2px}
      .cea-dom{font-size:26px;font-weight:800;letter-spacing:-.02em;line-height:1;color:#fff5f4;align-self:flex-start;margin-top:2px}
      @media (prefers-reduced-motion:reduce){
        .class-end-alert{animation:none}
        .cea-digit.flip .flap.upper,.cea-digit.flip .flap.lower{animation:none}
      }
    `;
    document.head.appendChild(style);
  }

  function makeDigit() {
    const el = document.createElement('div');
    el.className = 'cea-digit';
    el.innerHTML = `
      <div class="base upper"><span>0</span></div>
      <div class="base lower"><span>0</span></div>
      <div class="flap upper"><span>0</span></div>
      <div class="flap lower"><span>0</span></div>`;
    el._val = '0';
    return el;
  }

  function setDigit(el, next, animate) {
    next = String(next);
    if (el._val === next) return;
    const prev = el._val;
    el._val = next;
    const topBase = el.querySelector('.base.upper span');
    const botBase = el.querySelector('.base.lower span');
    const topFlap = el.querySelector('.flap.upper span');
    const botFlap = el.querySelector('.flap.lower span');
    const flapTop = el.querySelector('.flap.upper');
    if (!animate) {
      topBase.textContent = next;
      botBase.textContent = next;
      topFlap.textContent = next;
      botFlap.textContent = next;
      return;
    }
    topFlap.textContent = prev;
    botFlap.textContent = next;
    topBase.textContent = next;
    botBase.textContent = prev;
    el.classList.remove('flip');
    void el.offsetWidth;
    el.classList.add('flip');
    const done = () => {
      botBase.textContent = next;
      topFlap.textContent = next;
      el.classList.remove('flip');
      flapTop.removeEventListener('animationend', done);
    };
    flapTop.addEventListener('animationend', done);
  }

  function savePos(left, top) {
    try {
      sessionStorage.setItem(STORAGE_POS, JSON.stringify({ left, top }));
    } catch (_) {}
  }

  function restorePos(el) {
    try {
      const raw = sessionStorage.getItem(STORAGE_POS);
      if (!raw) return;
      const pos = JSON.parse(raw);
      if (typeof pos.left !== 'number' || typeof pos.top !== 'number') return;
      el.style.left = `${pos.left}px`;
      el.style.top = `${pos.top}px`;
      el.style.transform = 'none';
      el.style.right = 'auto';
    } catch (_) {}
  }

  function bindDrag(el) {
    const handle = el.querySelector('.class-end-alert__chrome');
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.class-end-alert__dismiss')) return;
      const rect = el.getBoundingClientRect();
      drag = {
        dx: e.clientX - rect.left,
        dy: e.clientY - rect.top,
        pointerId: e.pointerId,
      };
      el.classList.add('is-dragging');
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.transform = 'none';
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const maxX = window.innerWidth - el.offsetWidth - 8;
      const maxY = window.innerHeight - el.offsetHeight - 8;
      const left = Math.max(8, Math.min(maxX, e.clientX - drag.dx));
      const top = Math.max(8, Math.min(maxY, e.clientY - drag.dy));
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      el.classList.remove('is-dragging');
      savePos(parseFloat(el.style.left), parseFloat(el.style.top));
      drag = null;
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  function buildPanel() {
    ensureStyles();
    const el = document.createElement('aside');
    el.className = 'class-end-alert';
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
    el.innerHTML = `
      <div class="class-end-alert__chrome">
        <span class="class-end-alert__label">Class ending soon</span>
        <button type="button" class="class-end-alert__dismiss" aria-label="Dismiss warning">Dismiss</button>
      </div>
      <div class="class-end-alert__body">
        <p class="class-end-alert__countdown">Time left · <strong id="ceaCountdown">3:00</strong></p>
        <div class="cea-flip" aria-hidden="true">
          <div class="cea-panel time"><div class="cea-row" id="ceaTimeRow"></div></div>
          <div class="cea-panel date">
            <div class="cea-half upper"><span class="cea-dow">MON</span></div>
            <div class="cea-half lower"><span class="cea-dom">1</span></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    el.querySelector('.class-end-alert__dismiss').addEventListener('click', () => {
      if (activeSlot) markDismissed(activeSlot.key);
      hidePanel();
    });
    bindDrag(el);
    restorePos(el);

    digits = [];
    const row = el.querySelector('#ceaTimeRow');
    for (let i = 0; i < 2; i++) {
      const d = makeDigit();
      digits.push(d);
      row.appendChild(d);
    }
    const colon = document.createElement('span');
    colon.className = 'cea-colon';
    colon.innerHTML = '<i></i><i></i>';
    row.appendChild(colon);
    for (let i = 0; i < 2; i++) {
      const d = makeDigit();
      digits.push(d);
      row.appendChild(d);
    }
    ampmEl = document.createElement('span');
    ampmEl.className = 'cea-ampm';
    ampmEl.textContent = 'AM';
    row.appendChild(ampmEl);
    countdownEl = el.querySelector('#ceaCountdown');
    return el;
  }

  function updateFlip(now, animate) {
    if (!panel) return;
    let h = now.getHours();
    const m = pad2(now.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const hh = pad2(h);
    const str = hh + m;
    digits.forEach((d, i) => setDigit(d, str[i], animate));
    ampmEl.textContent = ampm;
    panel.querySelector('.cea-dow').textContent = DAYS[now.getDay()];
    panel.querySelector('.cea-dom').textContent = String(now.getDate());
  }

  function updateCountdown(now) {
    if (!activeSlot || !countdownEl) return;
    const ms = Math.max(0, activeSlot.end - now);
    const total = Math.ceil(ms / 1000);
    const mm = Math.floor(total / 60);
    const ss = pad2(total % 60);
    countdownEl.textContent = `${mm}:${ss}`;
  }

  function showPanel(slot, now) {
    activeSlot = slot;
    if (!panel) panel = buildPanel();
    panel.hidden = false;
    panel.style.display = '';
    updateFlip(now, false);
    updateCountdown(now);
  }

  function hidePanel() {
    activeSlot = null;
    if (!panel) return;
    panel.style.display = 'none';
  }

  function tick(animate) {
    const now = new Date();
    const slot = findActiveSlot(now);
    if (!slot) {
      if (activeSlot) hidePanel();
      return;
    }
    if (!activeSlot || activeSlot.key !== slot.key) {
      showPanel(slot, now);
    } else {
      updateFlip(now, animate);
      updateCountdown(now);
    }
  }

  function init() {
    tick(false);
    setInterval(() => tick(true), CHECK_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
