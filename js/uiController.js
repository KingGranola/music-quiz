/**
 * uiController.js
 * 画面の表示を更新したり、ユーザーの操作に応じて画面を変更したりする関数をまとめたファイルです。
 * 例えば、問題文を表示したり、ボタンを作成したり、結果を表示したりします。
 */

// 必要な要素や設定、他のモジュールの関数を読み込みます
import {
    genreSelectionDiv, containerDiv, chartCanvas, resultDiv, startButton,
    genreOptionsDiv, messageP, questionP, genreP, progressContainer,
    progressBar, progressText, buttonsDiv
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
 * @param {HTMLElement} element - 表示したいHTML要素オブジェクト
 */
function showElement(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

/**
 * 指定されたIDを持つHTML要素を非表示にします。
 * (内部的に .hidden クラスを追加します)
 * @param {HTMLElement} element - 非表示にしたいHTML要素オブジェクト
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
    hideElement(chartCanvas);
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
    hideElement(chartCanvas); // チャートはまだ隠す
    hideElement(resultDiv);   // 結果もまだ隠す

    // クイズ画面内の要素を表示
    showElement(buttonsDiv);
    showElement(progressContainer);
    showElement(progressText);
    showElement(genreP);
    showElement(questionP);
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

    // 結果表示エリアとチャートを表示 (チャート描画は chartRenderer が行う)
    showElement(resultDiv);
    // chartCanvas の表示は renderRadarChart 関数内で行う
}


// --- ジャンル選択画面の制御 ---

/**
 * ジャンル選択肢をHTMLに生成して表示します。
 */
export function renderGenreOptions() {
    const genreList = getUsedGenres(); // 利用可能な全ジャンルを取得
    console.log('取得したジャンルリスト:', genreList); // 開発用ログ

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
} // renderGenreOptions 関数の終了

/**
 * ジャンル選択画面の説明文を表示/更新します。
 */
function renderExplanationText() {
    // genreSelectionDiv が存在するか確認
    if (!genreSelectionDiv || !genreOptionsDiv) {
        console.error("説明文を表示するための親要素が見つかりません。");
        return;
    }

    let explanation = genreSelectionDiv.querySelector('.explanation');
    if (!explanation) {
        explanation = document.createElement("div");
        explanation.className = 'explanation';
        // genreOptionsDiv の前に挿入 (親要素が存在する場合のみ)
        if (genreOptionsDiv.parentNode) {
            genreOptionsDiv.parentNode.insertBefore(explanation, genreOptionsDiv);
        } else {
            console.error("genreOptionsDiv の親要素が見つからず、説明文を挿入できません。");
            return; // 親要素がなければ処理中断
        }
    }
    // 説明文の内容を設定 (設定ファイルの値を使う)
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
    // messageP と startButton が存在するか確認
    if (!messageP || !startButton) {
        console.error("メッセージまたはスタートボタンの要素が見つかりません。");
        return;
    }

    const remaining = MIN_GENRES_TO_START - selectedGenres.length;

    if (remaining > 0) {
        // 選択数が足りない場合
        messageP.innerText = `あと ${remaining} 個選んでください`;
        showElement(messageP);
        hideElement(startButton);
        startButton.disabled = true;
    } else {
        // 選択数が足りている場合
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
    // domElements.js から要素を取得済みなので、ここで再度取得する必要はない
    if (!startButton || !messageP || !genreOptionsDiv) return; // 要素がなければ何もしない

    const selectedCheckboxes = genreOptionsDiv.querySelectorAll('input[name="genre"]:checked');
    const selectedCount = selectedCheckboxes.length;

    // handleGenreSelectionChange を呼び出して状態を更新
    handleGenreSelectionChange(Array.from(selectedCheckboxes).map(cb => cb.value));
}


// --- クイズ画面の制御 ---

/**
 * 現在の問題データに基づいて、問題文とジャンルを表示します。
 * @param {object} questionData - 表示する問題のデータ (questions 配列の要素)
 */
function displayQuestionText(questionData) {
    // questionP と genreP が存在するか確認
    if (!questionP || !genreP) {
        console.error("問題文またはジャンルを表示する要素が見つかりません。");
        return;
    }

    // 問題文 (アーティスト名) を表示
    questionP.innerText = `${questionData.artist_ja}（${questionData.artist_en}）をどれくらい知ってる？`;

    // アーティストのジャンルを表示 (重複を除外)
    const genres = new Set([questionData.genre1, questionData.genre2, questionData.genre3].filter(Boolean));
    genreP.innerText = `ジャンル：${Array.from(genres).join('、')}`;
}

/**
 * 回答ボタンをHTMLに生成して表示します。各ボタンにはクリック時の処理も設定します。
 */
function createAnswerButtons() {
    // buttonsDiv が存在するか確認
    if (!buttonsDiv) {
        console.error("回答ボタンを表示する要素 (buttonsDiv) が見つかりません。");
        return;
    }

    buttonsDiv.innerHTML = ''; // 既存のボタンをクリア

    // 設定ファイルからボタン情報を取得してループ
    ANSWER_BUTTON_LEVELS.forEach(item => {
        const button = document.createElement('button');
        button.classList.add(`btn-level-${item.level}`); // CSSクラスを設定 (色分け用)
        button.dataset.level = item.level; // data-level属性にレベルを保持
        button.textContent = item.text;    // ボタンのテキストを設定

        // ボタンがクリックされたときの処理を設定
        // quizLogic.js の processAnswer 関数を、対応するレベルを引数にして呼び出す
        button.addEventListener('click', () => processAnswer(item.level));

        buttonsDiv.appendChild(button); // HTMLに追加
    });
}

/**
 * プログレスバーの幅と色、進捗テキストを更新します。
 * @param {number} currentIndex - 現在の問題インデックス (0から始まる)
 * @param {number} totalQuestions - 総問題数
 */
export function updateProgressUI(currentIndex, totalQuestions) {
    // progressBar と progressText が存在するか確認
    if (!progressBar || !progressText) {
        console.error("プログレスバーまたは進捗テキストの要素が見つかりません。");
        return;
    }

    // --- プログレスバーの幅を計算 ---
    // (現在の問題数 + 1) / 総問題数 で進捗率を計算 (0除算を避ける)
    const percent = totalQuestions > 0 ? Math.floor(((currentIndex + 1) / totalQuestions) * 100) : 0;
    progressBar.style.width = `${percent}%`; // CSSのwidthプロパティを更新

    // --- プログレスバーの色を更新 ---
    const progressRatio = totalQuestions > 0 ? (currentIndex + 1) / totalQuestions : 0;
    progressBar.className = 'progress-bar'; // まず基本クラスだけにする
    // 設定ファイルの閾値に基づいてクラスを追加
    if (progressRatio < PROGRESS_BAR_THRESHOLDS.GOOD_UNTIL) {
        progressBar.classList.add('good');
    } else if (progressRatio < PROGRESS_BAR_THRESHOLDS.NORMAL_UNTIL) {
        progressBar.classList.add('normal');
    } else {
        progressBar.classList.add('bad');
    }

    // --- 進捗テキストを更新 ---
    let progressMessage = `${currentIndex + 1} / ${totalQuestions}問`; // 基本のテキスト
    // 特定のタイミングで追加メッセージを設定
    const msgConfig = PROGRESS_TEXT_MESSAGES;
    // totalQuestions が 0 の場合や currentIndex が不正な場合のチェックを追加
    if (totalQuestions > 0) {
        if (currentIndex === msgConfig.START) {
            progressMessage += "　診断開始！";
        } else if (totalQuestions > 1 && Math.abs(progressRatio - msgConfig.HALF) < (1 / totalQuestions)) {
            progressMessage += "　あと半分！";
        } else if (totalQuestions > 1 && progressRatio > msgConfig.ALMOST_DONE_START && progressRatio <= msgConfig.ALMOST_DONE_END) {
             progressMessage += "　あと少し！";
        } else if (currentIndex === totalQuestions - msgConfig.LAST_ONE_OFFSET) { // 最後の問題のインデックスは totalQuestions - 1
            progressMessage += "　最後の1問！";
        }
    }
    progressText.innerText = progressMessage; // テキストを表示
}

/**
 * クイズ画面に現在の問題を表示するメインの関数。
 * 問題文、ジャンル、回答ボタン、プログレスバーを更新します。
 * @param {object} questionData - 表示する問題のデータ
 * @param {number} currentIndex - 現在の問題インデックス
 * @param {number} totalQuestions - 総問題数
 */
export function displayQuestionUI(questionData, currentIndex, totalQuestions) {
    displayQuestionText(questionData); // 問題文とジャンルを表示
    createAnswerButtons();          // 回答ボタンを生成
    updateProgressUI(currentIndex, totalQuestions); // プログレスバーを更新
}


// --- 結果表示画面の制御 ---

/**
 * 計算された診断結果データをもとに、結果画面のHTMLを生成して表示します。
 * チャートの描画も行います。
 * @param {object | null} resultData - 診断結果のデータオブジェクト、またはデータがない場合は null
 *                                     (quizLogic.js の generateResultData の戻り値)
 */
export function displayResultUI(resultData) {
    // resultDiv が存在するか確認
    if (!resultDiv) {
        console.error("結果を表示する要素 (resultDiv) が見つかりません。");
        return;
    }

    // 結果データがない場合 (有効な回答がなかったなど)
    if (!resultData || !resultData.labels || resultData.labels.length === 0) {
        resultDiv.innerHTML = `<h2>診断結果</h2><p>有効な回答がありませんでした。診断をやり直してください。</p><button id="reload-button">もう一度診断する</button>`;
        showResultScreenElements(); // 結果表示エリアを表示
        hideElement(chartCanvas);   // チャートは非表示
        setupReloadButton();      // リロードボタンの設定
        console.warn("有効な結果データがないため、結果表示を中断しました。");
        return;
    }

    // --- 結果データの展開 ---
    const { labels, data, topGenre, weakGenre, recommended, scores } = resultData;

    // --- チャート描画 ---
    // chartRenderer.js の関数を呼び出してレーダーチャートを描画
    renderRadarChart(labels, data); // この関数内で chartCanvas が表示される

    // --- 結果テキストとテーブルのHTMLを生成 ---
    const tableRowsHtml = labels.map((genre, index) => {
        // scores[genre] が存在するか確認
        const scoreInfo = scores[genre];
        const count = scoreInfo?.count || 0;
        const percentage = data[index] ?? 0; // data[index] が undefined の場合は 0 を使う
        return `
            <tr>
                <td>${genre}</td>
                <td>${count}問</td>
                <td>${percentage}%</td>
                <td>${getEvaluation(percentage)}</td>
                <td>${getOverallEvaluation(percentage)}</td>
            </tr>
        `;
    }).join(''); // 各行のHTMLを結合

    const recommendedListHtml = recommended && recommended.length > 0 ? `
        <h3>おすすめアーティスト</h3>
        <p>あなたの知識をさらに広げるために、以下のアーティストをおすすめします：</p>
        <ul>
            ${recommended.map(artist => `
                <li>${artist.artist_ja}（${artist.artist_en}） - 主なジャンル: ${artist.genre1 || 'N/A'}</li>
            `).join('')}
        </ul>
    ` : ''; // おすすめがなければ何も表示しない

    // --- 結果表示エリアにHTMLを設定 ---
    resultDiv.innerHTML = `
        <h2>診断完了！</h2>
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
    showResultScreenElements(); // 結果表示に必要な要素を表示し、不要なものを隠す

    // --- 「もう一度診断する」ボタンの設定 ---
    setupReloadButton();
}

/**
 * 結果表示画面にある「もう一度診断する」ボタンに、
 * クリックしたらページをリロードする機能を追加します。
 */
function setupReloadButton() {
    const reloadButton = document.getElementById('reload-button');
    if (reloadButton) {
        // 既存のリスナーがあれば削除（念のため）
        reloadButton.replaceWith(reloadButton.cloneNode(true));
        const newReloadButton = document.getElementById('reload-button');
        // ボタンがクリックされたら、location.reload() を実行してページを再読み込み
        if (newReloadButton) {
            newReloadButton.addEventListener('click', () => location.reload());
        }
    } else {
        console.warn("リロードボタンが見つかりませんでした。");
    }
}
