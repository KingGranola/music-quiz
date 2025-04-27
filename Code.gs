function exportToArtistDataJS() {
  try {
    // スプレッドシートを取得
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // アクティブなシートを取得
    const sheet = ss.getActiveSheet();
    if (!sheet) {
      throw new Error('シートが見つかりません');
    }
    
    // データを取得
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      throw new Error('データが存在しません');
    }
    
    const headers = data[0];
    
    // アーティストデータの配列を作成
    const artists = [];
    
    // ヘッダー行をスキップしてデータを処理
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const artist = {};
      
      // 各列のデータをプロパティとして追加
      headers.forEach((header, index) => {
        if (row[index] !== '') { // 空のセルはスキップ
          artist[header] = row[index];
        }
      });
      
      artists.push(artist);
    }
    
    // JavaScriptファイルの内容を生成
    const jsContent = `// This file is auto-generated from Google Spreadsheet
const artistData = ${JSON.stringify(artists, null, 2)};
`;
    
    // フォルダ選択ダイアログを表示
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      'フォルダ選択',
      '保存先のフォルダIDを入力してください（フォルダのURLから取得できます）:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.CANCEL) {
      ui.alert('処理をキャンセルしました');
      return;
    }
    
    const folderId = response.getResponseText().trim();
    if (!folderId) {
      throw new Error('フォルダIDが入力されていません');
    }
    
    // フォルダを取得
    let folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      throw new Error('指定されたフォルダが見つかりません。フォルダIDを確認してください。');
    }
    
    // 新しいファイルを作成
    const file = folder.createFile('artistData.js', jsContent, 'text/javascript');
    
    // 成功メッセージを表示
    ui.alert('artistData.jsが正常に生成されました。\nURL: ' + file.getUrl());
    
  } catch (error) {
    // エラーメッセージを表示
    SpreadsheetApp.getUi().alert('エラーが発生しました: ' + error.message);
    Logger.log('Error: ' + error.message);
  }
}

// スプレッドシートのオンメニューにカスタムメニューを追加
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('カスタムメニュー')
    .addItem('artistData.jsを生成', 'exportToArtistDataJS')
    .addToUi();
} 