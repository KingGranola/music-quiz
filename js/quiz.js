let currentQuestion = 0;
let genreScores = {};
const questions = [];
const QUESTIONS_PER_GENRE = 6;  // 1ジャンルあたり6問（合計30問）
const TOTAL_QUESTIONS = 30;     // 総問題数

// アルバムジャケットクイズのフラグ
let isAlbumCoverQuestion = false;

function getUsedGenres() {
  const genreSet = new Set();
  artistData.forEach(artist => {
    if (artist.genre1) genreSet.add(artist.genre1);
    if (artist.genre2) genreSet.add(artist.genre2);
    if (artist.genre3) genreSet.add(artist.genre3);
  });
  return Array.from(genreSet).filter(genre => genre !== '');
}

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

    const sortedRelations = Object.entries(relations[genre])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    
    relations[genre] = Object.fromEntries(sortedRelations);
  });

  return relations;
}

function calculateRelationScore(genre1, genre2) {
  let score = 0;
  let count = 0;

  artistData.forEach(artist => {
    const genres = [artist.genre1, artist.genre2, artist.genre3].filter(g => g);
    if (genres.includes(genre1) && genres.includes(genre2)) {
      count++;
      if (artist.genre1 === genre1 && artist.genre1 === genre2) {
        score += 0.8;
      } else if (artist.genre1 === genre1 || artist.genre1 === genre2) {
        score += 0.6;
      } else {
        score += 0.4;
      }
    }
  });

  return count > 0 ? 0.5 + (score / count) * 0.3 : 0;
}

const genreRelations = initializeGenreRelations();

function calculateGenreScore(artist, selectedGenres) {
  let score = 0;
  const mainGenre = artist.genre1;
  const subGenres = [artist.genre2, artist.genre3].filter(g => g);

  if (selectedGenres.includes(mainGenre)) {
    score += 2.0;
  }

  subGenres.forEach(subGenre => {
    if (selectedGenres.includes(subGenre)) {
      score += 0.5;
    }
  });

  selectedGenres.forEach(selectedGenre => {
    if (genreRelations[mainGenre] && genreRelations[mainGenre][selectedGenre]) {
      score += genreRelations[mainGenre][selectedGenre] * 0.4;
    }
    subGenres.forEach(subGenre => {
      if (genreRelations[subGenre] && genreRelations[subGenre][selectedGenre]) {
        score += genreRelations[subGenre][selectedGenre] * 0.2;
      }
    });
  });

  return score;
}

function getSelectedGenres() {
  return [...document.querySelectorAll('input[name="genre"]:checked')].map(cb => cb.value);
}

function setupGenreSelection() {
  const genreList = getUsedGenres();
  const genreOptions = document.getElementById("genre-options");
  const startButton = document.getElementById("start-button");
  const message = document.getElementById("genre-message");

  genreList.forEach(genre => {
    const label = document.createElement("label");
    label.style.display = "inline-block";
    label.style.margin = "10px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "genre";
    checkbox.value = genre;
    checkbox.style.marginRight = "8px";
    checkbox.style.transform = "scale(1.4)";

    label.appendChild(checkbox);
    label.append(genre);
    genreOptions.appendChild(label);
  });

  genreOptions.addEventListener("change", () => {
    const selected = getSelectedGenres();
    const remaining = 5 - selected.length;

    if (remaining > 0) {
      message.innerText = `あと ${remaining} 個選んでください`;
      message.style.display = "block";
      startButton.style.display = "none";
    } else {
      message.innerText = "";
      message.style.display = "none";
      startButton.style.display = "inline-block";
      startButton.disabled = false;
    }

    document.querySelectorAll('input[name="genre"]').forEach(cb => {
      cb.disabled = selected.length >= 5 && !cb.checked;
    });
  });

  startButton.addEventListener("click", () => {
    const selectedGenres = getSelectedGenres();
    if (selectedGenres.length !== 5) return;
    document.getElementById("genre-selection").style.display = "none";
    document.getElementById("container").style.display = "block";
    startQuiz(selectedGenres);
  });
}

