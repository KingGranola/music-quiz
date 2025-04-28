/**
 * config.js
 * アプリケーション全体で使う設定値をまとめておくファイルです。
 * ここで設定を変更すると、アプリの動作が変わります。
 */

// --- クイズ設定 ---

/**
 * 1つのジャンルあたりに出題する基本的な問題数です。
 * 例えば、5ジャンル選択された場合、基本的には 5 * 5 = 25問出題されます。
 * (ただし、最大問題数や3ジャンル選択時の特別ルールもあります)
 */
export const QUESTIONS_PER_GENRE = 5;

/**
 * クイズ全体の最大問題数です。
 * たくさんジャンルを選んでも、ここ設定した数より多くは出題されません。
 */
export const MAX_QUESTIONS = 100;

/**
 * 3ジャンル選択した場合の固定問題数です。
 */
export const QUESTIONS_FOR_3_GENRES = 10;


// --- ジャンル選択画面の設定 ---

/**
 * ジャンル選択画面で、優先的に上の方に表示したいジャンルのリストです。
 * ここに書かれたジャンル名が artistData.js に存在すれば、先に表示されます。
 */
export const PRIORITY_GENRES = ['ポップス', 'ロック', 'HIPHOP', 'R&B', 'J-POP', 'ジャズ', 'クラシック'];

/**
 * クイズを開始するために最低限選択する必要があるジャンルの数です。
 */
export const MIN_GENRES_TO_START = 3;


// --- スコア計算に関する設定 ---

/**
 * 回答レベル (0〜4) に対応する基本的な点数です。
 * (実際にはアーティストの重要度などで調整されます)
 */
export const BASE_POINTS = {
    LEVEL_4: 4, // よく聴く
    LEVEL_3: 3, // 曲を知っている
    LEVEL_2: 2, // 何か聴いたことある
    LEVEL_1: 1, // 名前だけ知ってる
    LEVEL_0: 0  // 全く知らない
};

/**
 * アーティストの重要度 (major_level) をスコア計算の重みに変換する際の基準値です。
 * (6 - major_level) で重みを計算しています。
 */
export const WEIGHT_BASE = 6;

/**
 * アーティストの重要度 (major_level) が不明な場合のデフォルト値です。
 */
export const DEFAULT_MAJOR_LEVEL = 3;

/**
 * スコア計算時に、アーティストのジャンルが選択ジャンルと一致した場合の係数です。
 */
export const SCORE_MULTIPLIER = {
    MAIN_GENRE_MATCH: 2.0,   // メインジャンル一致
    SUB_GENRE_MATCH: 0.5,    // サブジャンル一致
    RELATED_MAIN_GENRE: 0.4, // 関連ジャンル(メイン)
    RELATED_SUB_GENRE: 0.2,  // 関連ジャンル(サブ)
    MINIMUM: 0.1             // 最低係数 (全く関連なくても少し考慮)
};

/**
 * ジャンル間の関連スコアを計算する際のベース値と調整係数です。
 * (calculateRelationScore 関数で使用)
 */
export const RELATION_SCORE_CONFIG = {
    BASE: 0.5,
    ADJUSTMENT_FACTOR: 0.3,
    WEIGHTS: { // アーティストが両ジャンルを持つ場合の重み
        BOTH_MAIN: 0.8,
        ONE_MAIN: 0.6,
        BOTH_SUB: 0.4
    }
};

/**
 * ジャンル間の関連スコアで、各ジャンルに対して保持する上位の関連ジャンル数です。
 * (initializeGenreRelations 関数で使用)
 */
export const MAX_RELATED_GENRES_TO_KEEP = 4;


// --- 結果表示に関する設定 ---

/**
 * おすすめアーティストとして表示する最大件数です。
 */
export const MAX_RECOMMENDED_ARTISTS = 3;

/**
 * おすすめアーティストを選ぶ際に、スコアが低い（苦手な）ジャンルとして考慮する上位の数です。
 */
export const NUM_LOW_SCORE_GENRES_FOR_RECOMMENDATION = 2;

/**
 * 知識レベル (%) に応じた評価（星）を定義します。
 */
export const EVALUATION_STARS = [
    { threshold: 80, stars: '⭐️⭐️⭐️⭐️⭐️' },
    { threshold: 60, stars: '⭐️⭐️⭐️⭐️' },
    { threshold: 40, stars: '⭐️⭐️⭐️' },
    { threshold: 20, stars: '⭐️⭐️' },
    { threshold: 0,  stars: '⭐️' } // 0%以上
];

/**
 * 知識レベル (%) に応じた総合評価メッセージを定義します。
 */
export const OVERALL_EVALUATION_MESSAGES = [
    { threshold: 80, message: 'マニア級の知識！' },
    { threshold: 60, message: 'かなり詳しい！' },
    { threshold: 40, message: '基本的な知識あり' },
    { threshold: 20, message: 'もう少し！' },
    { threshold: 0,  message: 'これからに期待！' }
];


// --- UI表示に関する設定 ---

/**
 * 回答ボタンのレベルと表示テキストの対応です。
 */
export const ANSWER_BUTTON_LEVELS = [
    { level: 4, text: 'よく聴く（5曲以上知っている）' },
    { level: 3, text: '曲を知っている（3曲以上知っている）' },
    { level: 2, text: '何かの曲を聴いたことがある' },
    { level: 1, text: '名前だけは知ってる' },
    { level: 0, text: '全く知らない' }
];

/**
 * プログレスバーの色が変わる割合の閾値です。
 * [ good, normal, bad ] の順で定義します。
 */
export const PROGRESS_BAR_THRESHOLDS = {
    GOOD_UNTIL: 0.5, // 50%未満は good (緑)
    NORMAL_UNTIL: 0.9 // 90%未満は normal (黄)
    // それ以上は bad (赤)
};

/**
 * 進捗テキストに特別なメッセージを追加するタイミングの閾値です。
 */
export const PROGRESS_TEXT_MESSAGES = {
    START: 0,              // 開始時
    HALF: 0.5,             // 半分付近
    ALMOST_DONE_START: 0.8,// 残りわずか (開始)
    ALMOST_DONE_END: 0.9,  // 残りわずか (終了)
    LAST_ONE_OFFSET: 1     // 最後の1問 (インデックスが total - 1 の時)
};
