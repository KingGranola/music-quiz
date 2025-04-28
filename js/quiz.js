let currentQuestionIndex = 0; // 現在の問題インデックス
let totalQuestions = 0;       // 総問題数
let genreScores = {};         // ジャンルごとのスコア { genre: { score: number, max: number, count: number } }
const questions = [];         // 出題リスト
const QUESTIONS_PER_GENRE = 5;  // 1ジャンルあたりの基本問題数
const MAX_QUESTIONS = 50;       // 最大問題数

// --- DOM要素のキャッシュ用変数 ---
let genreSelectionDiv, containerDiv, chartCanvas, resultDiv, startButton, genreOptionsDiv, messageP;
let questionP, genreP, progressBar, progressText, buttonsDiv;

// --- ジャンル関連の計算 ---

/**
 * artistData から使用されているジャンル名のリストを取得
 * @returns {string[]} ジャンル名の配列
 */
function getUsedGenres() {
  const genreSet = new Set();
  artistData.forEach(artist => {
    if (artist.genre1) genreSet.add(artist.genre1);
    if (artist.genre2) genreSet.add(artist.genre2);
    if (artist.genre3) genreSet.add(artist.genre3);
  });
  // 空文字を除外して返す
  return Array.from(genreSet).filter(genre => genre && genre.trim() !== '');
}

/**
 * ジャンル間の関連スコアを計算するための初期化
 * @returns {object} ジャンル間の関連スコアオブジェクト { genre1: { genre2: score, ... }, ... }
 */
function initializeGenreRelations() {
  const usedGenres = getUsedGenres();
  const relations = {};
  usedGenres.forEach(genre => {
    relations[genre] = {};
    const otherGenres = usedGenres.filter(g => g !== genre);
    otherGenres.forEach(otherGenre => {
      const score = calculateRelationScore(genre, otherGenre);
      if (score > 0) {
        relations[genre][otherGenre] = score;
      }
    });
    // 各ジャンルに対して関連スコアが高い上位4つを保持
    const sortedRelations = Object.entries(relations[genre])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    relations[genre] = Object.fromEntries(sortedRelations);
  });
  return relations;
}

/**
 * 2つのジャンル間の関連スコアを計算
 * @param {string} genre1 ジャンル1
 * @param {string} genre2 ジャンル2
 * @returns {number} 関連スコア (0 ~ 1程度)
 */
function calculateRelationScore(genre1, genre2) {
  let score = 0;
  let count = 0;
  artistData.forEach(artist => {
    const genres = [artist.genre1, artist.genre2, artist.genre3].filter(Boolean); // アーティストが持つジャンルリスト
    // 両方のジャンルを持っているアーティストをカウント
    if (genres.includes(genre1) && genres.includes(genre2)) {
      count++;
      // ジャンルの組み合わせに応じてスコアを加算 (重み付け)
      if (artist.genre1 === genre1 && artist.genre2 === genre2 || artist.genre1 === genre2 && artist.genre2 === genre1) {
        score += 0.8; // genre1, genre2 が主要なジャンルの場合
      } else if (artist.genre1 === genre1 || artist.genre1 === genre2) {
        score += 0.6; // どちらか一方が主要ジャンルの場合
      } else {
        score += 0.4; // 両方ともサブジャンルの場合
      }
    }
  });
  // 平均スコアに基づいて最終スコアを計算 (0.5をベースに関連度で調整)
  return count > 0 ? 0.5 + (score / count) * 0.3 : 0;
}

// ジャンル関連スコアを計算して保持
const genreRelations = initializeGenreRelations();

/**
 * アーティストと選択されたジャンルに基づいてスコア計算用の係数を算出
 * @param {object} artist アーティストデータ
 * @param {string[]} selectedGenres 選択されたジャンルの配列
 * @returns {number} スコア係数
 */
