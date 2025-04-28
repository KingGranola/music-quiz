/**
 * quizLogic.js
 * クイズの進行管理、スコア計算、結果データの生成など、
 * アプリケーションの中心的なロジックを担当するファイルです。
 * 画面表示(UI)に関する直接的な操作は uiController.js に任せます。
 */

// 必要なデータ、設定、他のモジュールの関数を読み込みます
import { artistData } from './artistData.js'; // アーティストデータ
import { calculateGenreScore } from './genreUtils.js'; // ジャンル関連の計算関数
import {
    QUESTIONS_PER_GENRE, MAX_QUESTIONS, QUESTIONS_FOR_3_GENRES, MIN_GENRES_TO_START,
    WEIGHT_BASE, DEFAULT_MAJOR_LEVEL, MAX_RECOMMENDED_ARTISTS, NUM_LOW_SCORE_GENRES_FOR_RECOMMENDATION,
    EVALUATION_STARS, OVERALL_EVALUATION_MESSAGES
} from './config.js'; // 設定値
import { displayQuestionUI, displayResultUI, showGenreSelectionScreen } from './uiController.js'; // UI更新関数

// --- モジュール内部で使う、クイズの状態を管理する変数 ---

/** 現在の問題が何問目かを示すインデックス (0から始まる) */
let currentQuestionIndex = 0;
/** 今回のクイズの総問題数 */
let totalQuestions = 0;
/** ジャンルごとのスコアを記録するオブジェクト
 *  例: { "ロック": { score: 150.5, max: 300, count: 5 }, ... }
 */
let genreScores = {};
/** 出題する問題のリスト (アーティスト情報の配列) */
const questions = [];
/** 現在のクイズでユーザーが選択したジャンルのリスト */
let currentSelectedGenres = [];


// --- クイズの開始と進行 ---

/**
 * クイズを開始する関数。問題リストを作成し、最初の問題を表示します。
 * @param {string[]} selectedGenres - ユーザーが選択したジャンルの配列
 * @returns {boolean} クイズの開始に成功した場合は true、失敗した場合は false
 */
export function startQuiz(selectedGenres) {
    // 選択されたジャンル数が足りているか最終確認
    if (selectedGenres.length < MIN_GENRES_TO_START) {
        console.error("選択されたジャンルが足りないため、クイズを開始できません。");
        return false;
    }

    // --- クイズ状態のリセット ---
    currentSelectedGenres = selectedGenres; // 選択されたジャンルを保持
    currentQuestionIndex = 0;               // 問題インデックスをリセット
    genreScores = {};                       // スコア記録をリセット
    selectedGenres.forEach(genre => {       // 選択された各ジャンルのスコア記録場所を作成
        genreScores[genre] = { score: 0, max: 0, count: 0 };
    });
    questions.length = 0;                   // 前回の問題リストを空にする

    // --- 問題数の決定 ---
    if (selectedGenres.length === MIN_GENRES_TO_START) {
        totalQuestions = QUESTIONS_FOR_3_GENRES; // 3ジャンル選択時の特別ルール
    } else {
        // 4ジャンル以上の場合: (選択数 * 1ジャンルあたりの問題数) と 最大問題数 の小さい方
        totalQuestions = Math.min(selectedGenres.length * QUESTIONS_PER_GENRE, MAX_QUESTIONS);
    }

    // --- 問題リストの生成 ---
    // generateQuestionList 関数を呼び出して問題リストを作成
    const generatedQuestions = generateQuestionList(selectedGenres, totalQuestions);
    // 作成した問題リストを questions 配列にコピー
    questions.push(...generatedQuestions);

    // --- 問題リスト生成後の調整 ---
    // 実際に生成された問題数で totalQuestions を更新
    // (重み付けなどで予定数より少なくなる場合があるため)
    totalQuestions = questions.length;

    // 問題が1問も生成できなかった場合
    if (totalQuestions === 0) {
        alert("問題を作成できませんでした。選択したジャンルに該当するアーティストが少ないか、条件に合うアーティストが見つかりませんでした。");
        showGenreSelectionScreen(); // UIコントローラー経由でジャンル選択画面に戻す
        return false; // 開始失敗
    }

    // 問題リストをランダムにシャッフル
    questions.sort(() => 0.5 - Math.random());

    // --- 最初の問題を表示 ---
    // UIコントローラーの関数を呼び出して、画面に最初の問題を表示させる
    displayQuestionUI(questions[currentQuestionIndex], currentQuestionIndex, totalQuestions);

    console.log(`クイズ開始: 全${totalQuestions}問`); // 開発用ログ
    return true; // 開始成功
}

