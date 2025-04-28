/**
 * genreUtils.js
 * ジャンルに関する様々な計算や処理を行う関数をまとめたファイルです。
 * 例えば、アーティストデータから使われているジャンル一覧を取得したり、
 * ジャンル同士の関連性を計算したりします。
 */

// 必要なデータや設定値を他のファイルから読み込みます (import)
import { artistData } from './artistData.js'; // アーティストデータの読み込み
import { RELATION_SCORE_CONFIG, SCORE_MULTIPLIER, MAX_RELATED_GENRES_TO_KEEP } from './config.js'; // 設定値の読み込み

// --- モジュール内部で使う変数 ---

/**
 * ジャンル間の関連スコアを計算して保存しておく変数。
 * アプリ起動時に一度だけ計算されます (initializeGenreRelationsInternal 関数)。
 * 例: { "ロック": { "ポップス": 0.7, "オルタナティブ": 0.6, ... }, ... }
 */
let genreRelations = {};


// --- 公開する関数 (export) ---

/**
 * artistData.js のデータを見て、アプリ内で使われている全てのジャンル名を取得します。
 * @returns {string[]} ジャンル名の配列 (例: ["HIPHOP", "J-POP", "ロック", ...])
 */
export function getUsedGenres() {
  // Set という仕組みを使って、重複しないようにジャンル名を集めます。
  const genreSet = new Set();
  artistData.forEach(artist => {
    // 各アーティストが持つジャンル1, 2, 3 を Set に追加していきます。
    if (artist.genre1) genreSet.add(artist.genre1);
    if (artist.genre2) genreSet.add(artist.genre2);
    if (artist.genre3) genreSet.add(artist.genre3);
  });
  // Set を通常の配列に変換し、空文字('')やスペースだけの項目を除外して返します。
  return Array.from(genreSet).filter(genre => genre && genre.trim() !== '');
}

/**
 * アーティストデータと選択されたジャンルリストを元に、
 * そのアーティストがクイズのスコア計算でどれくらい重要かを示す係数を計算します。
 * 選択されたジャンルに直接合致したり、関連性が高いほど高い係数になります。
 * @param {object} artist - スコアを計算したいアーティストのデータ (artistData.js の中の1件)
 * @param {string[]} selectedGenres - ユーザーが選択したジャンルの配列
 * @returns {number} 計算されたスコア係数 (例: 2.5)
 */
export function calculateGenreScore(artist, selectedGenres) {
  let score = 0; // スコア係数の初期値
  const mainGenre = artist.genre1; // アーティストのメインジャンル
  const subGenres = [artist.genre2, artist.genre3].filter(Boolean); // サブジャンル (存在すれば)

  // 1. メインジャンルが選択ジャンルに含まれているかチェック
  if (mainGenre && selectedGenres.includes(mainGenre)) {
    score += SCORE_MULTIPLIER.MAIN_GENRE_MATCH; // 設定ファイルの値を使う
  }

  // 2. サブジャンルが選択ジャンルに含まれているかチェック
  subGenres.forEach(subGenre => {
    if (selectedGenres.includes(subGenre)) {
      score += SCORE_MULTIPLIER.SUB_GENRE_MATCH;
    }
  });

  // 3. ジャンル間の関連性を考慮してスコアを加算
  selectedGenres.forEach(selectedGenre => {
    // メインジャンルと選択されたジャンルの関連スコアを加算
    // `genreRelations[mainGenre]?.[selectedGenre]` は、関連スコアが存在する場合のみ値を取得する書き方
    if (mainGenre && genreRelations[mainGenre]?.[selectedGenre]) {
      score += genreRelations[mainGenre][selectedGenre] * SCORE_MULTIPLIER.RELATED_MAIN_GENRE;
    }
    // サブジャンルと選択されたジャンルの関連スコアを加算
    subGenres.forEach(subGenre => {
      if (genreRelations[subGenre]?.[selectedGenre]) {
        score += genreRelations[subGenre][selectedGenre] * SCORE_MULTIPLIER.RELATED_SUB_GENRE;
      }
    });
  });

  // スコアが0のままの場合、最低限の係数を返す (全く関連なくても問題に出る可能性を残すため)
  return score > 0 ? score : SCORE_MULTIPLIER.MINIMUM;
}

