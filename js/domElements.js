/**
 * domElements.js
 * HTMLファイル内にある各要素（ボタン、表示エリアなど）を JavaScript で操作するために取得し、
 * 使いやすいように名前（変数）をつけてまとめておくファイルです。
 *
 * document.getElementById('ID名') は、HTMLの中から指定されたIDを持つ要素を探してくる命令です。
 */

// --- ジャンル選択画面の要素 ---
/** ジャンル選択画面全体を囲む<div>要素 */
export const genreSelectionDiv = document.getElementById('genre-selection');
/** ジャンル選択のチェックボックスが表示される<div>要素 */
export const genreOptionsDiv = document.getElementById('genre-options');
/** 「あと〇個選んでください」などのメッセージを表示する<p>要素 */
export const messageP = document.getElementById('genre-message');
/** 「診断開始」ボタン要素 */
export const startButton = document.getElementById('start-button');

// --- クイズ画面の要素 ---
/** クイズ画面全体を囲む<div>要素 */
export const containerDiv = document.getElementById('container');
/** 問題のアーティストのジャンルを表示する<p>要素 */
export const genreP = document.getElementById('genre');
/** 問題文（アーティスト名など）を表示する<p>要素 */
export const questionP = document.getElementById('question');
/** プログレスバーの外側のコンテナ<div>要素 */
export const progressContainer = document.getElementById('progress-container');
/** プログレスバー本体（色が変わる部分）の<div>要素 */
export const progressBar = document.getElementById('progress-bar');
/** 「〇 / 〇問」という進捗テキストを表示する<p>要素 */
export const progressText = document.getElementById('progress-text');
/** 回答ボタン（「よく聴く」など）が表示される<div>要素 */
export const buttonsDiv = document.getElementById('buttons');

// --- 結果表示画面の要素 ---
/** 結果のレーダーチャートを描画するための<canvas>要素 */
export const chartCanvas = document.getElementById('chart');
/** 結果のテキスト（評価、テーブル、おすすめ）を表示する<div>要素 */
export const resultDiv = document.getElementById('result');


// --- 要素存在チェック (おまけ) ---
// 念のため、取得した要素が本当にHTML内に存在するかどうかを確認します。
// もし見つからない要素があれば、コンソールにエラーメッセージを出します。
const allElements = {
    genreSelectionDiv, containerDiv, chartCanvas, resultDiv, startButton,
    genreOptionsDiv, messageP, questionP, genreP, progressContainer,
    progressBar, progressText, buttonsDiv
};

for (const key in allElements) {
    if (!allElements[key]) {
        // `console.error` は、開発者ツールにエラーメッセージを表示する命令です。
        console.error(`HTML要素が見つかりません: ID="${key.replace('Div', '').replace('P', '').replace('Canvas', '').toLowerCase()}" を持つ要素が index.html に存在するか確認してください。`);
        // ここで処理を停止させることもできますが、今回はメッセージ表示のみにします。
    }
}
