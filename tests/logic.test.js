/* ルーレットの計算テスト（node --test で実行） */
const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.window = globalThis;
require('../assets/js/logic.js');

const CR = globalThis.CR;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('お題データ：重複なし・確率は0〜1', () => {
  const texts = new Set(CR.PRESETS.map((p) => p.text));
  assert.equal(texts.size, CR.PRESETS.length);
  CR.PRESETS.forEach((p) => {
    assert.ok(p.log10p <= 0, p.id);
    assert.ok(p.exact && p.note, p.id);
    assert.equal(CR.findPreset(`  ${p.text} `), p, '前後の空白は無視');
  });
  assert.equal(CR.findPreset('明日晴れる'), null);
});

test('主人公モード：どんなお題でも「できる」は約50%', () => {
  const rng = seeded(1);
  const preset = CR.findPreset('100兆個のサイコロを投げて全部1になる');
  const p = CR.canProbability('hero', preset);
  assert.equal(p, 0.5);
  let can = 0;
  const N = 40000;
  for (let i = 0; i < N; i += 1) if (CR.decide(p, rng) === 'can') can += 1;
  assert.ok(Math.abs(can / N - 0.5) < 0.01, `できる率 ${can / N}`);
});

test('現実モード：本当の確率どおりに決まる', () => {
  const rng = seeded(2);
  const dice1 = CR.findPreset('サイコロを1回振って1が出る');
  const p = CR.canProbability('real', dice1);
  assert.ok(Math.abs(p - 1 / 6) < 1e-12);
  let can = 0;
  const N = 60000;
  for (let i = 0; i < N; i += 1) if (CR.decide(p, rng) === 'can') can += 1;
  assert.ok(Math.abs(can / N - 1 / 6) < 0.01, `できる率 ${can / N}`);

  const huge = CR.findPreset('100兆個のサイコロを投げて全部1になる');
  assert.equal(CR.canProbability('real', huge), 0);
  for (let i = 0; i < 1000; i += 1) assert.equal(CR.decide(0, rng), 'cannot');

  assert.equal(CR.canProbability('real', null), 0.5, 'データなしは1/2');
});

test('止まる位置：結果のゾーンの中に入り、針がその位置を指す', () => {
  const rng = seeded(3);
  [180, 60, 254.27, 0.000001, 0].forEach((canDeg) => {
    for (let i = 0; i < 3000; i += 1) {
      const result = canDeg > 0 && rng() < 0.5 ? 'can' : 'cannot';
      const angle = CR.landingAngle(result, canDeg, rng);
      if (result === 'can') assert.ok(angle >= 0 && angle <= canDeg, `can ${canDeg} → ${angle}`);
      else assert.ok(angle >= canDeg && angle <= 360, `cannot ${canDeg} → ${angle}`);

      const current = rng() * 5000 - 1000;
      const spins = 6 + Math.floor(rng() * 3);
      const fin = CR.finalRotation(current, angle, spins);
      assert.ok(fin >= current + spins * 360 && fin < current + (spins + 1) * 360, '回転量');
      const diff = Math.abs(((CR.pointerAngle(fin) - angle) % 360 + 540) % 360 - 180);
      assert.ok(diff < 1e-6, `針の位置 ${CR.pointerAngle(fin)} と ${angle}`);
    }
  });
});

test('確率の表示', () => {
  const f = (text) => CR.formatProbability(CR.findPreset(text).log10p);
  assert.equal(f('サイコロを1回振って1が出る').main, '16.7%');
  assert.equal(f('30人のクラスに誕生日が同じ人がいる').main, '70.6%');
  assert.equal(f('コインを10回投げて全部表').main, '0.098%');
  assert.equal(f('年末ジャンボ宝くじ（1枚）で1等が当たる').main, '約2000万分の1');
  assert.equal(f('100兆個のサイコロを投げて全部1になる').main, '10^−77,815,125,038,364');
  assert.match(f('人が壁をすり抜ける（量子トンネル効果）').main, /^10\^−\(10\^33\)以下$/);
  assert.equal(CR.formatProbability(null).main, '？？？');
});

test('主人公の前向きさ', () => {
  assert.match(CR.optimism(CR.findPreset('サイコロを1回振って1が出る').log10p).text, /約3倍ポジティブ/);
  const b = CR.optimism(CR.findPreset('30人のクラスに誕生日が同じ人がいる').log10p);
  assert.equal(b.humble, true, '誕生日は主人公理論より高い');
  assert.match(CR.optimism(CR.findPreset('100兆個のサイコロを投げて全部1になる').log10p).text, /10\^77,815,125,038,364倍/);
  assert.equal(CR.optimism(null), null);
});