/**
 * アプリの初期化時に一度だけ呼び出され、ジャンル間の関連スコアを計算して
 * `genreRelations` 変数に保存します。
 * この関数自体は外部から直接使われることは想定していません (初期化処理の一部)。
 */
function initializeGenreRelationsInternal() {
  const usedGenres = getUsedGenres(); // まず、存在する全ジャンルを取得
  const tempRelations = {}; // 計算結果を一時的に保存する場所

  // 各ジャンルについてループ
  usedGenres.forEach(genre => {
    tempRelations[genre] = {}; // このジャンルの関連スコアを入れる箱を用意
    // 自分以外の他のジャンルを取得
    const otherGenres = usedGenres.filter(g => g !== genre);

    // 他の各ジャンルとの関連スコアを計算
    otherGenres.forEach(otherGenre => {
      const score = calculateRelationScore(genre, otherGenre); // 下で定義されている関数を呼び出す
      if (score > 0) { // スコアが0より大きければ保存
        tempRelations[genre][otherGenre] = score;
      }
    });

    // 計算した関連スコアを、スコアが高い順に並び替え、上位N件だけを保持する
    const sortedRelations = Object.entries(tempRelations[genre])
      .sort((a, b) => b[1] - a[1]) // スコア(配列の1番目の要素)で降順ソート
      .slice(0, MAX_RELATED_GENRES_TO_KEEP); // 上位N件を取得 (Nは設定ファイルの値)

    // 配列からオブジェクト形式に戻して、最終的な `genreRelations` に保存
    genreRelations[genre] = Object.fromEntries(sortedRelations);
  });

  console.log("ジャンル関連スコア計算完了:", genreRelations); // 計算が終わったことをログに出力 (開発用)
}

/**
 * 二つのジャンル間の関連性の強さを計算する内部関数です。
 * 同じアーティストが両方のジャンルを持っている場合にスコアが高くなります。
 * @param {string} genre1 - 比較するジャンル1
 * @param {string} genre2 - 比較するジャンル2
 * @returns {number} 計算された関連スコア (0から1程度の値)
 */
function calculateRelationScore(genre1, genre2) {
  let scoreSum = 0; // スコアの合計
  let commonArtistCount = 0; // 両ジャンルを持つアーティストの数

  // 全アーティストデータをチェック
  artistData.forEach(artist => {
    // アーティストが持つジャンル(1, 2, 3)のリストを作成 (空文字などは除外)
    const artistGenres = [artist.genre1, artist.genre2, artist.genre3].filter(Boolean);

    // アーティストが genre1 と genre2 の両方を持っているか？
    if (artistGenres.includes(genre1) && artistGenres.includes(genre2)) {
      commonArtistCount++; // 持っていればカウントを増やす

      // ジャンルの組み合わせ（メインかサブか）に応じてスコアを加算 (重み付け)
      const configWeights = RELATION_SCORE_CONFIG.WEIGHTS;
      if ((artist.genre1 === genre1 && artist.genre2 === genre2) || (artist.genre1 === genre2 && artist.genre2 === genre1)) {
        scoreSum += configWeights.BOTH_MAIN; // 両方がメイン/サブ1の場合
      } else if (artist.genre1 === genre1 || artist.genre1 === genre2) {
        scoreSum += configWeights.ONE_MAIN; // どちらか一方がメインの場合
      } else {
        scoreSum += configWeights.BOTH_SUB; // 両方ともサブ2/サブ3の場合
      }
    }
  });

  // 両ジャンルを持つアーティストがいた場合、平均スコアに基づいて最終スコアを計算
  // (設定ファイルの BASE 値を基準に、平均スコアで調整)
  if (commonArtistCount > 0) {
    const averageScore = scoreSum / commonArtistCount;
    return RELATION_SCORE_CONFIG.BASE + averageScore * RELATION_SCORE_CONFIG.ADJUSTMENT_FACTOR;
  } else {
    // 共通のアーティストがいなければ関連スコアは 0
    return 0;
  }
}

// --- 初期化処理 ---
// このファイルが読み込まれた時に、ジャンル関連スコアの計算を実行します。
initializeGenreRelationsInternal();
