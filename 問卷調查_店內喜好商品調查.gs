function createProductSurveyForm() {
  // Get the current script file
  var currentFile = DriveApp.getFileById(ScriptApp.getScriptId());
  
  // Get the folder containing the current script file
  var folder = currentFile.getParents().next();
  
  // Check if the form already exists and delete it
  var existingForms = folder.getFilesByName('店內暢銷商品調查');
  while (existingForms.hasNext()) {
    var existingForm = existingForms.next();
    folder.removeFile(existingForm);
    Logger.log('Existing form deleted.');
  }
  
  // Create a new form in the same folder
  var form = FormApp.create('店內暢銷商品調查');
  var formFile = DriveApp.getFileById(form.getId());
  folder.addFile(formFile);
  DriveApp.getRootFolder().removeFile(formFile);
  
  // Set form settings
  form.setCollectEmail(false);
  form.setRequireLogin(false);
  
  // Look for productlist.txt in the same folder as the script
  var files = folder.getFilesByName('productlist.txt');
  
  if (files.hasNext()) {
    var file = files.next();
    var content = file.getBlob().getDataAsString();
    var products = content.split('\n');
    
    // Remove any empty lines
    products = products.filter(function(product) {
      return product.trim() !== '';
    });
    
    // Add a section for product selection
    var section = form.addSectionHeaderItem();
    section.setTitle('選擇您喜好的商品 (可複選): ');
    
    // Add individual checkbox items for each product
    products.forEach(function(product) {
      var item = form.addCheckboxItem();
      item.setTitle(product.trim());
      item.setChoices([
        item.createChoice('是，我想要', false)  // Changed from '選擇' to '是，我想要' and set default to unchecked
      ]);
    });
    
    // Check if the response spreadsheet already exists and delete it
    var existingSheets = folder.getFilesByName('店內暢銷商品調查 (Responses)');
    while (existingSheets.hasNext()) {
      var existingSheet = existingSheets.next();
      folder.removeFile(existingSheet);
      Logger.log('Existing response sheet deleted.');
    }
    
    // Create a new spreadsheet for responses in the same folder
    var spreadsheet = SpreadsheetApp.create('店內暢銷商品調查 (Responses)');
    var ssFile = DriveApp.getFileById(spreadsheet.getId());
    folder.addFile(ssFile);
    DriveApp.getRootFolder().removeFile(ssFile);
    
    // Set the response destination
    form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
    
    // Get the form's edit URL and publish URL
    var editUrl = form.getEditUrl();
    var publishedUrl = form.getPublishedUrl();
    
    Logger.log('Form created successfully!');
    Logger.log('Edit URL: ' + editUrl);
    Logger.log('Published URL: ' + publishedUrl);
    Logger.log('Response Spreadsheet URL: ' + spreadsheet.getUrl());
  } else {
    Logger.log('Error: productlist.txt file not found in the script folder');
  }
}

function runOnce() {
  createProductSurveyForm();
  Logger.log('Script execution completed.');
}
