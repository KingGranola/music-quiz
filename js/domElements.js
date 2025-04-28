/**
 * domElements.js
 * HTMLから特定の要素を取得し、エクスポートします。
 * これにより、他のファイルで document.getElementById を何度も書く必要がなくなります。
 */

// --- ジャンル選択画面の要素 ---
export const genreSelectionDiv = document.getElementById('genre-selection');
export const genreOptionsDiv = document.getElementById('genre-options');
export const messageP = document.getElementById('genre-message'); // ジャンル選択時のメッセージ用
export const startButton = document.getElementById('start-button');

// --- クイズ画面の要素 ---
export const containerDiv = document.getElementById('container');
export const questionP = document.getElementById('question');
export const genreP = document.getElementById('genre');
export const progressContainer = document.getElementById('progress-container');
export const progressBar = document.getElementById('progress-bar');
export const progressText = document.getElementById('progress-text');
export const buttonsDiv = document.getElementById('buttons');
// ↓↓↓ フィードバックメッセージ用の要素を追加 ↓↓↓
export const feedbackMessageP = document.getElementById('feedback-message');

// --- 結果表示画面の要素 ---
export const resultDiv = document.getElementById('result');
export const chartCanvas = document.getElementById('chart'); // Chart.js が描画する canvas 要素

// --- 要素存在チェック (開発用) ---
// 取得した要素をオブジェクトにまとめる
const allElements = {
    genreSelectionDiv, genreOptionsDiv, messageP, startButton,
    containerDiv, questionP, genreP, progressContainer, progressBar,
    progressText, buttonsDiv, feedbackMessageP, // ← チェック対象に追加
    resultDiv, chartCanvas
};

// 各要素が存在するかどうかをコンソールに出力
for (const [key, element] of Object.entries(allElements)) {
    if (!element) {
        console.warn(`DOM要素が見つかりません: ${key} (ID: ${key.replace(/([A-Z])/g, '-$1').toLowerCase().replace('-div','').replace('-p','').replace('-canvas','')})`);
    }
}

// 注意: ID名と変数名が一致しない場合は、上記の警告メッセージのID部分が不正確になる可能性があります。
