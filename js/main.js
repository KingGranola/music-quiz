/**
 * main.js
 * このアプリケーションの出発点となるファイルです。
 * ページの読み込みが完了したら、ここから各モジュールの初期設定や
 * ボタンクリックなどのイベントに対する処理の紐付けを行います。
 */

// 必要なモジュールや要素、設定を読み込みます
import {
    startButton, genreOptionsDiv
} from './domElements.js'; // 画面要素 (必要なものだけ)
import { renderGenreOptions, handleGenreSelectionChange, showQuizScreen, showGenreSelectionScreen } from './uiController.js'; // UI操作関数
import { startQuiz } from './quizLogic.js'; // クイズ開始ロジック
import { MIN_GENRES_TO_START } from './config.js'; // 設定値

/**
 * アプリケーション全体の初期化を行う関数です。
 * ページのDOM読み込み完了後に呼び出されます。
 */
function initializeApp() {
    console.log("アプリケーションを初期化します..."); // 開発用ログ

    // --- 初期画面表示 ---
    // 最初はジャンル選択画面を表示し、他は隠す
    showGenreSelectionScreen(); // uiController の関数を呼び出す

    // --- ジャンル選択肢の表示 ---
    renderGenreOptions(); // uiController の関数を呼び出す

    // --- イベントリスナーの設定 ---
    // 各要素に対するユーザー操作（クリック、変更など）があったときに、
    // どの処理を実行するかを関連付けます。

    // 1. ジャンル選択チェックボックスが変更されたとき
    if (genreOptionsDiv) {
        genreOptionsDiv.addEventListener('change', () => {
            // 現在選択されているジャンルを取得
            const selectedGenres = Array.from(genreOptionsDiv.querySelectorAll('input[name="genre"]:checked')).map(cb => cb.value);
            // UIコントローラーの関数を呼び出して、メッセージやスタートボタンの状態を更新
            handleGenreSelectionChange(selectedGenres);
        });
        // 初期状態のメッセージ表示のために一度呼び出す
        handleGenreSelectionChange([]);
    } else {
        console.error("ジャンル選択肢のコンテナが見つかりません。");
    }

    // 2. スタートボタンがクリックされたとき
    if (startButton) {
        startButton.addEventListener('click', () => {
            console.log("スタートボタンがクリックされました。"); // 開発用ログ
            // 現在選択されているジャンルを取得
            const selectedGenres = Array.from(genreOptionsDiv.querySelectorAll('input[name="genre"]:checked')).map(cb => cb.value);

            // 選択数が足りているか最終確認
            if (selectedGenres.length >= MIN_GENRES_TO_START) {
                // クイズロジックの startQuiz 関数を呼び出す
                const quizStarted = startQuiz(selectedGenres);
                if (quizStarted) {
                    // クイズが正常に開始されたら、UIコントローラーでクイズ画面を表示
                    showQuizScreen();
                } else {
                    // クイズ開始に失敗した場合 (例: 問題が生成できなかった)
                    // 必要であれば、ここでユーザーに通知するなどの処理を追加
                    console.warn("クイズの開始に失敗しました。");
                    // showGenreSelectionScreen(); // ジャンル選択画面に戻す (startQuiz内で既に行っている場合あり)
                }
            } else {
                // 選択数が足りない場合 (通常はボタンが無効化されているはずだが念のため)
                alert(`ジャンルを${MIN_GENRES_TO_START}つ以上選択してください。`);
            }
        });
    } else {
        console.error("スタートボタンが見つかりません。");
    }

    console.log("アプリケーションの初期化が完了しました。"); // 開発用ログ
}

// --- アプリケーションの実行開始 ---
// HTMLの読み込みと解析が完了した時点で initializeApp 関数を実行します。
// 'DOMContentLoaded' は、ブラウザがHTMLを読み終えたときに発生するイベントです。
document.addEventListener('DOMContentLoaded', initializeApp);