/**
 * ユーザーの回答を受け取り、スコアを計算し、次の問題または結果画面を表示する関数。
 * @param {number} point - ユーザーが選択した回答レベル (0〜4)
 */
export function processAnswer(point) {
    // 既に全問終了している場合は何もしない
    if (currentQuestionIndex >= totalQuestions) {
        console.warn("全問終了後に回答処理が呼ばれました。");
        return;
    }

    // --- スコア計算 ---
    const currentQuestionData = questions[currentQuestionIndex]; // 現在の問題データを取得
    calculateScore(currentQuestionData, point); // スコア計算処理を呼び出す

    // --- 次へ進む ---
    currentQuestionIndex++; // 問題インデックスを1つ進める

    // まだ問題が残っているか？
    if (currentQuestionIndex < totalQuestions) {
        // 次の問題を表示
        displayQuestionUI(questions[currentQuestionIndex], currentQuestionIndex, totalQuestions);
    } else {
        // 全問終了した場合
        console.log("全問終了！結果を生成・表示します。");
        const resultData = generateResultData(); // 結果データを生成
        displayResultUI(resultData);             // UIコントローラー経由で結果を表示
    }
}


// --- 問題リスト生成のロジック ---

/**
 * 選択されたジャンルと目標問題数に基づいて、出題するアーティストのリストを生成します。
 * @param {string[]} selectedGenres - ユーザーが選択したジャンル
 * @param {number} targetTotalQuestions - 目標とする総問題数
 * @returns {object[]} 生成された問題データの配列
 */
function generateQuestionList(selectedGenres, targetTotalQuestions) {
    const generatedList = []; // 生成された問題を入れる配列
    const usedArtistIds = new Set(); // 一度出題したアーティストのIDを記録

    // 1ジャンルあたりの基本問題数と、余りを配分する数を計算
    const baseQuestionsPerGenre = Math.floor(targetTotalQuestions / selectedGenres.length);
    const remainingQuestions = targetTotalQuestions % selectedGenres.length;

    // 選択されたジャンルに該当するアーティストを全てフィルタリング
    const candidateArtists = artistData.filter(artist =>
        selectedGenres.some(genre => [artist.genre1, artist.genre2, artist.genre3].includes(genre))
    );

    // ジャンルごとに候補アーティストを分類しておく
    const artistsByGenre = {};
    selectedGenres.forEach(genre => {
        artistsByGenre[genre] = candidateArtists.filter(artist =>
            [artist.genre1, artist.genre2, artist.genre3].includes(genre)
        );
    });

    // 各選択ジャンルについてループし、問題を選出
    selectedGenres.forEach((genre, index) => {
        const pool = artistsByGenre[genre] || []; // このジャンルの候補アーティストリスト
        // 候補の中から、まだ出題されておらず、スコア係数(重み)が計算できるものを抽出
        const weightedPool = pool
            .filter(artist => !usedArtistIds.has(artist.artist_id)) // 未出題か？
            .map(artist => ({
                artist: artist,
                weight: calculateGenreScore(artist, selectedGenres) // スコア係数を計算して重みとする
            }))
            .filter(item => item.weight > 0); // 重みが0のものは除外

        // このジャンルで選出する問題数を決定 (基本数 + 余りがあれば1問追加)
        const questionsForThisGenre = baseQuestionsPerGenre + (index < remainingQuestions ? 1 : 0);

        // 重み付きランダム選択で問題を選出
        const selectedForThisGenre = selectWeightedRandom(weightedPool, questionsForThisGenre);

        // 選出されたアーティストを問題リストに追加し、出題済みにする
        selectedForThisGenre.forEach(item => {
            generatedList.push({
                ...item.artist, // アーティスト情報をコピー
                currentGenre: genre // この問題がどのジャンルの枠で選ばれたか記録
                // isAlbumCover: false // アルバムカバー問題は現状未実装
            });
            usedArtistIds.add(item.artist.artist_id); // 出題済みにマーク
        });
    });

    return generatedList; // 生成された問題リストを返す
}

/**
 * 重み付きリストから、指定された数の要素をランダムに選択します（重複なし）。
 * @param {Array<{artist: object, weight: number}>} weightedPool - 重み付きの候補リスト
 * @param {number} count - 選択する要素の数
 * @returns {Array<{artist: object, weight: number}>} 選択された要素の配列
 */
