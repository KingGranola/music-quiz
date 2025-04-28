/**
 * uiController.js
 * 画面の表示を更新したり、ユーザーの操作に応じて画面を変更したりする関数をまとめたファイルです。
 */

// 必要な要素や設定、他のモジュールの関数を読み込みます
import {
    genreSelectionDiv, containerDiv, /* chartCanvas, */ resultDiv, startButton, // chartCanvas は直接使わなくなる
    genreOptionsDiv, messageP, questionP, genreP, progressContainer,
    progressBar, progressText, buttonsDiv, feedbackMessageP
} from './domElements.js'; // 画面要素
import {
    MIN_GENRES_TO_START, PRIORITY_GENRES, ANSWER_BUTTON_LEVELS,
    PROGRESS_BAR_THRESHOLDS, PROGRESS_TEXT_MESSAGES, QUESTIONS_FOR_3_GENRES,
    QUESTIONS_PER_GENRE, MAX_QUESTIONS
} from './config.js'; // 設定値
import { getUsedGenres } from './genreUtils.js'; // ジャンル取得関数
import { processAnswer } from './quizLogic.js'; // 回答処理関数 (ボタンクリック時に呼び出す)
import { renderRadarChart } from './chartRenderer.js'; // チャート描画関数
import { getEvaluation, getOverallEvaluation } from './quizLogic.js'; // 評価メッセージ取得関数

// --- 画面表示の切り替え ---

/**
 * 指定されたIDを持つHTML要素を表示します。
 * (内部的に .hidden クラスを削除します)
 * @param {HTMLElement | null} element - 表示したいHTML要素オブジェクト (null の場合あり)
 */
