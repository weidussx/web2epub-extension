import CONFIG from '../config/config.js';
import Logger from '../utils/logger.js';
import ImageProcessor from '../utils/imageProcessor.js';

class EpubGenerator {
  constructor() {
    this.zip = new JSZip();
    this.uuid = crypto.randomUUID();
  }

  async generate(title, content) {
    try {
      Logger.info('开始生成EPUB文件');
      
      // 处理图片
      const processedImages = await ImageProcessor.processImages(content);
      
      // 创建基本结构
      this.createMimetype();
      this.createContainer();
      
      // 创建内容
      const oebps = this.zip.folder("OEBPS");
      this.createChapter(oebps, title, content);
      this.createNavigation(oebps, title);
      this.createContentOpf(oebps, title, processedImages);
      
      // 生成文件
      const blob = await this.zip.generateAsync({ type: "blob" });
      
      // 检查文件大小
      if (blob.size > CONFIG.epub.maxFileSize) {
        throw new Error(CONFIG.ui.errorMessages.fileTooLarge);
      }
      
      Logger.info('EPUB文件生成成功');
      return blob;
    } catch (error) {
      Logger.error('EPUB生成失败', error);
      throw error;
    }
  }

  createMimetype() {
    this.zip.file("mimetype", CONFIG.epubStructure.mimetype, { compression: "STORE" });
  }

  createContainer() {
    this.zip.folder("META-INF").file("container.xml", CONFIG.epubStructure.containerXml.trim());
  }

  createChapter(oebps, title, content) {
    oebps.file("chapter1.xhtml", `
      <?xml version="1.0" encoding="UTF-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>${this.escapeXml(title)}</title>
          <style>
            body { font-family: ${CONFIG.epub.defaultFont}; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `.trim());
  }

  createNavigation(oebps, title) {
    oebps.file("nav.xhtml", `
      <?xml version="1.0" encoding="UTF-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
        <head><title>目录</title></head>
        <body>
          <nav epub:type="toc" id="toc">
            <h1>目录</h1>
            <ol>
              <li><a href="chapter1.xhtml">${this.escapeXml(title)}</a></li>
            </ol>
          </nav>
        </body>
      </html>
    `.trim());
  }

  createContentOpf(oebps, title, images) {
    const manifest = [
      '<item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
    ];

    // 添加图片到manifest
    images.forEach((_, index) => {
      manifest.push(`<item id="image${index}" href="images/image${index}.jpg" media-type="image/jpeg"/>`);
    });

    oebps.file("content.opf", `
      <?xml version="1.0" encoding="UTF-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="${CONFIG.epub.version}" unique-identifier="bookid">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>${this.escapeXml(title)}</dc:title>
          <dc:language>${CONFIG.epub.language}</dc:language>
          <dc:identifier id="bookid">urn:uuid:${this.uuid}</dc:identifier>
          <dc:creator>Web to EPUB</dc:creator>
          <dc:date>${new Date().toISOString()}</dc:date>
        </metadata>
        <manifest>
          ${manifest.join('\n          ')}
        </manifest>
        <spine>
          <itemref idref="chapter1"/>
        </spine>
      </package>
    `.trim());
  }

  escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }
}

export default EpubGenerator; 