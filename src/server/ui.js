export const onOpen = () => {
  const menu = SlidesApp.getUi()
    .createMenu('PDF to Slides')
    .addItem('PDF to Slides', 'uploadFilePage');

  menu.addToUi();
};

export const uploadFilePage = () => {
  const html = HtmlService.createHtmlOutputFromFile('upload-file-page');
  SlidesApp.getUi().showSidebar(html);
};
