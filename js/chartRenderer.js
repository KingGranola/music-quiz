/**
 * chartRenderer.js
 * 結果表示画面のレーダーチャートを描画する処理をまとめたファイルです。
 * Chart.js という外部ライブラリを使用しています。
 */

// Chart.js ライブラリがグローバルスコープにあることを前提としています。
// (index.html で <script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script> で読み込んでいるため)
// もし import 形式で使いたい場合は、Chart.js の使い方に合わせて変更が必要です。

// 結果表示画面のチャートを描画する Canvas 要素を domElements.js から読み込みます。
import { chartCanvas } from './domElements.js';

/**
 * レーダーチャートを描画（または更新）します。
 * @param {string[]} labels - チャートの各軸のラベル（ジャンル名など）の配列。
 * @param {number[]} data - 各ラベルに対応するデータの値（知識レベル％など）の配列。
 */
export function renderRadarChart(labels, data) {
  // chartCanvas が存在するか念のため確認
  if (!chartCanvas) {
    console.error("チャートを描画するための Canvas 要素が見つかりません。");
    return;
  }

  // Canvas 要素から描画コンテキストを取得します。これを使って Chart.js が描画します。
  const ctx = chartCanvas.getContext("2d");

  // --- 既存チャートの破棄 ---
  // もし同じ Canvas に既にチャートが描画されている場合、それを破棄(削除)します。
  // これをしないと、チャートが重なって表示されたり、エラーの原因になったりします。
  // `Chart.getChart(chartCanvas)` で既存のチャートインスタンスを取得できます。
  const existingChart = Chart.getChart(chartCanvas);
  if (existingChart) {
    existingChart.destroy(); // 既存チャートを削除
  }

  // --- 新しいチャートの作成 ---
  // Chart.js を使って新しいレーダーチャートを作成します。
  new Chart(ctx, {
    type: 'radar', // チャートの種類を 'radar' (レーダーチャート) に指定
    data: {
      labels: labels, // 各軸のラベル (例: ["ロック", "ポップス", "ジャズ"])
      datasets: [{
        label: '知識度（%）', // データセットの凡例ラベル
        data: data,           // 各軸の値 (例: [80, 65, 40])
        fill: true,           // データの内側を塗りつぶすか (true = 塗りつぶす)
        backgroundColor: 'rgba(75, 192, 192, 0.2)', // 塗りつぶしの色 (半透明の青緑)
        borderColor: 'rgba(75, 192, 192, 1)',     // 線の色 (不透明の青緑)
        pointBackgroundColor: 'rgba(75, 192, 192, 1)', // データ点の背景色
        pointBorderColor: '#fff',                   // データ点の枠線の色 (白)
        pointHoverBackgroundColor: '#fff',          // マウスホバー時のデータ点の背景色
        pointHoverBorderColor: 'rgba(75, 192, 192, 1)' // マウスホバー時のデータ点の枠線の色
      }]
    },
    options: {
      // --- チャートの見た目や動作に関する設定 ---
      responsive: true, // ウィンドウサイズに合わせてチャートサイズを自動調整するか
      maintainAspectRatio: false, // Canvas要素のサイズに合わせて描画するか (false推奨、CSSでサイズ制御しやすくなる)
      scales: {
        r: { // レーダーチャートの放射軸 (値の軸) の設定
          suggestedMin: 0,   // 軸の最小値の推奨値 (0%)
          suggestedMax: 100, // 軸の最大値の推奨値 (100%)
          ticks: {
            backdropColor: 'rgba(255, 255, 255, 0.75)', // 目盛りの背景色 (少し透明な白)
            stepSize: 20 // 目盛りの間隔 (0, 20, 40, ...)
          },
          pointLabels: { // 各軸の先端に表示されるラベル (ジャンル名) の設定
            font: {
              size: 13 // フォントサイズを少し大きく
            }
          }
        }
      },
      plugins: { // チャートの追加機能 (プラグイン) の設定
        legend: { // 凡例 (データセットのラベル表示) の設定
          display: true, // 凡例を表示する
          position: 'top', // 表示位置を上部に
        },
        tooltip: { // データ点にマウスを合わせたときに表示されるツールチップの設定
          callbacks: {
            // ツールチップに表示されるテキストをカスタマイズ
            label: function(context) {
              // `context` にはツールチップに関する情報が入っています
              let label = context.dataset.label || ''; // データセットのラベル (例: '知識度（%）')
              if (label) {
                label += ': ';
              }
              // `context.parsed.r` に軸の値 (パーセンテージ) が入っている
              if (context.parsed.r !== null) {
                label += context.parsed.r + '%'; // 値に '%' を付けて表示
              }
              return label; // 例: "知識度（%）: 80%"
            }
          }
        }
      }
    }
  });

  // チャートが描画されたら Canvas 要素を表示状態にします。
  chartCanvas.classList.remove('hidden');
}