function calculateGenreScore(artist, selectedGenres) {
  let score = 0;
  const mainGenre = artist.genre1;
  const subGenres = [artist.genre2, artist.genre3].filter(Boolean);

  // 1. アーティストのメインジャンルが選択されているか
  if (mainGenre && selectedGenres.includes(mainGenre)) {
    score += 2.0; // 高い係数
  }

  // 2. アーティストのサブジャンルが選択されているか
  subGenres.forEach(subGenre => {
    if (selectedGenres.includes(subGenre)) {
      score += 0.5; // やや低い係数
    }
  });

  // 3. ジャンル間の関連性を考慮
  selectedGenres.forEach(selectedGenre => {
    // メインジャンルとの関連
    if (mainGenre && genreRelations[mainGenre]?.[selectedGenre]) {
      score += genreRelations[mainGenre][selectedGenre] * 0.4;
    }
    // サブジャンルとの関連
    subGenres.forEach(subGenre => {
      if (genreRelations[subGenre]?.[selectedGenre]) {
        score += genreRelations[subGenre][selectedGenre] * 0.2;
      }
    });
  });
  // スコアが0の場合、最低限の係数を与える (全く関連がない場合でも問題に出る可能性を残すため)
  return score > 0 ? score : 0.1;
}

// --- ジャンル選択画面 ---

/**
 * チェックされているジャンルを取得
 * @returns {string[]} 選択されたジャンル名の配列
 */
function getSelectedGenres() {
  const optionsContainer = genreOptionsDiv || document.getElementById("genre-options"); // フォールバック
  if (!optionsContainer) return [];
  return [...optionsContainer.querySelectorAll('input[name="genre"]:checked')].map(cb => cb.value);
}

/**
 * ジャンル選択肢の表示とイベント設定
 */
function setupGenreSelection() {
  const genreList = getUsedGenres();
  // 優先表示するジャンル
  const priorityGenres = ['ポップス', 'ロック', 'HIPHOP', 'R&B', 'J-POP', 'ジャズ', 'クラシック'];
  // 優先ジャンルを先に、残りをその後ろにソート
  const sortedGenres = [
    ...priorityGenres.filter(genre => genreList.includes(genre)),
    ...genreList.filter(genre => !priorityGenres.includes(genre))
  ];

  genreOptionsDiv.innerHTML = ''; // 既存の選択肢をクリア

  // チェックボックスを生成して表示
  sortedGenres.forEach(genre => {
    const label = document.createElement("label");
    label.classList.add('genre-label'); // スタイル付け用クラス

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "genre";
    checkbox.value = genre;
    checkbox.classList.add('genre-checkbox'); // スタイル付け用クラス

    label.appendChild(checkbox);
    label.append(` ${genre}`); // チェックボックスの後ろにジャンル名
    genreOptionsDiv.appendChild(label);
  });

  // 説明文 (既存のがあれば更新、なければ作成)
  let explanation = genreSelectionDiv.querySelector('.explanation');
  if (!explanation) {
    explanation = document.createElement("div");
    explanation.className = 'explanation';
    explanation.innerHTML = `
      <p>・3ジャンル以上を選択してください</p>
      <p>・3ジャンル選択の場合：15問</p>
      <p>・4ジャンル以上選択の場合：選択したジャンル数 × ${QUESTIONS_PER_GENRE}問（最大${MAX_QUESTIONS}問）</p>
    `;
    genreOptionsDiv.parentNode.insertBefore(explanation, genreOptionsDiv);
  }

  // ジャンル選択時のイベントリスナー
  genreOptionsDiv.addEventListener("change", () => {
    const selected = getSelectedGenres();
    const remaining = 3 - selected.length;

    if (remaining > 0) {
      messageP.innerText = `あと ${remaining} 個選んでください`;
      messageP.classList.remove('hidden');
      startButton.classList.add('hidden');
      startButton.disabled = true;
    } else {
      messageP.innerText = "";
      messageP.classList.add('hidden');
      startButton.classList.remove('hidden');
      startButton.disabled = false;
    }
  });
}

// --- クイズ実行 ---

/**
 * クイズを開始する関数
 */
