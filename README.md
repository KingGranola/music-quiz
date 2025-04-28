採点と結果表示のロジックについて説明します。
主に quizLogic.js, genreUtils.js, uiController.js, chartRenderer.js が関わっています。

**1. 採点ロジック (quizLogic.js, genreUtils.js)**

クイズ中の採点は、ユーザーが各問題にどう答えたか（どのボタンを押したか）に基づいて、問題ごとに行われます。

問題ごとのスコア計算 (quizLogic.js の processAnswer → calculateScore):

基本点: ユーザーが選択した回答レベル（0: 全く知らない 〜 4: よく聴く）が基本の点数になります。
アーティストの重み: 各アーティストには major_level という「重要度」が設定されています。重要度が高い（major_level が低い、例: 1や2）アーティストほど、スコア計算時の「重み」が大きくなります (config.js の WEIGHT_BASE - major_level で計算）。これにより、有名なアーティストに関する知識は高く評価されやすくなります。
ジャンル関連係数: その問題のアーティストが、ユーザーが最初に選択したジャンル群とどれだけ関連しているかを数値化します（genreUtils.js の calculateGenreScore で計算）。選択したジャンルに直接属していたり、関連性の高いジャンルに属しているほど、この係数は高くなります。
最終スコア: 最終スコア = 基本点 × アーティストの重み × ジャンル関連係数 で計算されます。
スコアの蓄積: 計算されたスコアは、その問題がどのジャンルの枠で選ばれたか（questionData.currentGenre）に基づいて、genreScores というオブジェクトに蓄積されます。同時に、その問題で獲得可能な最大スコア（レベル4で回答した場合）も max として記録されます。
ジャンル関連係数の詳細 (genreUtils.js の calculateGenreScore):

アーティストのメインジャンル (genre1) が選択ジャンルに含まれていれば、高い係数が加算されます。
アーティストのサブジャンル (genre2, genre3) が選択ジャンルに含まれていれば、少し低い係数が加算されます。
さらに、アーティストのジャンルと選択ジャンルの間の「関連性スコア」（後述）も考慮され、関連性が高いほど係数が少し加算されます。
これらの合計が、そのアーティストに対するジャンル関連係数となります。
ジャンル間の関連性スコア (genreUtils.js の initializeGenreRelationsInternal, calculateRelationScore):

これはアプリの起動時に一度だけ計算され、genreRelations 変数に保存されます。
2つのジャンル（例: "ロック" と "ポップス"）があったとき、両方のジャンルを持つアーティストがデータ内にどれだけいるか、またその組み合わせ（メインジャンル同士か、サブジャンルかなど）によって、関連性の強さが数値化されます。
これにより、「ロック」と「ポップス」は関連が強い、「クラシック」と「HIPHOP」は関連が弱い、といった情報がスコア計算や問題選出に利用されます。
問題選出時の重み付け (quizLogic.js の generateQuestionList, selectWeightedRandom):

採点だけでなく、問題を選ぶ際にも calculateGenreScore で計算した「ジャンル関連係数」が「重み」として使われます。
ユーザーが選択したジャンルとの関連度が高いアーティストほど、問題として選ばれやすくなる仕組み（重み付きランダム選択）になっています。

**2. 結果表示ロジック (quizLogic.js, uiController.js, chartRenderer.js)**

全問回答し終わると、結果データが生成され、画面に表示されます。

結果データの生成 (quizLogic.js の generateResultData):

蓄積された genreScores から、各ジャンルの最終的な「知識レベル (%)」を計算します (獲得スコア / 最大可能スコア * 100)。
この知識レベル (%) を、レーダーチャート表示用のデータ (labels 配列と data 配列) としてまとめます。
知識レベルが最も高かったジャンル (topGenre) と最も低かったジャンル (weakGenre) を特定します。
スコアが低かったジャンルに基づいて、「おすすめアーティスト」を選定します (getRecommendedArtists)。
これらの情報（チャートデータ、最高/最低ジャンル、おすすめ、元のスコア詳細）を一つのオブジェクトにまとめて返します。
おすすめアーティストの選定 (quizLogic.js の getRecommendedArtists):

知識レベルが低かった上位N個のジャンルを「苦手ジャンル」とします (config.js の NUM_LOW_SCORE_GENRES_FOR_RECOMMENDATION)。
まだクイズに出題されておらず、かつ苦手ジャンルのいずれかに属するアーティストを候補とします。
候補の中から、苦手ジャンルへの関連度が高い順にM件 (config.js の MAX_RECOMMENDED_ARTISTS) を選びます。
結果画面の表示 (uiController.js の displayResultUI):

generateResultData から受け取った結果オブジェクトを使います。
まず、chartRenderer.js の renderRadarChart 関数を呼び出し、labels と data を渡してレーダーチャートを描画させます。
topGenre と weakGenre を使った簡単な総評メッセージを表示します。
ジャンルごとの詳細な結果（問題数、知識レベル%、評価（星）、総評（テキスト））を表形式で表示します。
評価（星）: 知識レベル (%) に応じて、quizLogic.js の getEvaluation 関数が config.js の EVALUATION_STARS 設定に基づいて星の数を返します。
総評（テキスト）: 知識レベル (%) に応じて、quizLogic.js の getOverallEvaluation 関数が config.js の OVERALL_EVALUATION_MESSAGES 設定に基づいてメッセージを返します。
getRecommendedArtists で選ばれたおすすめアーティストのリストを表示します。
「もう一度診断する」ボタンを表示し、クリックするとページがリロードされるように設定します (setupReloadButton)。
レーダーチャートの描画 (chartRenderer.js の renderRadarChart):

受け取ったジャンル名 (labels) と知識レベル (%) (data) を使って、Chart.js ライブラリでレーダーチャートを描画します。
チャートの見た目（色、軸の範囲、凡例、ツールチップなど）もここで設定されています。
このように、採点ではアーティストの重要度やジャンル間の関連性を考慮し、結果表示ではレーダーチャートや詳細な評価、おすすめアーティストなどを提示する仕組みになっています。
