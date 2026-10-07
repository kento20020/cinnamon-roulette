/* お題データと、ルーレットの計算（画面に依存しない部分） */
(function (CR) {
  'use strict';

  // log10p: 本当の確率の常用対数（例：1/6 → -0.778…）。null は「わからない」
  const PRESETS = [
    {
      id: 'dice100t',
      text: '100兆個のサイコロを投げて全部1になる',
      log10p: -77815125038364.36, // (1/6)^(10^14)
      exact: '(1/6)の100兆乗',
      note: 'サイコロ1個で1が出る確率1/6を、100兆回かけ算した数です。0.000…と「0」が約77兆8151億個も続いたあとに、やっと数字が出てきます。',
    },
    {
      id: 'wall',
      text: '人が壁をすり抜ける（量子トンネル効果）',
      log10p: -9.0e33,
      approx: true,
      exact: 'およそ 10^−(9×10^33)',
      note: '体重60kgの人をまるごと1つの粒子とみなし、厚さ10cmの壁を通り抜けると仮定した超ざっくり計算です（仮定しだいで桁が大きく変わります）。サイコロ100兆個より、さらにケタ違いに起こりません。',
    },
    {
      id: 'jumbo',
      text: '年末ジャンボ宝くじ（1枚）で1等が当たる',
      log10p: Math.log10(1 / 20000000),
      exact: '2,000万分の1',
      note: '1等は2,000万枚に1本。1枚だけ買った場合の確率です。',
    },
    {
      id: 'royal',
      text: 'ポーカーで最初の5枚がロイヤルストレートフラッシュ',
      log10p: Math.log10(4 / 2598960),
      exact: '64万9740分の1',
      note: '52枚から5枚を選ぶ組み合わせ2,598,960通りのうち、ロイヤルストレートフラッシュは4通りだけです。',
    },
    {
      id: 'rps10',
      text: '1回勝負のじゃんけんで10連勝（あいこも負け）',
      log10p: Math.log10(1 / 59049),
      exact: '5万9049分の1',
      note: '1回で勝つ確率は1/3。それを10回続けるので(1/3)の10乗です。',
    },
    {
      id: 'coin10',
      text: 'コインを10回投げて全部表',
      log10p: Math.log10(1 / 1024),
      exact: '1024分の1',
      note: '1回で表が出る確率は1/2。10回続けると(1/2)の10乗です。',
    },
    {
      id: 'dice1',
      text: 'サイコロを1回振って1が出る',
      log10p: Math.log10(1 / 6),
      exact: '6分の1',
      note: 'これは主人公理論（1/2）より低いけど、まだ現実的な確率です。',
    },
    {
      id: 'birthday',
      text: '30人のクラスに誕生日が同じ人がいる',
      log10p: Math.log10(0.7063162427192688),
      exact: '約70.6%',
      note: '「誕生日のパラドックス」。直感より高く、なんと主人公理論の1/2を超えます！（うるう年なし・誕生日は均等と仮定）',
    },
  ];

  const presetByText = {};
  PRESETS.forEach((p) => { presetByText[p.text] = p; });

  function findPreset(text) {
    return presetByText[String(text || '').trim()] || null;
  }

  function defaultRng() {
    try {
      const a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return a[0] / 4294967296;
    } catch (e) {
      return Math.random();
    }
  }

  // log10 から確率（小さすぎると 0）
  function probFromLog10(log10p) {
    if (log10p == null) return null;
    if (log10p < -320) return 0;
    return Math.pow(10, log10p);
  }

  /**
   * 「できる」になる確率
   * mode: 'hero'（主人公モード：いつでも 1/2）/ 'real'（現実モード）
   */
  function canProbability(mode, preset) {
    if (mode !== 'real' || !preset) return 0.5;
    return probFromLog10(preset.log10p);
  }

  function decide(p, rng) {
    return (rng || defaultRng)() < p ? 'can' : 'cannot';
  }

  /**
   * 結果に合う止まり位置（ルーレット上の角度）を選ぶ
   * ルーレットは上（0度）から時計回りに「できる」が canDeg 度、残りが「できない」
   */
  function landingAngle(result, canDeg, rng) {
    const r = rng || defaultRng;
    const start = result === 'can' ? 0 : canDeg;
    const width = result === 'can' ? canDeg : 360 - canDeg;
    if (width <= 0) return start;
    // 3割くらいは境目ギリギリに止めてドキドキさせる
    const edgy = r() < 0.3;
    let k;
    if (edgy) {
      const nearEnd = r() < 0.5;
      const d = 0.02 + r() * 0.05;
      k = nearEnd ? 1 - d : d;
    } else {
      k = 0.15 + r() * 0.7;
    }
    return start + width * k;
  }

  /**
   * 最終的な回転角度（時計回り、度）
   * 回転 R のとき、上の針が指すのはルーレット上の角度 (360 - R) mod 360
   */
  function finalRotation(current, angle, spins) {
    const want = ((360 - angle) % 360 + 360) % 360;
    const now = ((current % 360) + 360) % 360;
    const delta = ((want - now) + 360) % 360;
    return current + (spins || 6) * 360 + delta;
  }

  function pointerAngle(rotation) {
    return ((360 - (rotation % 360)) % 360 + 360) % 360;
  }

  /* ---------- 表示用の数字 ---------- */
  function groupDigits(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function jpBig(n) {
    // 大きな数を「兆・億・万」で読みやすく
    if (n < 10) return String(Math.round(n * 10) / 10);
    const units = [[1e16, '京'], [1e12, '兆'], [1e8, '億'], [1e4, '万']];
    for (let i = 0; i < units.length; i += 1) {
      if (n >= units[i][0]) {
        const v = n / units[i][0];
        return `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10}${units[i][1]}`;
      }
    }
    return groupDigits(n);
  }

  /**
   * 確率を文字で表す
   * @returns {{main: string, sub: string}}
   */
  function formatProbability(log10p) {
    if (log10p == null) return { main: '？？？', sub: 'データなし（でも主人公なら1/2）' };
    const p = Math.pow(10, log10p);
    if (log10p >= -4) {
      const pct = p * 100;
      const main = pct >= 1 ? `${Math.round(pct * 10) / 10}%` : `${pct.toPrecision(2)}%`;
      return { main, sub: `約${jpBig(1 / p)}回に1回` };
    }
    if (log10p > -300) {
      return { main: `約${jpBig(1 / p)}分の1`, sub: `${p.toExponential(1).replace('e-', '×10^−').replace('e+', '×10^')}` };
    }
    const zeros = Math.floor(-log10p) - 1;
    if (-log10p < 1e15) {
      return { main: `10^−${groupDigits(-log10p)}`, sub: `小数点のあとに0が約${jpBig(zeros)}個` };
    }
    const exp = Math.floor(Math.log10(-log10p));
    return { main: `10^−(10^${exp})以下`, sub: '0が並ぶ数だけで宇宙が終わるレベル' };
  }

  // 主人公理論（1/2）が本当の確率の何倍か
  function optimism(log10p) {
    if (log10p == null) return null;
    const diff = Math.log10(0.5) - log10p; // log10(0.5 / p)
    if (diff <= 0) {
      return { text: `主人公理論のほうが${(1 / Math.pow(10, diff)).toFixed(2)}倍弱気！`, humble: true };
    }
    if (diff < 15) return { text: `主人公は約${jpBig(Math.pow(10, diff))}倍ポジティブ`, humble: false };
    if (diff < 1e15) return { text: `主人公は約10^${groupDigits(diff)}倍ポジティブ`, humble: false };
    return { text: `主人公は約10^(10^${Math.floor(Math.log10(diff))})倍ポジティブ`, humble: false };
  }

  CR.PRESETS = PRESETS;
  CR.findPreset = findPreset;
  CR.rng = defaultRng;
  CR.canProbability = canProbability;
  CR.decide = decide;
  CR.landingAngle = landingAngle;
  CR.finalRotation = finalRotation;
  CR.pointerAngle = pointerAngle;
  CR.formatProbability = formatProbability;
  CR.optimism = optimism;
  CR.probFromLog10 = probFromLog10;
})(window.CR = window.CR || {});