function showElement(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

/**
 * 指定されたIDを持つHTML要素を非表示にします。
 * (内部的に .hidden クラスを追加します)
 * @param {HTMLElement | null} element - 非表示にしたいHTML要素オブジェクト (null の場合あり)
 */
function hideElement(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

/**
 * ジャンル選択画面を表示し、他の画面を非表示にします。
 * スタートボタンの状態も更新します。
 */
export function showGenreSelectionScreen() {
    showElement(genreSelectionDiv);
    hideElement(containerDiv);
    // hideElement(chartCanvas); // domElements から削除したので不要
    const initialChartCanvas = document.getElementById('chart'); // 初期HTMLのCanvasを隠す
    if (initialChartCanvas) hideElement(initialChartCanvas);
    hideElement(resultDiv);
    updateStartButtonState(); // スタートボタンの状態を更新
}

/**
 * クイズ画面を表示し、他の画面を非表示にします。
 * クイズ画面内の関連要素も表示状態にします。
 */
export function showQuizScreen() {
    hideElement(genreSelectionDiv);
    showElement(containerDiv);
    const initialChartCanvas = document.getElementById('chart'); // 初期HTMLのCanvasを隠す
    if (initialChartCanvas) hideElement(initialChartCanvas);
    hideElement(resultDiv);   // 結果もまだ隠す

    // クイズ画面内の要素を表示 (初回表示時)
    // 個別の表示は displayQuestionUI で行う
}

/**
 * 結果表示画面を表示し、クイズ中の要素の一部を非表示にします。
 */
function showResultScreenElements() {
    // クイズ中の不要な要素を隠す
    hideElement(buttonsDiv);
    hideElement(progressContainer);
    hideElement(progressText);
    hideElement(genreP);
    hideElement(questionP);
    hideElement(feedbackMessageP);

    // ★★★ クイズ画面コンテナ自体も隠す ★★★
    hideElement(containerDiv);

    // 結果表示エリアを表示
    showElement(resultDiv);
    // chartCanvas の表示は renderRadarChart 関数内で行う
}


// --- ジャンル選択画面の制御 ---

/**
 * ジャンル選択肢をHTMLに生成して表示します。
 */
export function renderGenreOptions() {
    const genreList = getUsedGenres(); // 利用可能な全ジャンルを取得
    // console.log('取得したジャンルリスト:', genreList); // 開発用ログ

    // 優先ジャンルとそれ以外に分ける
    const sortedGenres = [
      ...PRIORITY_GENRES.filter(genre => genreList.includes(genre)),
      ...genreList.filter(genre => !PRIORITY_GENRES.includes(genre))
    ];

    // genreOptionsDiv が存在するか確認
    if (!genreOptionsDiv) {
        console.error("ジャンル選択肢を表示する要素 (genreOptionsDiv) が見つかりません。");
        return;
    }

    genreOptionsDiv.innerHTML = ''; // 既存の選択肢をクリア

    // 各ジャンルについてチェックボックスとラベルを作成
    sortedGenres.forEach(genre => {
      const label = document.createElement("label");
      label.classList.add('genre-label');

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "genre";
      checkbox.value = genre;
      checkbox.classList.add('genre-checkbox');

      label.appendChild(checkbox);
      label.append(` ${genre}`); // チェックボックスの後ろにジャンル名を追加
      genreOptionsDiv.appendChild(label); // HTMLに追加
    });

    // 説明文を表示 (既にあれば更新、なければ作成)
    renderExplanationText();
}

/**
 * ジャンル選択画面の説明文を表示/更新します。
 */
function renderExplanationText() {
    if (!genreSelectionDiv || !genreOptionsDiv) {
        console.error("説明文を表示するための親要素が見つかりません。");
        return;
    }

    let explanation = genreSelectionDiv.querySelector('.explanation');
    if (!explanation) {
        explanation = document.createElement("div");
        explanation.className = 'explanation';
        if (genreOptionsDiv.parentNode) {
            genreOptionsDiv.parentNode.insertBefore(explanation, genreOptionsDiv);
        } else {
            console.error("genreOptionsDiv の親要素が見つからず、説明文を挿入できません。");
            return;
        }
    }
    explanation.innerHTML = `
      <p>・${MIN_GENRES_TO_START}ジャンル以上を選択してください</p>
      <p>・${MIN_GENRES_TO_START}ジャンル選択の場合：${QUESTIONS_FOR_3_GENRES}問</p>
      <p>・${MIN_GENRES_TO_START + 1}ジャンル以上選択の場合：選択したジャンル数 × ${QUESTIONS_PER_GENRE}問（最大${MAX_QUESTIONS}問）</p>
    `;
}

/**
 * ジャンル選択のチェック状態が変わったときに呼び出され、
 * メッセージとスタートボタンの表示/非表示、有効/無効を切り替えます。
 * @param {string[]} selectedGenres - 現在選択されているジャンルの配列
 */
export function handleGenreSelectionChange(selectedGenres) {
    if (!messageP || !startButton) {
        console.error("メッセージまたはスタートボタンの要素が見つかりません。");
        return;
    }

    const remaining = MIN_GENRES_TO_START - selectedGenres.length;

    if (remaining > 0) {
        messageP.innerText = `あと ${remaining} 個選んでください`;
        showElement(messageP);
        hideElement(startButton);
        startButton.disabled = true;
    } else {
        messageP.innerText = "";
        hideElement(messageP);
        showElement(startButton);
        startButton.disabled = false;
    }
}

/**
 * スタートボタンの表示/非表示と有効/無効状態を、現在のジャンル選択数に基づいて更新します。
 */
function updateStartButtonState() {
    if (!startButton || !messageP || !genreOptionsDiv) return;

    const selectedCheckboxes = genreOptionsDiv.querySelectorAll('input[name="genre"]:checked');
    handleGenreSelectionChange(Array.from(selectedCheckboxes).map(cb => cb.value));
}


// --- クイズ画面の制御 ---

/**
 * 現在の問題データに基づいて、問題文とジャンルを表示します。
 * @param {object} questionData - 表示する問題のデータ (questions 配列の要素)
 */
function displayQuestionText(questionData) {
    if (!questionP || !genreP) {
        console.error("問題文またはジャンルを表示する要素が見つかりません。");
        return;
    }
    questionP.innerText = `${questionData.artist_ja}（${questionData.artist_en}）をどれくらい知ってる？`;
    const genres = new Set([questionData.genre1, questionData.genre2, questionData.genre3].filter(Boolean));
    genreP.innerText = `ジャンル：${Array.from(genres).join('、')}`;
}

/**
 * 一時的なフィードバックメッセージを表示します。
 * @param {string} message 表示するメッセージ
 * @param {number} duration 表示時間 (ミリ秒)
 */
function showTemporaryFeedback(message, duration = 1000) {
    if (feedbackMessageP) {
        feedbackMessageP.innerText = message;
        showElement(feedbackMessageP); // 表示
        setTimeout(() => {
            hideElement(feedbackMessageP);
        }, duration);
    }
}

/**
 * 回答ボタンをHTMLに生成して表示します。各ボタンにはクリック時の処理も設定します。
 * クリック時にフィードバック表示も行います。
 */
function createAnswerButtons() {
    if (!buttonsDiv) {
        console.error("回答ボタンを表示する要素 (buttonsDiv) が見つかりません。");
        return;
    }
    buttonsDiv.innerHTML = ''; // 既存のボタンをクリア

    ANSWER_BUTTON_LEVELS.forEach(item => {
        const button = document.createElement('button');
        // CSSクラスを設定 (style.css の定義に合わせる)
        button.classList.add(`btn-level-${item.level}`);
        button.dataset.level = item.level; // data-level属性にレベルを保持
        button.textContent = item.text;    // ボタンのテキストを設定

        button.addEventListener('click', () => {
            // フィードバックメッセージ表示
            const feedbackMessages = ["記録しました！", "なるほど！", "次へ！", "OK！"];
            const randomFeedback = feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)];
            showTemporaryFeedback(randomFeedback, 800); // 0.8秒表示

            // 回答処理を実行 (少し遅延)
            setTimeout(() => {
                processAnswer(item.level);
            }, 100);
        });

        buttonsDiv.appendChild(button); // HTMLに追加
    });
}

