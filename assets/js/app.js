/* 画面の動き */
(function (CR) {
  'use strict';

  const KEY = 'cinnamonRoulette.v1';
  const HISTORY_MAX = 20;
  const sound = CR.sound;

  const $ = (id) => document.getElementById(id);
  const topicEl = $('topic');
  const presetsEl = $('presets');
  const wheelEl = $('wheel');
  const spinBtn = $('spinBtn');
  const oddsEl = $('odds');
  const resultEl = $('result');
  const mascotEl = $('mascot');
  const historyEl = $('history');
  const statsEl = $('stats');
  const soundBtn = $('soundBtn');
  const toastEl = $('toast');

  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 保存 ---------- */
  function fresh() {
    return { mode: 'hero', sound: true, history: [], stats: { spins: 0, can: 0, cannot: 0 } };
  }
  let state = fresh();
  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) state = Object.assign(fresh(), JSON.parse(raw));
    } catch (e) { /* 保存できない環境ではメモリだけで動く */ }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 無視 */ }
  }

  /* ---------- ユーティリティ ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // 「10^−123」のような指数を上付き文字で表示
  function supify(text) {
    return esc(text)
      .replace(/10\^(−?)\(10\^(\d+)\)/g, '10<sup>$1(10<sup>$2</sup>)</sup>')
      .replace(/10\^(−?)\((\d+)×10\^(\d+)\)/g, '10<sup>$1($2×10<sup>$3</sup>)</sup>')
      .replace(/10\^([−-]?[\d,.]+)/g, '10<sup>$1</sup>');
  }
  let toastTimer = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), 2000);
  }

  /* ---------- マスコット「くもいぬ」（オリジナル） ---------- */
  function mascotSVG(mood) {
    const ink = '#3d4a66';
    const blobs = [[60, 62, 34], [34, 70, 22], [86, 70, 22], [44, 46, 20], [76, 46, 20], [60, 84, 22]];
    const outline = blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#bfe6ff"/>`).join('');
    const fill = blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 3.5}" fill="#fff"/>`).join('');
    let eyes;
    let mouth;
    let extra = '';
    switch (mood) {
      case 'happy':
        eyes = `<path d="M43 63 q5 -7 10 0 M67 63 q5 -7 10 0" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>`;
        mouth = `<path d="M53 71 q7 9 14 0 z" fill="#ff7aa8" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
        extra = '<path d="M14 30 l3 -7 3 7 7 3 -7 3 -3 7 -3 -7 -7 -3z M100 22 l2.4 -5 2.4 5 5 2.4 -5 2.4 -2.4 5 -2.4 -5 -5 -2.4z" fill="#ffd75e"/>';
        break;
      case 'sad':
        eyes = `<path d="M43 61 q5 5 10 0 M67 61 q5 5 10 0" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>`;
        mouth = `<path d="M54 76 q6 -6 12 0" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`;
        extra = '<path d="M46 66 q-3 7 0 9 q3 -2 0 -9z M74 66 q-3 7 0 9 q3 -2 0 -9z" fill="#7cc8ff"/>';
        break;
      case 'dizzy':
        eyes = `<path d="M43 60 q5 -6 10 0 q-5 6 -10 0 M67 60 q5 -6 10 0 q-5 6 -10 0" fill="none" stroke="${ink}" stroke-width="2.6"/>` +
          `<circle cx="48" cy="60" r="1.6" fill="${ink}"/><circle cx="72" cy="60" r="1.6" fill="${ink}"/>`;
        mouth = `<ellipse cx="60" cy="74" rx="4" ry="5" fill="#ff7aa8" stroke="${ink}" stroke-width="2.2"/>`;
        break;
      default:
        eyes = `<ellipse cx="48" cy="61" rx="4" ry="5" fill="${ink}"/><ellipse cx="72" cy="61" rx="4" ry="5" fill="${ink}"/>` +
          '<circle cx="49.5" cy="58.8" r="1.5" fill="#fff"/><circle cx="73.5" cy="58.8" r="1.5" fill="#fff"/>';
        mouth = `<path d="M54 71 q3 4 6 0 q3 4 6 0" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    return `<svg viewBox="0 0 120 112" role="img" aria-label="くもいぬ" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="108" rx="34" ry="4" fill="#9bc7e6" opacity=".35"/>
      <path d="M36 32 q-6 -18 8 -18 q8 2 6 14 z M84 32 q6 -18 -8 -18 q-8 2 -6 14 z" fill="#bfe6ff"/>
      <path d="M38 30 q-3 -11 5 -11 q4 1 4 9 z M82 30 q3 -11 -5 -11 q-4 1 -4 9 z" fill="#ffc9dc"/>
      ${outline}${fill}
      <ellipse cx="40" cy="71" rx="6" ry="3.6" fill="#ffb3cd" opacity=".75"/><ellipse cx="80" cy="71" rx="6" ry="3.6" fill="#ffb3cd" opacity=".75"/>
      ${eyes}${mouth}
      <path d="M60 35 l2.6 5.4 6 .8 -4.4 4.1 1.1 5.9 -5.3 -2.9 -5.3 2.9 1.1 -5.9 -4.4 -4.1 6 -.8z" fill="#8fd3ff"/>
      ${extra}
    </svg>`;
  }

  function setMascot(mood, say) {
    mascotEl.innerHTML = `${mascotSVG(mood)}${say ? `<span class="bubble">${esc(say)}</span>` : ''}`;
    mascotEl.dataset.mood = mood;
  }

  /* ---------- ルーレット盤 ---------- */
  const R = 140;
  const REST_ROTATION = 270; // 最初は90度戻しておき、文字が横向きで読めるようにする
  let rotation = REST_ROTATION;
  let spinning = false;

  function polar(deg, r) {
    const a = ((deg - 90) * Math.PI) / 180;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }

  function slicePath(a0, a1, r) {
    if (a1 - a0 >= 359.999) return `M0 ${-r} A${r} ${r} 0 1 1 -0.01 ${-r} Z`;
    const [x0, y0] = polar(a0, r);
    const [x1, y1] = polar(a1, r);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M0 0 L${x0.toFixed(3)} ${y0.toFixed(3)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(3)} ${y1.toFixed(3)} Z`;
  }

  function label(text, deg, r, cls) {
    const [x, y] = polar(deg, r);
    // 止まっているときの向き（REST_ROTATION）で上下さかさまにならないようにする
    let rot = deg;
    const onScreen = (deg + REST_ROTATION) % 360;
    if (onScreen > 90 && onScreen < 270) rot = deg + 180;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
  }

  function currentCanDeg() {
    const preset = CR.findPreset(topicEl.value);
    const p = state.mode === 'real' && preset ? CR.canProbability('real', preset) : 0.5;
    return { deg: p * 360, p, preset };
  }

  function drawWheel() {
    const { deg } = currentCanDeg();
    const canDeg = Math.min(360, Math.max(0, deg));
    let slices = '';
    let labels = '';
    if (canDeg > 0) slices += `<path d="${slicePath(0, canDeg, R)}" fill="url(#canGrad)"/>`;
    if (canDeg < 360) slices += `<path d="${slicePath(canDeg, 360, R)}" fill="url(#cannotGrad)"/>`;
    // 文字
    if (canDeg >= 24) labels += label('できる', canDeg / 2, R * 0.58, 'lbl lbl-can');
    if (360 - canDeg >= 24) labels += label('できない', canDeg + (360 - canDeg) / 2, R * 0.58, 'lbl lbl-cannot');
    // 極細の「できる」ゾーン
    let hair = '';
    if (canDeg < 4) {
      const [hx, hy] = polar(0, R);
      hair = `<line x1="0" y1="0" x2="${hx}" y2="${hy}" stroke="#ff5f97" stroke-width="1.2"/>` +
        `<text x="-12" y="${(-R * 0.6).toFixed(1)}" class="lbl-tiny" text-anchor="middle" transform="rotate(${360 - REST_ROTATION} -12 ${(-R * 0.6).toFixed(1)})">↑ できる（極細）</text>`;
    }
    // 雲の模様と外周のピン
    let pins = '';
    for (let i = 0; i < 12; i += 1) {
      const [px, py] = polar(i * 30 + 15, R - 9);
      pins += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.4" fill="#fff" stroke="#9fd2f5" stroke-width="1.5"/>`;
    }
    wheelEl.innerHTML = `
      <defs>
        <radialGradient id="canGrad" cx="0" cy="0" r="${R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bfe6ff"/><stop offset="1" stop-color="#5db7f2"/></radialGradient>
        <radialGradient id="cannotGrad" cx="0" cy="0" r="${R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef7ff"/></radialGradient>
      </defs>
      <circle r="${R + 10}" fill="#fff" stroke="#bfe6ff" stroke-width="4"/>
      <g id="wheelRot" style="transform: rotate(${rotation}deg)">
        ${slices}
        ${canDeg > 0 && canDeg < 360 ? `<path d="M0 0 L0 ${-R}" stroke="#8fc9ef" stroke-width="2"/><path d="M0 0 L${polar(canDeg, R).map((v) => v.toFixed(2)).join(' ')}" stroke="#8fc9ef" stroke-width="2"/>` : ''}
        ${hair}${labels}${pins}
      </g>
      <g class="hub">
        <circle r="30" fill="#fff6e8" stroke="#e8c8a0" stroke-width="3"/>
        <path d="M0 0 m0 -3 a3 3 0 1 1 -3 3 a6 6 0 1 1 6 6 a9 9 0 1 1 -12 -9 a12 12 0 1 1 15 15 a15 15 0 1 1 -21 -12" fill="none" stroke="#d9a873" stroke-width="3" stroke-linecap="round"/>
      </g>`;
    updateOdds();
  }

  function updateOdds() {
    const { p, preset } = currentCanDeg();
    if (state.mode === 'hero') {
      oddsEl.innerHTML = 'できる確率：<b>50%</b>（主人公モード）';
    } else if (!preset) {
      oddsEl.innerHTML = 'できる確率：<b>？？？</b> 本当の確率がわからないので 1/2 で回します';
    } else {
      const f = CR.formatProbability(preset.log10p);
      oddsEl.innerHTML = `できる確率：<b>${supify(f.main)}</b>（現実モード）${p === 0 ? '<br><small>「できる」ゾーンが細すぎて見えません</small>' : ''}`;
    }
  }

  function setRotation(r) {
    rotation = r;
    const g = document.getElementById('wheelRot');
    if (g) g.style.transform = `rotate(${r}deg)`;
  }

  /* ---------- お題 ---------- */
  function renderPresets() {
    presetsEl.innerHTML = CR.PRESETS.map((p) => `<button type="button" class="chip" data-text="${esc(p.text)}">${esc(p.text)}</button>`).join('');
    presetsEl.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
      if (spinning) return;
      topicEl.value = b.dataset.text;
      sound.unlock();
      sound.play('tap');
      onTopicChange();
    }));
  }

  function onTopicChange() {
    const t = topicEl.value.trim();
    presetsEl.querySelectorAll('.chip').forEach((b) => b.classList.toggle('is-active', b.dataset.text === t));
    drawWheel();
  }

  function setMode(mode) {
    state.mode = mode;
    save();
    document.querySelectorAll('[data-mode]').forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.body.classList.toggle('mode-real', mode === 'real');
    drawWheel();
  }

  /* ---------- 回す ---------- */
  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

  function spin() {
    if (spinning) return;
    sound.unlock();
    let text = topicEl.value.trim();
    if (!text) {
      const pick = CR.PRESETS[Math.floor(CR.rng() * CR.PRESETS.length)];
      topicEl.value = pick.text;
      text = pick.text;
      onTopicChange();
      toast('おまかせでお題を選んだよ');
    }
    const { deg, p, preset } = currentCanDeg();
    const result = CR.decide(p);
    const angle = CR.landingAngle(result, deg);
    const target = CR.finalRotation(rotation, angle, 6 + Math.floor(CR.rng() * 3));
    const from = rotation;
    const dur = reduceMotion() ? 700 : 4300;
    const t0 = performance.now();
    let lastPeg = Math.floor(from / 30);
    let lastTick = 0;

    spinning = true;
    spinBtn.disabled = true;
    topicEl.disabled = true;
    resultEl.hidden = true;
    document.body.classList.add('is-spinning');
    setMascot('dizzy', 'まわれ〜！');
    sound.play('start');

    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const r = from + (target - from) * easeOut(k);
      setRotation(r);
      const peg = Math.floor(r / 30);
      if (peg !== lastPeg && now - lastTick > 28) {
        lastPeg = peg;
        lastTick = now;
        sound.play('tick');
        const ptr = document.getElementById('pointer');
        ptr.classList.remove('is-tick');
        void ptr.offsetWidth;
        ptr.classList.add('is-tick');
      }
      if (k < 1) {
        requestAnimationFrame(step);
      } else {
        setRotation(target % 360);
        finish(text, result, preset, p);
      }
    };
    requestAnimationFrame(step);
  }

  function finish(text, result, preset, p) {
    spinning = false;
    spinBtn.disabled = false;
    topicEl.disabled = false;
    document.body.classList.remove('is-spinning');
    const can = result === 'can';

    state.stats.spins += 1;
    state.stats[can ? 'can' : 'cannot'] += 1;
    state.history.unshift({ t: Date.now(), text, result, mode: state.mode });
    if (state.history.length > HISTORY_MAX) state.history.length = HISTORY_MAX;
    save();

    setMascot(can ? 'happy' : 'sad', can ? 'できる！' : 'できない…');
    sound.play(can ? 'can' : 'cannot');
    if (navigator.vibrate) { try { navigator.vibrate(can ? [60, 40, 60] : [120]); } catch (e) { /* 無視 */ } }
    if (can) confetti();
    renderResult(text, can, preset, p);
    renderStats();
  }

  function renderResult(text, can, preset, p) {
    const real = state.mode === 'real';
    let realBox;
    if (preset) {
      const f = CR.formatProbability(preset.log10p);
      const o = CR.optimism(preset.log10p);
      realBox = `
        <div class="real-box">
          <div class="real-head">本当の確率</div>
          <div class="real-main">${supify(f.main)}</div>
          <div class="real-sub">${supify(preset.exact)}${preset.approx ? '（ざっくり）' : ''} ・ ${supify(f.sub)}</div>
          <p class="real-note">${esc(preset.note)}</p>
          ${o ? `<div class="optimism ${o.humble ? 'is-humble' : ''}">${supify(o.text)}</div>` : ''}
        </div>`;
    } else {
      realBox = `
        <div class="real-box">
          <div class="real-head">本当の確率</div>
          <div class="real-main">？？？</div>
          <p class="real-note">このお題の本当の確率はデータがありません。でも主人公にとっては、いつだって「できるか、できないか」の2分の1！</p>
        </div>`;
    }
    const lead = real ? '現実モードで回した結果…' : '主人公理論で回した結果…';
    const theory = real
      ? (p === 0 ? '「できる」ゾーンは細すぎて、針が止まることはまずありません。' : `できる確率 ${supify(CR.formatProbability(Math.log10(p)).main)} で回しました。`)
      : '主人公理論：「できるか、できないか」の2分の1（50%）！';
    resultEl.innerHTML = `
      <div class="result-card ${can ? 'is-can' : 'is-cannot'}">
        <p class="result-lead">${lead}</p>
        <p class="result-topic">「${esc(text)}」は</p>
        <p class="result-big">${can ? 'できる！' : 'できない…'}</p>
        <p class="result-theory">${theory}</p>
        ${realBox}
        <div class="result-actions">
          <button type="button" class="btn btn-main" id="againBtn">もう一回まわす</button>
          <button type="button" class="btn btn-sub" id="shareBtn">シェア</button>
        </div>
      </div>`;
    resultEl.hidden = false;
    $('againBtn').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); spin(); });
    $('shareBtn').addEventListener('click', () => share(text, can));
    setTimeout(() => resultEl.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }), 350);
  }

  function share(text, can) {
    const msg = `「${text}」は… ${can ? 'できる！' : 'できない…'}（${state.mode === 'real' ? '現実モード' : '主人公理論：確率1/2'}）☁️ #シナモンルーレット`;
    const url = location.href.split('#')[0];
    if (navigator.share) {
      navigator.share({ title: 'シナモンルーレット', text: msg, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${msg} ${url}`).then(() => toast('コピーしました！'), () => toast('コピーできませんでした'));
    } else {
      toast(msg);
    }
  }

  /* ---------- 成績・履歴 ---------- */
  function renderStats() {
    const s = state.stats;
    const rate = s.spins ? Math.round((s.can / s.spins) * 1000) / 10 : 0;
    statsEl.innerHTML = `
      <div class="stat"><span>まわした回数</span><b>${s.spins}</b></div>
      <div class="stat"><span>できる</span><b class="c-can">${s.can}</b></div>
      <div class="stat"><span>できない</span><b class="c-cannot">${s.cannot}</b></div>
      <div class="bar" aria-label="できる率 ${rate}%"><div class="bar-can" style="width:${s.spins ? rate : 50}%"></div></div>
      <p class="bar-note">できる率 <b>${s.spins ? `${rate}%` : '—'}</b>（主人公理論どおりなら、回すほど50%に近づくはず）</p>`;
    historyEl.innerHTML = state.history.length
      ? state.history.map((h) => {
        const d = new Date(h.t);
        const time = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `<li class="${h.result === 'can' ? 'is-can' : 'is-cannot'}"><span class="h-res">${h.result === 'can' ? 'できる' : 'できない'}</span><span class="h-text">${esc(h.text)}<small>${h.mode === 'real' ? '現実モード' : '主人公モード'} ・ ${time}</small></span></li>`;
      }).join('')
      : '<li class="empty">まだ回していません</li>';
  }

  /* ---------- 紙吹雪（雲・ハート・星） ---------- */
  let fx = null;
  function confetti() {
    if (reduceMotion()) return;
    if (!fx) {
      const c = document.createElement('canvas');
      c.className = 'fx';
      c.setAttribute('aria-hidden', 'true');
      document.body.appendChild(c);
      fx = { c, ctx: c.getContext('2d'), parts: [], raf: 0 };
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fx.c.width = window.innerWidth * dpr;
    fx.c.height = window.innerHeight * dpr;
    fx.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#8fd3ff', '#ffb3cd', '#ffffff', '#ffe28a', '#c9b8ff'];
    const shapes = ['heart', 'star', 'cloud', 'dot'];
    for (let i = 0; i < 90; i += 1) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = 5 + Math.random() * 8;
      fx.parts.push({
        x: window.innerWidth / 2, y: window.innerHeight * 0.45,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        s: 6 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2,
        color: colors[i % colors.length], shape: shapes[i % shapes.length], life: 0,
      });
    }
    const draw = (p) => {
      const g = fx.ctx;
      g.fillStyle = p.color;
      g.strokeStyle = 'rgba(120,170,210,.5)';
      g.lineWidth = 1;
      g.beginPath();
      if (p.shape === 'heart') {
        const s = p.s / 10;
        g.moveTo(0, 3 * s);
        g.bezierCurveTo(-8 * s, -3 * s, -4 * s, -9 * s, 0, -4 * s);
        g.bezierCurveTo(4 * s, -9 * s, 8 * s, -3 * s, 0, 3 * s);
      } else if (p.shape === 'star') {
        for (let k = 0; k < 10; k += 1) {
          const r = k % 2 ? p.s * 0.22 : p.s * 0.55;
          const an = (k * Math.PI) / 5;
          g.lineTo(Math.cos(an) * r, Math.sin(an) * r);
        }
      } else if (p.shape === 'cloud') {
        g.arc(-p.s * 0.3, 0, p.s * 0.3, 0, Math.PI * 2);
        g.arc(p.s * 0.1, -p.s * 0.15, p.s * 0.38, 0, Math.PI * 2);
        g.arc(p.s * 0.45, 0, p.s * 0.28, 0, Math.PI * 2);
      } else {
        g.arc(0, 0, p.s * 0.3, 0, Math.PI * 2);
      }
      g.closePath();
      g.fill();
      if (p.color === '#ffffff') g.stroke();
    };
    const loop = () => {
      const g = fx.ctx;
      g.clearRect(0, 0, window.innerWidth, window.innerHeight);
      fx.parts = fx.parts.filter((p) => p.life < 150 && p.y < window.innerHeight + 30);
      fx.parts.forEach((p) => {
        p.life += 1;
        p.vy += 0.2;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        g.save();
        g.globalAlpha = Math.max(0, 1 - p.life / 150);
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        draw(p);
        g.restore();
      });
      fx.raf = fx.parts.length ? requestAnimationFrame(loop) : 0;
    };
    if (!fx.raf) fx.raf = requestAnimationFrame(loop);
  }

  /* ---------- 起動 ---------- */
  function applySound() {
    sound.setEnabled(state.sound);
    soundBtn.setAttribute('aria-pressed', state.sound ? 'true' : 'false');
    soundBtn.classList.toggle('is-off', !state.sound);
  }

  function init() {
    load();
    applySound();
    renderPresets();
    setMascot('normal', 'なんでも1/2だよ');
    topicEl.value = CR.PRESETS[0].text;
    setMode(state.mode === 'real' ? 'real' : 'hero');
    onTopicChange();
    renderStats();

    topicEl.addEventListener('input', onTopicChange);
    topicEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); spin(); } });
    spinBtn.addEventListener('click', spin);
    document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      if (spinning || state.mode === b.dataset.mode) return;
      sound.unlock();
      setMode(b.dataset.mode);
      sound.play(b.dataset.mode === 'real' ? 'real' : 'hero');
      setMascot(b.dataset.mode === 'real' ? 'sad' : 'normal', b.dataset.mode === 'real' ? '現実はきびしい…' : 'なんでも1/2だよ');
    }));
    soundBtn.addEventListener('click', () => {
      state.sound = !state.sound;
      save();
      applySound();
      if (state.sound) { sound.unlock(); sound.play('hero'); }
      toast(state.sound ? 'サウンド ON' : 'サウンド OFF');
    });
    $('resetBtn').addEventListener('click', () => {
      if (!window.confirm('回した回数と履歴をリセットしますか？')) return;
      state.history = [];
      state.stats = { spins: 0, can: 0, cannot: 0 };
      save();
      renderStats();
      toast('リセットしました');
    });
  }

  init();
})(window.CR = window.CR || {});