function selectWeightedRandom(weightedPool, count) {
    const selected = []; // 選択された要素を入れる配列
    const pool = [...weightedPool]; // 元の配列をコピーして使う（元の配列を変更しないため）
    let attempts = 0; // 無限ループ防止用
    const maxAttempts = pool.length * 3; // 最大試行回数（多めに設定）

    // 指定された数に達するか、プールが空になるか、試行回数上限に達するまでループ
    while (selected.length < count && pool.length > 0 && attempts < maxAttempts) {
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0); // 重みの合計を計算
        if (totalWeight <= 0) break; // 重み合計が0以下なら選択不能

        let randomValue = Math.random() * totalWeight; // 0から重み合計までの乱数を生成
        let chosenIndex = -1;

        // 乱数値に基づいて要素を選択
        for (let i = 0; i < pool.length; i++) {
            randomValue -= pool[i].weight;
            if (randomValue <= 0) {
                chosenIndex = i;
                break;
            }
        }

        if (chosenIndex !== -1) {
            // 要素が選択された場合
            selected.push(pool[chosenIndex]); // 選択リストに追加
            pool.splice(chosenIndex, 1);      // プールから削除
            attempts = 0; // 試行回数をリセット
        } else {
            // 何らかの理由で選択できなかった場合（通常は起こらないはず）
            attempts++;
            console.warn("重み付きランダム選択で要素を選べませんでした。試行回数:", attempts);
        }
    }
    return selected; // 選択された要素のリストを返す
}


// --- スコア計算 ---

/**
 * 1問ごとのスコアを計算し、`genreScores` オブジェクトを更新します。
 * @param {object} questionData - 現在の問題のデータ
 * @param {number} point - ユーザーの回答レベル (0-4)
 */
function calculateScore(questionData, point) {
    // アーティストの重要度 (major_level) から重みを計算
    const majorLevel = parseInt(questionData.major_level, 10);
    // major_level が数値でない場合はデフォルト値を使う
    const weight = WEIGHT_BASE - (isNaN(majorLevel) ? DEFAULT_MAJOR_LEVEL : majorLevel);

    // スコア計算用の係数を取得 (ジャンル関連度など考慮)
    const scoreMultiplier = calculateGenreScore(questionData, currentSelectedGenres);

    // 最終的な加算スコア = 回答レベル * 重み * スコア係数
    const adjustedScore = point * weight * scoreMultiplier;

    // この問題が属するジャンル (currentGenre) のスコア記録を更新
    const targetGenre = questionData.currentGenre;
    if (genreScores[targetGenre]) {
        genreScores[targetGenre].score += adjustedScore; // 実際のスコアを加算
        // 最大スコア (レベル4で回答した場合のスコア) も加算
        genreScores[targetGenre].max += 4 * weight * scoreMultiplier; // 常に point=4 で計算
        genreScores[targetGenre].count++; // このジャンルの問題数をカウント
    } else {
        // 通常は発生しないはずだが、もしジャンルが見つからなければログ出力
        console.warn(`スコア記録対象のジャンルが見つかりません: ${targetGenre}`);
    }
}


// --- 結果データの生成 ---

/**
 * クイズ終了時に、結果表示用のデータを生成します。
 * @returns {object | null} 結果データオブジェクト、または有効なデータがない場合は null
 */
function generateResultData() {
    // --- チャート用データの準備 ---
    // 有効なスコアを持つジャンル (最大スコア > 0) のリストを作成
    const validLabels = Object.keys(genreScores).filter(g => genreScores[g]?.max > 0);

    // 有効なジャンルが一つもなければ null を返す
    if (validLabels.length === 0) {
        console.warn("有効なスコアを持つジャンルがありませんでした。");
        return null;
    }

    // 各ジャンルの知識レベル (%) を計算
    const chartData = validLabels.map(genre => {
        const scoreInfo = genreScores[genre];
        // score や max が不正な値でないか確認し、0除算やNaNを防ぐ
        if (!scoreInfo || scoreInfo.max <= 0 || isNaN(scoreInfo.score)) {
            return 0; // 不正な場合は 0% とする
        }
        const percentage = (scoreInfo.score / scoreInfo.max) * 100;
        // 計算結果が NaN になる場合も考慮し、0-100 の範囲に収める
        return isNaN(percentage) ? 0 : Math.round(Math.max(0, Math.min(100, percentage)));
    });

    // --- 最高・最低スコアのジャンル特定 ---
    let topGenre = '';
    let weakGenre = '';
    if (chartData.length > 0) {
        const maxScore = Math.max(...chartData);
        const minScore = Math.min(...chartData);
        // indexOf を使って最初に見つかったジャンルを取得
        topGenre = validLabels[chartData.indexOf(maxScore)];
        weakGenre = validLabels[chartData.indexOf(minScore)];
    }

    // --- おすすめアーティストの選定 ---
    const recommendedArtists = getRecommendedArtists(currentSelectedGenres, genreScores);

    // --- 結果オブジェクトを返す ---
    return {
        labels: validLabels,      // チャートのラベル (ジャンル名)
        data: chartData,          // チャートのデータ (知識レベル%)
        topGenre: topGenre,       // 最高スコアのジャンル名
        weakGenre: weakGenre,     // 最低スコアのジャンル名
        recommended: recommendedArtists, // おすすめアーティストのリスト
        scores: genreScores       // 元のスコアデータ (テーブル表示用)
    };
}