/**
 * プログレスバーの幅と色、進捗テキストを更新します。
 * @param {number} currentIndex - 現在の問題インデックス (0から始まる)
 * @param {number} totalQuestions - 総問題数
 */
export function updateProgressUI(currentIndex, totalQuestions) {
    if (!progressBar || !progressText) {
        console.error("プログレスバーまたは進捗テキストの要素が見つかりません。");
        return;
    }

    const percent = totalQuestions > 0 ? Math.floor(((currentIndex + 1) / totalQuestions) * 100) : 0;
    progressBar.style.width = `${percent}%`;

    const progressRatio = totalQuestions > 0 ? (currentIndex + 1) / totalQuestions : 0;
    progressBar.className = 'progress-bar'; // 基本クラス
    if (progressRatio < PROGRESS_BAR_THRESHOLDS.GOOD_UNTIL) {
        progressBar.classList.add('good');
    } else if (progressRatio < PROGRESS_BAR_THRESHOLDS.NORMAL_UNTIL) {
        progressBar.classList.add('normal');
    } else {
        progressBar.classList.add('bad');
    }

    let progressMessage = `${currentIndex + 1} / ${totalQuestions}問`;
    const msgConfig = PROGRESS_TEXT_MESSAGES;
    if (totalQuestions > 0) {
        if (currentIndex === msgConfig.START) progressMessage += "　診断開始！";
        else if (totalQuestions > 1 && Math.abs(progressRatio - msgConfig.HALF) < (1 / totalQuestions)) progressMessage += "　あと半分！";
        else if (totalQuestions > 1 && progressRatio > msgConfig.ALMOST_DONE_START && progressRatio <= msgConfig.ALMOST_DONE_END) progressMessage += "　あと少し！";
        else if (currentIndex === totalQuestions - msgConfig.LAST_ONE_OFFSET) progressMessage += "　最後の1問！";
    }
    progressText.innerText = progressMessage;
}

/**
 * クイズ画面に現在の問題を表示するメインの関数。
 * フェード効果を削除し、即時表示するように変更。
 * @param {object} questionData - 表示する問題のデータ
 * @param {number} currentIndex - 現在の問題インデックス
 * @param {number} totalQuestions - 総問題数
 */
export function displayQuestionUI(questionData, currentIndex, totalQuestions) {
    // --- フェード関連の処理を削除 ---

    // --- 内容の更新 ---
    displayQuestionText(questionData); // 問題文とジャンルを表示
    createAnswerButtons();          // 回答ボタンを生成
    updateProgressUI(currentIndex, totalQuestions); // プログレスバーを更新

    // --- 要素の表示 (hidden クラスを削除) ---
    // 以前フェードさせていた要素を表示状態にする
    const elementsToShow = [questionP, genreP, buttonsDiv, progressContainer, progressText];
    elementsToShow.forEach(el => showElement(el)); // showElement は hidden クラスを削除する関数
}


// --- 結果表示画面の制御 ---

/**
 * 計算された診断結果データをもとに、結果画面のHTMLを生成して表示します。
 * チャートの描画も行います。
 * @param {object | null} resultData - 診断結果のデータオブジェクト、またはデータがない場合は null
 */
