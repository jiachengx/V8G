function createImageBasedForms() {
  var formTitles = ['蔬食8_熟食販賣機喜好商品調查_慈中', '蔬食8_熟食販賣機喜好商品調查_慈院'];
  var currentFolder = DriveApp.getFileById(ScriptApp.getScriptId()).getParents().next();
  var originalForm = createForm(formTitles[0], currentFolder);
  
  // 複製第一個表單來創建第二個表單
  if (formTitles.length > 1) {
    var copiedForm = DriveApp.getFileById(originalForm.getId()).makeCopy(formTitles[1], currentFolder);
    var copiedFormId = copiedForm.getId();
    var copiedFormUrl = FormApp.openById(copiedFormId).getPublishedUrl();
    Logger.log('複製的表單創建成功。 網址: ' + copiedFormUrl);
    
    // 為複製的表單設置新的回應試算表
    var copiedSheet = SpreadsheetApp.create('表單回應: ' + formTitles[1]);
    var copiedSheetFile = DriveApp.getFileById(copiedSheet.getId());
    currentFolder.addFile(copiedSheetFile);
    DriveApp.getRootFolder().removeFile(copiedSheetFile);
    
    var copiedForm = FormApp.openById(copiedFormId);
    copiedForm.setDestination(FormApp.DestinationType.SPREADSHEET, copiedSheet.getId());
    
    setupSheetWithImageFilenames(copiedSheet, originalForm.getItems());
  }
}

function createForm(formTitle, folder) {
  try {
    Logger.log('開始執行腳本：' + formTitle);
    
    // 創建一個新的表單
    var form = FormApp.create(formTitle);
    // 將表單移動到指定資料夾
    var formFile = DriveApp.getFileById(form.getId());
    folder.addFile(formFile);
    DriveApp.getRootFolder().removeFile(formFile);
    
    form.setDescription('請在每張圖片下方選擇您想要的項目，可以多重選擇。');
    Logger.log('表單已創建：' + formTitle);
    
    // 創建一個新的試算表來儲存回應
    var sheet = SpreadsheetApp.create('表單回應: ' + formTitle);
    // 將試算表移動到指定資料夾
    var sheetFile = DriveApp.getFileById(sheet.getId());
    folder.addFile(sheetFile);
    DriveApp.getRootFolder().removeFile(sheetFile);
    
    Logger.log('回應試算表已創建');
    
    // 設定表單回應的目的地
    form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
    
    // 子資料夾名稱
    var subFolderNames = [
      '一之軒',
      '喬治',
      '大磬微波餐盒',
      '新東王',
      '昌檉',
      '米漢堡',
      '華瑄',
      '蔬食8',
      '養心茶樓',
      '善田油飯'
    ];
    
    // 獲取腳本所在的資料夾
    var scriptFolder = folder;
    Logger.log('已找到腳本所在資料夾');
    
    for (var i = 0; i < subFolderNames.length; i++) {
      var subFolderName = subFolderNames[i];
      Logger.log('處理子資料夾: ' + subFolderName);
      
      // 在腳本所在資料夾中尋找子資料夾
      var subFolders = scriptFolder.getFoldersByName(subFolderName);
      
      if (subFolders.hasNext()) {
        var subFolder = subFolders.next();
        
        // 為每個子資料夾創建一個章節
        var section = form.addSectionHeaderItem().setTitle(subFolderName);
        
        // 獲取子資料夾中的所有JPG和PNG圖片
        var images = subFolder.getFilesByType(MimeType.JPEG);
        var pngImages = subFolder.getFilesByType(MimeType.PNG);
        var imageCount = 0;
        
        // 處理函數
        function processImage(image) {
          var imageId = image.getId();
          var imageName = image.getName().replace(/\.(jpe?g|png)$/i, '');  // 移除副檔名
          
          // 創建一個圖片項目
          var imageItem = form.addImageItem();
          imageItem.setImage(DriveApp.getFileById(imageId));
          imageItem.setTitle(subFolderName + ' - 圖片 #' + (imageCount + 1) + ': ' + imageName);
          
          // 在圖片下方添加一個方塊選擇
          var needItem = form.addCheckboxItem();
          needItem.setTitle('您想要這個嗎？ [' + imageName + ']');
          needItem.setChoices([
            needItem.createChoice('是，我想要')
          ]);
          
          imageCount++;
          
          if (imageCount % 10 == 0) {
            Logger.log(subFolderName + ' 已處理 ' + imageCount + ' 張圖片');
          }
        }
        
        // 處理JPG圖片
        while (images.hasNext()) {
          processImage(images.next());
        }
        
        // 處理PNG圖片
        while (pngImages.hasNext()) {
          processImage(pngImages.next());
        }
        
        Logger.log(subFolderName + ' 總共處理了 ' + imageCount + ' 張圖片');
      } else {
        Logger.log('找不到子資料夾: ' + subFolderName);
      }
    }
    
    Logger.log('表單創建成功。 網址: ' + form.getPublishedUrl());
    Logger.log('回應將被收集在試算表中: ' + sheet.getUrl());
    
    // 設置試算表以包含圖片文件名
    setupSheetWithImageFilenames(sheet, form.getItems());
    
    return form;
  } catch (error) {
    Logger.log('發生錯誤: ' + error.toString());
    Logger.log('錯誤堆疊: ' + error.stack);
  }
}

