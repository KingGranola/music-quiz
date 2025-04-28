/**
 * chartRenderer.js
 * 結果表示画面のレーダーチャートを描画する処理をまとめたファイルです。
 * Chart.js という外部ライブラリを使用しています。
 */

// import { chartCanvas } from './domElements.js'; // ← 引数で受け取るため不要

/**
 * レーダーチャートを描画（または更新）します。
 * @param {HTMLCanvasElement} canvasElement - 描画対象の Canvas 要素
 * @param {string[]} labels - チャートの各軸のラベル（ジャンル名など）の配列。
 * @param {number[]} data - 各ラベルに対応するデータの値（知識レベル％など）の配列。
 */
export function renderRadarChart(canvasElement, labels, data) { // ← 第一引数を追加
  // --- デバッグログ追加 ---
  console.log('[chartRenderer] renderRadarChart 関数が呼び出されました。');
  console.log('[chartRenderer] 受け取った canvasElement:', canvasElement);
  console.log('[chartRenderer] 受け取った labels:', labels);
  console.log('[chartRenderer] 受け取った data:', data);

  // canvasElement が存在し、Canvas 要素であるか確認
  if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) { // ← 引数をチェック
    console.error("[chartRenderer] ERROR: 有効な Canvas 要素が渡されませんでした。");
    return; // 処理中断
  } else {
    console.log("[chartRenderer] 有効な Canvas 要素を受け取りました。");
  }

  // Canvas 要素から描画コンテキストを取得します。
  let ctx;
  try {
      ctx = canvasElement.getContext("2d"); // ← 引数の要素を使用
      if (!ctx) {
          console.error("[chartRenderer] ERROR: Canvas の 2D コンテキストを取得できませんでした。");
          return; // 処理中断
      } else {
          console.log("[chartRenderer] Canvas の 2D コンテキストを取得しました。");
      }
  } catch (error) {
      console.error("[chartRenderer] ERROR: getContext('2d') でエラーが発生しました:", error);
      return; // 処理中断
  }


  // --- 既存チャートの破棄 ---
  try {
      const existingChart = Chart.getChart(canvasElement); // ← 引数の要素を使用
      if (existingChart) {
        console.log("[chartRenderer] 既存のチャートが見つかったため、破棄します。");
        existingChart.destroy(); // 既存チャートを削除
      } else {
        console.log("[chartRenderer] 既存のチャートはありません。");
      }
  } catch (error) {
      console.warn("[chartRenderer] 既存チャートの取得または破棄中にエラーが発生しました:", error);
      // 続行を試みる
  }


  // --- 新しいチャートの作成 ---
  console.log("[chartRenderer] 新しい Chart インスタンスを作成します...");
  try {
      // Chart.js がグローバルに存在するか確認
      if (typeof Chart === 'undefined') {
          console.error("[chartRenderer] ERROR: Chart is not defined. Chart.js ライブラリが正しく読み込まれていません。index.html を確認してください。");
          return; // 処理中断
      }

      new Chart(ctx, { // ctx は上で取得済み
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: '知識度（%）',
            data: data,
            fill: true,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            pointBackgroundColor: 'rgba(75, 192, 192, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: { display: true },
              suggestedMin: 0,
              suggestedMax: 100,
              ticks: {
                backdropColor: 'rgba(255, 255, 255, 0.75)',
                stepSize: 20
              },
              pointLabels: { font: { size: 13 } }
            }
          },
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) { label += ': '; }
                  if (context.parsed.r !== null) { label += context.parsed.r + '%'; }
                  return label;
                }
              }
            }
          }
        }
      });

      console.log("[chartRenderer] 新しいチャートの作成に成功しました。");

      // チャートが描画されたら Canvas 要素を表示状態にします。
      canvasElement.classList.remove('hidden'); // ← 引数の要素を使用
      console.log("[chartRenderer] Canvas 要素の hidden クラスを削除しました。");

  } catch (error) {
      console.error("[chartRenderer] ERROR: new Chart(...) でチャートの作成中にエラーが発生しました:", error);
      // エラー発生時は canvas を隠すなどのフォールバック処理
      canvasElement.classList.add('hidden'); // ← 引数の要素を使用
  }
}
