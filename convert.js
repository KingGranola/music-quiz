const fs = require('fs');

// artistData.jsの内容を読み込む
const artistDataContent = fs.readFileSync('./js/artistData.js', 'utf8');
// 変数宣言部分を削除してJSONとして評価
const artistDataStr = artistDataContent
  .replace('const artistData = ', '')
  .replace(/;?\s*$/, ''); // 末尾のセミコロンを削除

const artistData = JSON.parse(artistDataStr);

// CSVヘッダー
const header = 'artist_id,artist_ja,artist_en,genre1,genre2,genre3,era,major_level\n';

// データを配列に変換
const allArtists = [];
let currentId = 1;

Object.entries(artistData).forEach(([mainGenre, artists]) => {
  artists.forEach(artist => {
    // 重複チェック（artist_jaとartist_enの組み合わせで判定）
    const isDuplicate = allArtists.some(
      a => a.artist_ja === artist.artist_ja && a.artist_en === artist.artist_en
    );
    
    if (!isDuplicate) {
      allArtists.push({
        artist_id: `a${String(currentId).padStart(3, '0')}`,
        artist_ja: artist.artist_ja,
        artist_en: artist.artist_en,
        genres: [mainGenre],
        era: artist.era || "2010年代", // 仮の年代設定
        major_level: artist.major_level.toString()
      });
      currentId++;
    }
  });
});

// データをCSV形式に変換
const csvRows = allArtists.map(artist => {
  const genres = artist.genres.concat(Array(3 - artist.genres.length).fill(''));
  return [
    artist.artist_id,
    artist.artist_ja,
    artist.artist_en,
    genres[0],
    genres[1],
    genres[2],
    artist.era,
    artist.major_level
  ].join(',');
});

// CSVファイルに書き出し
const csvContent = header + csvRows.join('\n');
fs.writeFileSync('artistData.csv', csvContent, 'utf8');

console.log('CSVファイルが生成されました: artistData.csv'); 