export function displayResultUI(resultData) {
    // --- デバッグログ追加 ---
    console.log('[uiController] displayResultUI 関数が呼び出されました。');
    console.log('[uiController] 受け取った resultData:', resultData);

    if (!resultDiv) {
        console.error("[uiController] ERROR: 結果を表示する要素 (resultDiv) が見つかりません。");
        return;
    }

    // resultData が null または labels が空の場合の処理
    if (!resultData || !resultData.labels || resultData.labels.length === 0) {
        console.warn("[uiController] WARN: 有効な結果データ (resultData または resultData.labels) がないため、チャート描画をスキップし、メッセージを表示します。");
        resultDiv.innerHTML = `<h2>診断結果</h2><p>有効な回答がありませんでした。診断をやり直してください。</p><button id="reload-button">もう一度診断する</button>`;
        showResultScreenElements(); // containerDiv も隠される
        // hideElement(chartCanvas); // domElements から削除したので不要
        setupReloadButton();
        return; // 処理中断
    }

    // resultData から必要な情報を展開
    const { labels, data, topGenre, weakGenre, recommended, scores } = resultData;

    // --- 結果テキストとテーブルのHTMLを生成 (Canvas要素も含むように修正) ---
    const tableRowsHtml = labels.map((genre, index) => {
        const scoreInfo = scores[genre];
        const count = scoreInfo?.count || 0;
        // data[index] が undefined や null の可能性を考慮
        const percentage = (data && typeof data[index] === 'number') ? data[index] : 0;
        return `
            <tr>
                <td>${genre}</td>
                <td>${count}問</td>
                <td>${percentage}%</td>
                <td>${getEvaluation(percentage)}</td>
                <td>${getOverallEvaluation(percentage)}</td>
            </tr>
        `;
    }).join('');

    const recommendedListHtml = recommended && recommended.length > 0 ? `
        <h3>おすすめアーティスト</h3>
        <p>あなたの知識をさらに広げるために、以下のアーティストをおすすめします：</p>
        <ul>
            ${recommended.map(artist => `
                <li>${artist.artist_ja}（${artist.artist_en}） - 主なジャンル: ${artist.genre1 || 'N/A'}</li>
            `).join('')}
        </ul>
    ` : '';

    // --- 結果表示エリアにHTMLを設定 (Canvas要素を追加) ---
    resultDiv.innerHTML = `
        <h2>診断完了！</h2>
        <canvas id="chart"></canvas>  <!-- ★★★ ここに Canvas 要素を追加 ★★★ -->
        ${topGenre && weakGenre ? `<p><strong>あなたは「${topGenre}」に詳しく、「${weakGenre}」はこれから伸ばせるジャンルです！</strong></p>` : '<p>診断結果が出ました！</p>'}
        <h3>ジャンル別の診断内訳</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ジャンル</th>
                        <th>問題数</th>
                        <th>知識レベル</th>
                        <th>評価</th>
                        <th>総評</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>
        </div>
        ${recommendedListHtml}
        <br>
        <button id="reload-button">もう一度診断する</button>
    `;

    // --- 画面要素の表示/非表示 ---
    showResultScreenElements(); // containerDiv も隠される

    // ★★★ innerHTML で書き換えた後、Canvas 要素を再取得 ★★★
    const newChartCanvas = document.getElementById('chart');
    if (!newChartCanvas) {
        console.error("[uiController] ERROR: innerHTML 書き換え後に Canvas 要素 (#chart) が見つかりません。HTML生成コードを確認してください。");
        // Canvas がなければチャート描画はできないので、ボタン設定に進む
        setupReloadButton();
        return;
    }

    // --- チャート描画呼び出し前のログ ---
    console.log('[uiController] renderRadarChart を呼び出します。');
    console.log('[uiController] labels:', labels);
    console.log('[uiController] data:', data);

    // --- チャート描画 ---
    try {
        // ★★★ 再取得した Canvas 要素を第一引数として渡す ★★★
        renderRadarChart(newChartCanvas, labels, data);

    } catch (error) {
        console.error("[uiController] ERROR: renderRadarChart の呼び出し中にエラーが発生しました:", error);
        // エラーが発生しても他の結果は表示し、ボタンは設定する
        if (newChartCanvas) hideElement(newChartCanvas); // エラー時はCanvasを隠す
    }

    // --- 「もう一度診断する」ボタンの設定 ---
    setupReloadButton();
    console.log('[uiController] 結果表示が完了しました。');
}

/**
 * 結果表示画面にある「もう一度診断する」ボタンに、
 * クリックしたらページをリロードする機能を追加します。
 */
function setupReloadButton() {
    const reloadButton = document.getElementById('reload-button');
    if (reloadButton) {
        // イベントリスナーの重複を防ぐため、一度クローンして置き換える
        reloadButton.replaceWith(reloadButton.cloneNode(true));
        const newReloadButton = document.getElementById('reload-button');
        if (newReloadButton) {
            newReloadButton.addEventListener('click', () => location.reload());
        }
    } else {
        console.warn("[uiController] リロードボタンが見つかりませんでした。");
    }
}