function startQuiz(selectedGenres) {
  currentQuestion = 0;
  genreScores = {};
  questions.length = 0;

  const filteredArtists = artistData.filter(artist => 
    selectedGenres.includes(artist.genre1) ||
    selectedGenres.includes(artist.genre2) ||
    selectedGenres.includes(artist.genre3)
  );

  const artistsByGenre = {};
  selectedGenres.forEach(genre => {
    artistsByGenre[genre] = filteredArtists.filter(artist => 
      artist.genre1 === genre || artist.genre2 === genre || artist.genre3 === genre
    );
  });

  // 通常の質問を追加
  selectedGenres.forEach(genre => {
    const pool = artistsByGenre[genre];
    const weightedPool = pool.map(artist => ({
      artist,
      weight: calculateGenreScore(artist, selectedGenres)
    }));
    
    const selected = [];
    while (selected.length < QUESTIONS_PER_GENRE && weightedPool.length > 0) {
      const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;
      let index = 0;
      
      while (random > weightedPool[index].weight) {
        random -= weightedPool[index].weight;
        index++;
      }
      
      selected.push({
        ...weightedPool[index].artist,
        currentGenre: genre,
        isAlbumCover: false
      });
      weightedPool.splice(index, 1);
    }
    
    questions.push(...selected);
  });

  // 問題数が不足する場合、残りの問題を追加
  if (questions.length < TOTAL_QUESTIONS) {
    const remainingQuestions = TOTAL_QUESTIONS - questions.length;
    const allArtists = filteredArtists.filter(artist => 
      !questions.some(q => q.artist_id === artist.artist_id)
    );
    
    const weightedPool = allArtists.map(artist => ({
      artist,
      weight: calculateGenreScore(artist, selectedGenres)
    }));
    
    for (let i = 0; i < remainingQuestions && weightedPool.length > 0; i++) {
      const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;
      let index = 0;
      
      while (random > weightedPool[index].weight) {
        random -= weightedPool[index].weight;
        index++;
      }
      
      const selectedArtist = weightedPool[index].artist;
      questions.push({
        ...selectedArtist,
        currentGenre: selectedArtist.genre1,
        isAlbumCover: false
      });
      weightedPool.splice(index, 1);
    }
  }

  // 質問をシャッフル
  questions.sort(() => 0.5 - Math.random());
  showQuestion();
}

function updateProgress() {
    const percent = Math.floor((currentQuestion / TOTAL_QUESTIONS) * 100);
    const progressBar = document.getElementById("progress-bar");
    progressBar.style.width = `${percent}%`;
    
    // 正解数に応じて色を変更
    const correctCount = Object.values(genreScores).reduce((sum, genre) => sum + (genre.score || 0), 0);
    const maxScore = Object.values(genreScores).reduce((sum, genre) => sum + (genre.max || 0), 0);
    const scorePercent = (correctCount / maxScore) * 100;
    
    progressBar.className = '';
    if (scorePercent >= 60) {
        progressBar.classList.add('good');
    } else if (scorePercent >= 30) {
        progressBar.classList.add('normal');
    } else {
        progressBar.classList.add('bad');
    }
    
    // 進捗メッセージの生成
    let progressMessage = `${currentQuestion} / ${TOTAL_QUESTIONS}問`;
    if (currentQuestion === 0) {
        progressMessage += "　診断開始！";
    } else if (currentQuestion === 15) {
        progressMessage += "　あと半分！";
    } else if (currentQuestion === 25) {
        progressMessage += "　あと少し！";
    } else if (currentQuestion === 29) {
        progressMessage += "　最後の1問！";
    }
    
    document.getElementById("progress-text").innerText = progressMessage;
}