function startQuiz() {
  const selectedGenres = getSelectedGenres();
  if (selectedGenres.length < 3) return; // 3ジャンル未満なら開始しない

  // --- クイズ状態のリセット ---
  currentQuestionIndex = 0;
  genreScores = {}; // ジャンルスコアを初期化
  selectedGenres.forEach(genre => {
      genreScores[genre] = { score: 0, max: 0, count: 0 }; // 各選択ジャンルのスコアオブジェクトを作成
  });
  questions.length = 0; // 問題リストを空にする

  // --- 問題数の決定 ---
  if (selectedGenres.length === 3) {
    totalQuestions = 15;
  } else {
    totalQuestions = Math.min(selectedGenres.length * QUESTIONS_PER_GENRE, MAX_QUESTIONS);
  }

  // --- 問題リストの生成 ---
  const questionsPerGenre = Math.floor(totalQuestions / selectedGenres.length); // 1ジャンルあたりの問題数
  const remainingQuestions = totalQuestions % selectedGenres.length; // 余りの問題数

  // 選択されたジャンルに該当するアーティストをフィルタリング
  const filteredArtists = artistData.filter(artist =>
    selectedGenres.some(genre => [artist.genre1, artist.genre2, artist.genre3].includes(genre))
  );

  // ジャンルごとにアーティストを分類
  const artistsByGenre = {};
  selectedGenres.forEach(genre => {
    artistsByGenre[genre] = filteredArtists.filter(artist =>
      [artist.genre1, artist.genre2, artist.genre3].includes(genre)
    );
  });

  const usedArtistIds = new Set(); // 出題済みアーティストIDを管理

  // 各ジャンルから問題を選出
  selectedGenres.forEach((genre, index) => {
    const pool = artistsByGenre[genre] || []; // このジャンルのアーティスト候補
    // 候補から、未出題でスコア係数が計算できるアーティストを重み付きで抽出
    const weightedPool = pool
      .filter(artist => !usedArtistIds.has(artist.artist_id))
      .map(artist => ({
        artist,
        weight: calculateGenreScore(artist, selectedGenres) // スコア係数を重みとする
      }))
      .filter(item => item.weight > 0); // 重みが0のものは除外

    const selectedForThisGenre = []; // このジャンルで選ばれた問題
    // このジャンルで追加する問題数を計算
    const questionsForThisGenre = questionsPerGenre + (index < remainingQuestions ? 1 : 0);

    // 重み付きランダム選択
    let attempts = 0; // 無限ループ防止用カウンター
    const maxAttempts = pool.length * 2; // 最大試行回数

    while (selectedForThisGenre.length < questionsForThisGenre && weightedPool.length > 0 && attempts < maxAttempts) {
      const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
      if (totalWeight <= 0) break; // 重み合計が0以下なら終了

      let random = Math.random() * totalWeight;
      let chosenIndex = -1;

      // 重みに基づいてインデックスを選択
      for(let i = 0; i < weightedPool.length; i++) {
          random -= weightedPool[i].weight;
          if (random <= 0) {
              chosenIndex = i;
              break;
          }
      }

      if (chosenIndex === -1 || !weightedPool[chosenIndex]) {
          attempts++; // 選択できなかった場合
          continue;
      }

      const selectedArtist = weightedPool[chosenIndex].artist;
      // 問題オブジェクトを作成して追加
      selectedForThisGenre.push({
        ...selectedArtist, // アーティスト情報をコピー
        currentGenre: genre, // この問題がどのジャンルの枠で選ばれたかを示す
        isAlbumCover: false // 現状アルバムカバー問題は未実装
      });
      usedArtistIds.add(selectedArtist.artist_id); // 出題済みにする
      weightedPool.splice(chosenIndex, 1); // プールから削除
      attempts = 0; // 成功したらリセット
    }
    questions.push(...selectedForThisGenre); // 全体の問題リストに追加
  });

  // --- 問題リスト生成後の調整 ---
  // 最終的な問題数が予定と異なる場合があるため、実際の数に合わせる
  totalQuestions = questions.length;

  // 問題数が0の場合はエラー表示して戻る
  if (totalQuestions === 0) {
      alert("問題を作成できませんでした。選択したジャンルに該当するアーティストが少ないか、条件に合うアーティストが見つかりませんでした。");
      showGenreSelectionScreen(); // ジャンル選択画面に戻す
      return;
  }

  // 問題リストをシャッフル
  questions.sort(() => 0.5 - Math.random());

  // --- 画面表示の切り替え ---
  genreSelectionDiv.classList.add('hidden');
  containerDiv.classList.remove('hidden');
  chartCanvas.classList.add('hidden'); // チャートは結果表示まで隠す
  resultDiv.classList.add('hidden');   // 結果表示も隠す
  // クイズ画面内の要素を表示状態に戻す
  buttonsDiv.classList.remove('hidden');
  progressBar.parentNode.classList.remove('hidden'); // progress-container
  progressText.classList.remove('hidden');
  genreP.classList.remove('hidden');
  questionP.classList.remove('hidden');

  // 最初の問題を表示
  showQuestion();
}

