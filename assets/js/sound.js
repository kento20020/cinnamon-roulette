/* 効果音（Web Audio API で合成。音声ファイルなし） */
(function (CR) {
  'use strict';

  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, t, d, o) {
    if (!enabled || !ensure()) return;
    const opt = o || {};
    const now = ctx.currentTime + (t || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opt.type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (opt.to) osc.frequency.exponentialRampToValueAtTime(opt.to, now + (opt.glide || d));
    if (opt.vib) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = opt.vib[0];
      lg.gain.value = opt.vib[1];
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(now); lfo.stop(now + d + 0.1);
    }
    const v = opt.v == null ? 0.25 : opt.v;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(v, now + (opt.a || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, now + d);
    osc.connect(g); g.connect(master);
    osc.start(now);
    osc.stop(now + d + 0.05);
  }

  const N = (semi) => 440 * Math.pow(2, semi / 12); // A4 からの半音

  const SFX = {
    tap() { tone(1100, 0, 0.05, { v: 0.12, to: 800 }); },
    // ルーレットのカチッ
    tick() { tone(1700, 0, 0.03, { type: 'triangle', v: 0.14, to: 900 }); },
    // まわしはじめ：ふわっ
    start() {
      tone(300, 0, 0.45, { type: 'triangle', to: 1200, v: 0.16, glide: 0.4 });
      tone(600, 0.05, 0.4, { to: 2000, v: 0.08, glide: 0.35 });
    },
    // できる：キラキラ＋パンパカパーン
    can() {
      [3, 7, 10, 15].forEach((s, i) => tone(N(s), i * 0.08, 0.5, { type: 'triangle', v: 0.18 }));
      [15, 19, 22].forEach((s) => tone(N(s), 0.38, 0.9, { type: 'triangle', v: 0.12 }));
      [27, 31, 34, 39].forEach((s, i) => tone(N(s), 0.45 + i * 0.07, 0.4, { v: 0.07 }));
    },
    // できない：ぽよよ〜ん
    cannot() {
      tone(520, 0, 0.25, { type: 'triangle', to: 380, v: 0.2 });
      tone(380, 0.27, 0.7, { type: 'triangle', to: 180, v: 0.2, vib: [7, 14] });
    },
    // 現実モードに切り替え：ゴゴゴ
    real() { tone(110, 0, 0.5, { type: 'sawtooth', v: 0.08, to: 70 }); },
    hero() { tone(N(10), 0, 0.12, { type: 'triangle', v: 0.14 }); tone(N(17), 0.1, 0.25, { type: 'triangle', v: 0.14 }); },
  };

  function play(name) {
    if (!enabled || !SFX[name]) return;
    try { SFX[name](); } catch (e) { console.warn('sound error:', name, e); }
  }

  CR.sound = {
    play,
    unlock() { if (enabled) ensure(); },
    setEnabled(v) { enabled = !!v; },
    get enabled() { return enabled; },
    names: Object.keys(SFX),
  };
})(window.CR = window.CR || {});