/**
 * おすすめアーティストを選定する関数。スコアが低いジャンルから選ぶ。
 * @param {string[]} selectedGenres - ユーザーが選択したジャンル
 * @param {object} scores - 計算済みのジャンル別スコアオブジェクト
 * @returns {object[]} おすすめアーティスト情報の配列
 */
function getRecommendedArtists(selectedGenres, scores) {
    // スコアが低いジャンルを特定
    const sortedScores = Object.entries(scores)
        .filter(([genre, data]) => data.max > 0) // 有効なスコアを持つジャンルのみ
        .map(([genre, data]) => ({ genre, percentage: (data.score / data.max) * 100 }))
        .sort((a, b) => a.percentage - b.percentage); // スコアが低い順にソート

    // スコアが低い上位Nジャンルを取得 (Nは設定ファイルの値)
    const lowScoreGenres = sortedScores.slice(0, NUM_LOW_SCORE_GENRES_FOR_RECOMMENDATION).map(item => item.genre);

    // 苦手ジャンルがなければ空配列を返す
    if (lowScoreGenres.length === 0) return [];

    // --- おすすめ候補の選定 ---
    // 1. まだクイズに出題されていないアーティスト
    // 2. かつ、苦手ジャンルのいずれかに属するアーティスト
    const candidateArtists = artistData.filter(artist =>
        !questions.some(q => q.artist_id === artist.artist_id) && // 未出題か？
        lowScoreGenres.some(genre => [artist.genre1, artist.genre2, artist.genre3].includes(genre)) // 苦手ジャンルに含まれるか？
    );

    // 候補アーティストを、苦手ジャンルへの関連度でソート
    const recommended = candidateArtists
        .map(artist => ({
            ...artist,
            // 苦手ジャンルに対するスコア係数を計算して関連度とする
            relevance: calculateGenreScore(artist, lowScoreGenres)
        }))
        .sort((a, b) => b.relevance - a.relevance) // 関連度が高い順にソート
        .slice(0, MAX_RECOMMENDED_ARTISTS); // 上位M件を取得 (Mは設定ファイルの値)

    return recommended;
}


// --- 評価メッセージ生成 ---
// これらは結果表示時に uiController から呼び出される想定

/**
 * スコア (%) に応じた星評価文字列を返します。
 * @param {number} score - 知識レベル (%)
 * @returns {string} 星評価 (例: "⭐️⭐️⭐️⭐️")
 */
export function getEvaluation(score) {
    // 設定ファイルの評価定義を上から順にチェック
    for (const evalItem of EVALUATION_STARS) {
        if (score >= evalItem.threshold) {
            return evalItem.stars;
        }
    }
    // どれにも当てはまらない場合 (通常は threshold: 0 で引っかかるはず)
    return EVALUATION_STARS[EVALUATION_STARS.length - 1].stars;
}

/**
 * スコア (%) に応じた総合評価メッセージ文字列を返します。
 * @param {number} score - 知識レベル (%)
 * @returns {string} 総合評価メッセージ (例: "かなり詳しい！")
 */
export function getOverallEvaluation(score) {
    // 設定ファイルの評価定義を上から順にチェック
    for (const evalItem of OVERALL_EVALUATION_MESSAGES) {
        if (score >= evalItem.threshold) {
            return evalItem.message;
        }
    }
    // どれにも当てはまらない場合
    return OVERALL_EVALUATION_MESSAGES[OVERALL_EVALUATION_MESSAGES.length - 1].message;
}