/**
 * プログレスバーと進捗テキストを更新
 */
function updateProgress() {
    // 進捗率を計算 (0除算防止)
    const percent = totalQuestions > 0 ? Math.floor(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0;
    progressBar.style.width = `${percent}%`;

    // プログレスバーの色を割合に応じて変更
    const progressRatio = totalQuestions > 0 ? (currentQuestionIndex + 1) / totalQuestions : 0;
    progressBar.className = 'progress-bar'; // 基本クラスをリセット
    if (progressRatio < 0.5) {
        progressBar.classList.add('good');  // 前半 (緑)
    } else if (progressRatio < 0.9) {
        progressBar.classList.add('normal'); // 中盤 (黄)
    } else {
        progressBar.classList.add('bad');   // 終盤 (赤)
    }

    // 進捗メッセージを生成
    let progressMessage = `${currentQuestionIndex + 1} / ${totalQuestions}問`;
    // 特定のタイミングでメッセージを追加 (割合で判断)
    if (currentQuestionIndex === 0) {
        progressMessage += "　診断開始！";
    } else if (totalQuestions > 1 && Math.abs(progressRatio - 0.5) < (1 / totalQuestions)) { // ちょうど半分付近
        progressMessage += "　あと半分！";
    } else if (totalQuestions > 1 && progressRatio > 0.8 && progressRatio <= 0.9) { // 残り20%〜10%
         progressMessage += "　あと少し！";
    } else if (currentQuestionIndex === totalQuestions - 1 && totalQuestions > 0) { // 最後の1問
        progressMessage += "　最後の1問！";
    }

    progressText.innerText = progressMessage;
}

/**
 * 現在の問題を表示する関数
 */
function showQuestion() {
  // 全問終了していたら結果表示へ
  if (currentQuestionIndex >= totalQuestions) {
      showResult();
      return;
  }
  const q = questions[currentQuestionIndex]; // 現在の問題データを取得

  // アーティストのジャンルを表示 (重複を除外)
  const genres = new Set([q.genre1, q.genre2, q.genre3].filter(Boolean));
  genreP.innerText = `ジャンル：${Array.from(genres).join('、')}`;

  // --- 問題文と回答ボタンの表示 ---
  // 現状はアーティスト名に関する質問のみ
  questionP.innerText = `${q.artist_ja}（${q.artist_en}）をどれくらい知ってる？`;

  // 回答ボタンを生成
  buttonsDiv.innerHTML = ''; // 既存のボタンをクリア
  const answerLevels = [
      { level: 4, text: 'よく聴く（5曲以上知っている）' },
      { level: 3, text: '曲を知っている（3曲以上知っている）' },
      { level: 2, text: '何かの曲を聴いたことがある' },
      { level: 1, text: '名前だけは知ってる' },
      { level: 0, text: '全く知らない' }
  ];

  answerLevels.forEach(item => {
      const button = document.createElement('button');
      button.classList.add(`btn-level-${item.level}`); // スタイル用クラス
      button.dataset.level = item.level; // data属性にレベルを保持
      button.textContent = item.text;
      // クリック時に answer 関数を呼び出すイベントリスナーを設定
      button.addEventListener('click', () => answer(item.level));
      buttonsDiv.appendChild(button);
  });

  // プログレスバーを更新
  updateProgress();
}

/**
 * 回答を受け取り、スコアを計算して次の問題へ進む
 * @param {number} point 選択された回答レベル (0-4)
 */
function answer(point) {
  // 既に全問終了している場合は何もしない
  if (currentQuestionIndex >= totalQuestions) return;

  const q = questions[currentQuestionIndex]; // 現在の問題データ
  // アーティストの重要度 (major_level) から重みを計算 (デフォルト値3)
  const majorLevel = parseInt(q.major_level, 10);
  const weight = 6 - (isNaN(majorLevel) ? 3 : majorLevel); // 1(高) ~ 5(低) -> 5 ~ 1
  // スコア計算用の係数を取得
  const scoreMultiplier = calculateGenreScore(q, getSelectedGenres());
  // 最終的な加算スコアを計算
  const adjustedScore = point * weight * scoreMultiplier;

  // この問題が属するジャンル (currentGenre) のスコアを加算
  const currentGenre = q.currentGenre;
  if (genreScores[currentGenre]) { // genreScores に currentGenre が存在するか確認
    genreScores[currentGenre].score += adjustedScore;
    // 最大スコア (レベル4で回答した場合) も加算
    genreScores[currentGenre].max += 4 * weight * scoreMultiplier;
    genreScores[currentGenre].count++; // このジャンルの問題数をカウント
  } else {
      // 通常は startQuiz で初期化されるはずだが、念のためログを出力
      console.warn(`Genre ${currentGenre} not found in genreScores for question ${currentQuestionIndex}`);
  }


  currentQuestionIndex++; // 次の問題へ
  showQuestion(); // 次の問題を表示
}

// --- 結果表示 ---

/**
 * スコアに応じた総合評価メッセージを取得
 * @param {number} score 知識レベル (%)
 * @returns {string} 評価メッセージ
 */
function getOverallEvaluation(score) {
    if (score >= 80) return 'マニア級の知識！';
    if (score >= 60) return 'かなり詳しい！';
    if (score >= 40) return '基本的な知識あり';
    if (score >= 20) return 'もう少し！';
    return 'これからに期待！';
}

/**
 * スコアに応じた星評価を取得
 * @param {number} score 知識レベル (%)
 * @returns {string} 星評価 (⭐️)
 */
function getEvaluation(score) {
  if (score >= 80) return '⭐️⭐️⭐️⭐️⭐️';
  if (score >= 60) return '⭐️⭐️⭐️⭐️';
  if (score >= 40) return '⭐️⭐️⭐️';
  if (score >= 20) return '⭐️⭐️';
  return '⭐️';
}

/**
 * おすすめアーティストを取得する関数
 * @param {string[]} selectedGenres ユーザーが選択したジャンル
 * @param {object} scores 計算されたジャンル別スコア
 * @returns {object[]} おすすめアーティスト情報の配列 (最大3件)
 */
function getRecommendedArtists(selectedGenres, scores) {
    // スコアが低いジャンルを特定 (最大スコアが0のジャンルは除外)
    const sortedScores = Object.entries(scores)
        .filter(([genre, data]) => data.max > 0)
        .map(([genre, data]) => ({ genre, percentage: (data.score / data.max) * 100 }))
        .sort((a, b) => a.percentage - b.percentage); // スコアが低い順

    // スコアが低い上位2ジャンルを取得 (ただし1ジャンルしかない場合は1つ)
    const lowScoreGenres = sortedScores.slice(0, Math.min(2, sortedScores.length)).map(item => item.genre);
    if (lowScoreGenres.length === 0) return []; // 苦手ジャンルがなければ空配列

    // 出題されていないアーティストの中から、苦手ジャンルに属するものをフィルタリング
    const unusedArtists = artistData.filter(artist =>
        !questions.some(q => q.artist_id === artist.artist_id) && // 未出題か
        lowScoreGenres.some(genre => [artist.genre1, artist.genre2, artist.genre3].includes(genre)) // 苦手ジャンルに含まれるか
    );

    // 苦手ジャンルへの関連度でソートして上位3件を取得
    const recommendedArtists = unusedArtists
        .map(artist => ({
            ...artist,
            // 苦手ジャンルに対するスコア係数を計算
            relevance: calculateGenreScore(artist, lowScoreGenres)
        }))
        .sort((a, b) => b.relevance - a.relevance) // 関連度が高い順
        .slice(0, 3);

    return recommendedArtists;
}

/**
 * 診断結果を表示する関数
 */
function showResult() {
    // クイズ中の要素を非表示
    buttonsDiv.classList.add('hidden');
    progressBar.parentNode.classList.add('hidden'); // progress-container
    progressText.classList.add('hidden');
    genreP.classList.add('hidden');
    questionP.classList.add('hidden');

    // --- チャート用データの準備 ---
    // 有効なスコアを持つジャンルのみを抽出 (max > 0)
    const labels = Object.keys(genreScores).filter(g => genreScores[g] && genreScores[g].max > 0);

    // 有効なデータがない場合はメッセージ表示して終了
    if (labels.length === 0) {
        resultDiv.innerHTML = `<h2>診断結果</h2><p>有効な回答がありませんでした。診断をやり直してください。</p><button id="reload-button">もう一度診断する</button>`;
        resultDiv.classList.remove('hidden');
        // リロードボタンにイベントリスナーを設定
        const reloadButton = document.getElementById('reload-button');
        if (reloadButton) {
            reloadButton.addEventListener('click', () => location.reload());
        }
        return;
    }

    // 各ジャンルの知識レベル (%) を計算 (NaN チェック追加)
    const data = labels.map(g => {
        const scoreData = genreScores[g];
        // max が 0 以下、または score が NaN の場合は 0% とする
        if (!scoreData || scoreData.max <= 0 || isNaN(scoreData.score)) {
            return 0;
        }
        const percentage = (scoreData.score / scoreData.max) * 100;
        // 最終的なパーセンテージも NaN チェック
        return isNaN(percentage) ? 0 : Math.round(Math.max(0, Math.min(100, percentage))); // 0-100の範囲に収める
    });

    // 最高スコアと最低スコアのジャンルを特定
    let topGenre = '';
    let weakGenre = '';
    if (data.length > 0) {
        const maxScore = Math.max(...data);
        const minScore = Math.min(...data);
        // スコアが同率の場合、最初に見つかったジャンルが選ばれる
        topGenre = labels[data.indexOf(maxScore)];
        weakGenre = labels[data.indexOf(minScore)];
    }

    // おすすめアーティストを取得
    const recommended = getRecommendedArtists(getSelectedGenres(), genreScores);

    // --- チャートの描画 ---
    chartCanvas.classList.remove('hidden'); // Canvas を表示
    const ctx = chartCanvas.getContext("2d");

    // 既存のチャートインスタンスがあれば破棄 (再描画のため)
    const existingChart = Chart.getChart(chartCanvas); // getChart には Canvas 要素を渡す
    if (existingChart) {
        existingChart.destroy();
    }

    // 新しいレーダーチャートを作成
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels, // ジャンル名
            datasets: [{
                label: '知識度（%）',
                data: data, // 計算した知識レベル
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)', // 塗りつぶし色
                borderColor: 'rgba(75, 192, 192, 1)',     // 線の色
                pointBackgroundColor: 'rgba(75, 192, 192, 1)', // 点の色
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
            }]
        },
        options: {
            responsive: true, // レスポンシブ対応
            maintainAspectRatio: false, // アスペクト比を維持しない (CSSでサイズ調整しやすくする)
            scales: {
                r: { // レーダーチャートの軸設定
                    suggestedMin: 0,   // 最小値
                    suggestedMax: 100, // 最大値
                    ticks: {
                        backdropColor: 'rgba(255, 255, 255, 0.75)', // 目盛りの背景色
                        stepSize: 20 // 目盛りの間隔
                    },
                    pointLabels: { // ジャンル名のラベル
                        font: {
                            size: 13 // フォントサイズ調整
                        }
                    }
                }
            },
            plugins: {
                legend: { // 凡例
                    display: true,
                    position: 'top',
                },
                tooltip: { // ツールチップ
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.r !== null) {
                                label += context.parsed.r + '%';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // --- 結果テキストの表示 ---
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
                    ${labels.map((g, i) => `
                        <tr>
                            <td>${g}</td>
                            <td>${genreScores[g]?.count || 0}問</td>
                            <td>${data[i]}%</td>
                            <td>${getEvaluation(data[i])}</td>
                            <td>${getOverallEvaluation(data[i])}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${recommended.length > 0 ? `
            <h3>おすすめアーティスト</h3>
            <p>あなたの知識をさらに広げるために、以下のアーティストをおすすめします：</p>
            <ul>
                ${recommended.map(artist => `
                    <li>${artist.artist_ja}（${artist.artist_en}） - 主なジャンル: ${artist.genre1 || 'N/A'}</li>
                `).join('')}
            </ul>
        ` : ''}
        <br>
        <button id="reload-button">もう一度診断する</button>
    `;
    resultDiv.classList.remove('hidden'); // 結果表示エリアを表示

    // リロードボタンにイベントリスナーを設定
    const reloadButton = document.getElementById('reload-button');
    if (reloadButton) {
        reloadButton.addEventListener('click', () => location.reload());
    }
}

// --- 画面表示切り替え用ヘルパー ---

/**
 * ジャンル選択画面を表示する
 */
function showGenreSelectionScreen() {
    genreSelectionDiv.classList.remove('hidden');
    containerDiv.classList.add('hidden');
    chartCanvas.classList.add('hidden');
    resultDiv.classList.add('hidden');
    // スタートボタンの状態をリセット
    const selected = getSelectedGenres();
    const remaining = 3 - selected.length;
    if (remaining > 0) {
        startButton.disabled = true;
        startButton.classList.add('hidden');
        messageP.classList.remove('hidden');
        messageP.innerText = `あと ${remaining} 個選んでください`;
    } else {
        startButton.disabled = false;
        startButton.classList.remove('hidden');
        messageP.classList.add('hidden');
    }
}


// --- 初期化処理 ---
// DOMContentLoaded: HTMLの解析とDOMツリーの構築が完了した時点で実行
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素を取得してグローバル変数にキャッシュ ---
    genreSelectionDiv = document.getElementById('genre-selection');
    containerDiv = document.getElementById('container');
    chartCanvas = document.getElementById('chart');
    resultDiv = document.getElementById('result');
    startButton = document.getElementById('start-button');
    genreOptionsDiv = document.getElementById('genre-options');
    messageP = document.getElementById('genre-message');
    questionP = document.getElementById('question');
    genreP = document.getElementById('genre');
    progressBar = document.getElementById('progress-bar');
    progressText = document.getElementById('progress-text');
    buttonsDiv = document.getElementById('buttons');

    // --- 要素存在チェック (念のため) ---
    const requiredElements = {
        genreSelectionDiv, containerDiv, chartCanvas, resultDiv, startButton,
        genreOptionsDiv, messageP, questionP, genreP, progressBar, progressText, buttonsDiv
    };
    for (const key in requiredElements) {
        if (!requiredElements[key]) {
            console.error(`必要なHTML要素が見つかりません: #${key.replace('Div', '').replace('P', '').replace('Canvas', '').toLowerCase()}`);
            // ユーザーにエラーを通知する処理を追加しても良い
            // alert('ページの読み込みに失敗しました。再読み込みしてください。');
            return; // 初期化処理を中断
        }
    }

    // --- 初期設定 ---
    // ジャンル選択画面のセットアップ
    setupGenreSelection();

    // スタートボタンにクリックイベントリスナーを設定
    startButton.addEventListener('click', startQuiz);

    // --- 初期画面表示 ---
    // 最初はジャンル選択画面のみ表示
    genreSelectionDiv.classList.remove('hidden'); // 表示
    containerDiv.classList.add('hidden');      // 非表示
    chartCanvas.classList.add('hidden');       // 非表示
    resultDiv.classList.add('hidden');         // 非表示
    // スタートボタンは最初は非表示＆無効
    startButton.classList.add('hidden');
    startButton.disabled = true;
    // 初期メッセージ表示
    messageP.innerText = `あと 3 個選んでください`;
    messageP.classList.remove('hidden');

});