function setupSheetWithImageFilenames(sheet, formItems) {
  var responseSheet = sheet.getSheets()[0];
  var headers = responseSheet.getRange(1, 1, 1, responseSheet.getLastColumn()).getValues()[0];
  
  // Find the index of the first question column (skipping Timestamp)
  var startColumn = headers.findIndex(function(header) {
    return header.includes('您想要這個嗎？');
  });
  
  if (startColumn === -1) {
    startColumn = 1; // Default to B column if not found
  } else {
    startColumn++; // Convert to 1-based index and move to the next column
  }
  
  // Extract image filenames from form items
  var imageFilenames = formItems.filter(function(item) {
    return item.getType() === FormApp.ItemType.CHECKBOX;
  }).map(function(item) {
    var match = item.getTitle().match(/\[(.*?)\]/);
    return match ? match[1] : '';
  });
  
  // Insert a new row at the top
  responseSheet.insertRowBefore(1);
  
  // Add image filenames to the first row, starting from the determined column
  for (var i = 0; i < imageFilenames.length; i++) {
    responseSheet.getRange(1, startColumn + i).setValue(imageFilenames[i]);
  }
  
  // Add '小計' to the last row of the first column
  var lastRow = responseSheet.getLastRow();
  responseSheet.getRange(lastRow + 1, 1).setValue('小計');
  
  // Freeze the top two rows
  responseSheet.setFrozenRows(2);
  
  Logger.log('試算表已設置完成，包含圖片文件名（無副檔名）。');
}

function calculateSubtotals(sheetId) {
  var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  var lastColumn = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  
  // 計算每個圖片的小計
  for (var col = 2; col <= lastColumn; col++) {
    var subtotal = 0;
    for (var row = 3; row < lastRow; row++) {
      if (sheet.getRange(row, col).getValue() === '是，我想要') {
        subtotal++;
      }
    }
    sheet.getRange(lastRow, col).setValue(subtotal);
  }
  
  Logger.log('小計已更新。');
}

function testFolderAccess() {
  try {
    var scriptFolder = DriveApp.getFileById(ScriptApp.getScriptId()).getParents().next();
    Logger.log('腳本所在資料夾: ' + scriptFolder.getName());
    
    var subFolders = scriptFolder.getFolders();
    while (subFolders.hasNext()) {
      var folder = subFolders.next();
      Logger.log('找到子資料夾: ' + folder.getName());
    }
  } catch (error) {
    Logger.log('訪問資料夾時發生錯誤: ' + error.toString());
  }
}
