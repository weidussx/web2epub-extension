const CONFIG = {
  epub: {
    version: '3.0',
    language: 'zh',
    defaultFont: 'Arial',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    defaultTitle: '未命名文档',
  },
  ui: {
    theme: 'light',
    language: 'zh-CN',
    loadingText: '正在处理...',
    errorMessages: {
      noTab: '无法获取当前标签页',
      noContent: '无法提取文章内容',
      fileTooLarge: '文件大小超过限制',
      networkError: '网络错误',
    }
  },
  epubStructure: {
    mimetype: 'application/epub+zip',
    containerXml: `<?xml version="1.0" encoding="UTF-8"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
      </container>`,
  }
};

export default CONFIG; 