function showQuestion() {
  if (currentQuestion >= questions.length) return showResult();
  const q = questions[currentQuestion];
  
  // 重複のないジャンルリストを作成
  const genres = new Set([q.genre1, q.genre2, q.genre3].filter(g => g));
  
  document.getElementById("genre").innerText = `ジャンル：${Array.from(genres).join('、')}`;
  
  if (q.isAlbumCover) {
    isAlbumCoverQuestion = true;
    document.getElementById("question").innerHTML = `
      <p>このアルバムジャケットのアーティストは誰？</p>
      <img src="images/albums/${q.albumInfo.image}" alt="Album Cover" style="max-width: 300px; margin: 20px auto; display: block;">
      <p class="album-hint">ヒント：${q.albumInfo.release_year}年リリース『${q.albumInfo.name}』</p>
    `;
    document.getElementById("buttons").innerHTML = q.choices.map((choice, index) => `
      <button class="btn-level-${choice.isCorrect ? '4' : '2'}" onclick="answer(${choice.isCorrect ? 4 : 0})">
        ${choice.artist.artist_ja}（${choice.artist.artist_en}）
      </button>
    `).join('');
  } else {
    isAlbumCoverQuestion = false;
    document.getElementById("question").innerText = `${q.artist_ja}（${q.artist_en}）をどれくらい知ってる？`;
    document.getElementById("buttons").innerHTML = `
      <button class="btn-level-4" onclick="answer(4)">よく聴く（5曲以上知っている）</button>
      <button class="btn-level-3" onclick="answer(3)">曲を知っている（3曲以上知っている）</button>
      <button class="btn-level-2" onclick="answer(2)">何かの曲を聴いたことがある</button>
      <button class="btn-level-1" onclick="answer(1)">名前だけは知ってる</button>
      <button class="btn-level-0" onclick="answer(0)">全く知らない</button>
    `;
  }
  
  updateProgress();
}

function answer(point) {
  const q = questions[currentQuestion];
  const weight = 6 - (parseInt(q.major_level) || 3);
  const genreScore = calculateGenreScore(q, getSelectedGenres());
  const adjusted = point * weight * genreScore;

  if (!genreScores[q.currentGenre]) genreScores[q.currentGenre] = { score: 0, max: 0 };
  genreScores[q.currentGenre].score += adjusted;
  genreScores[q.currentGenre].max += 4 * weight * genreScore;

  currentQuestion++;
  showQuestion();
}

function getOverallEvaluation(score) {
    if (score >= 80) return 'マニア級の知識をお持ちです！';
    if (score >= 60) return '詳しい方だと思います！';
    if (score >= 40) return '基本的な知識はありますね';
    if (score >= 20) return 'もう少し掘り下げてみましょう';
    return 'これから知識を深めていけます';
}

function showResult() {
    document.getElementById("buttons").style.display = "none";
    document.getElementById("progress-container").style.display = "none";
    document.getElementById("progress-text").style.display = "none";
    document.getElementById("genre").style.display = "none";
    document.getElementById("question").style.display = "none";

    const labels = Object.keys(genreScores);
    const data = labels.map(g => Math.round((genreScores[g].score / genreScores[g].max) * 100));
    const topGenre = labels[data.indexOf(Math.max(...data))];
    const weakGenre = labels[data.indexOf(Math.min(...data))];

    const ctx = document.getElementById("chart").getContext("2d");
    document.getElementById("chart").style.display = "block";

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels,
            datasets: [{
                label: '知識度（%）',
                data,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                pointBackgroundColor: 'rgba(75, 192, 192, 1)'
            }]
        },
        options: {
            responsive: true,
            scales: { r: { suggestedMin: 0, suggestedMax: 100 } }
        }
    });

    const result = document.getElementById("result");
    result.innerHTML = `
        <h2>診断完了！</h2>
        <p><strong>あなたは「${topGenre}」に詳しく、「${weakGenre}」はちょっと苦手かも？</strong></p>
        <h3>ジャンル別の診断内訳</h3>
        <table>
            <thead>
                <tr>
                    <th>ジャンル</th>
                    <th>知識レベル</th>
                    <th>評価</th>
                    <th>総評</th>
                </tr>
            </thead>
            <tbody>
                ${labels.map((g, i) => `
                    <tr>
                        <td>${g}</td>
                        <td>${data[i]}%</td>
                        <td>${getEvaluation(data[i])}</td>
                        <td>${getOverallEvaluation(data[i])}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <br>
        <button onclick="location.reload()">もう一度診断する</button>
    `;
    result.style.display = "block";
}

function getEvaluation(score) {
  if (score >= 80) return '⭐️⭐️⭐️⭐️⭐️';
  if (score >= 60) return '⭐️⭐️⭐️⭐️';
  if (score >= 40) return '⭐️⭐️⭐️';
  if (score >= 20) return '⭐️⭐️';
  return '⭐️';
}

window.onload = setupGenreSelection; 