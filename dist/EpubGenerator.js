import CONFIG from './config.js';
import Logger from './logger.js';
import ImageProcessor from './imageProcessor.js';

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
      this.createStylesheet(oebps);
      this.createContent(oebps, title, content);
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

  processContent(content) {
    // 创建一个临时div来解析HTML内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // 处理所有段落
    const paragraphs = tempDiv.getElementsByTagName('p');
    for (let p of paragraphs) {
      // 确保段落有正确的缩进和间距
      p.style.margin = '1em 0';
      p.style.textIndent = '2em';
      
      // 处理段落内的链接
      const links = p.getElementsByTagName('a');
      for (let a of links) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      }
    }
    
    // 处理所有标题
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (let h of headings) {
      h.style.margin = '1.5em 0 0.5em 0';
      h.style.pageBreakAfter = 'avoid';
    }
    
    // 处理所有图片
    const images = tempDiv.getElementsByTagName('img');
    for (let img of images) {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '1em auto';
    }
    
    // 添加分页标记
    const contentLength = tempDiv.textContent.length;
    const pageSize = 2000; // 每页大约2000个字符
    const totalPages = Math.ceil(contentLength / pageSize);
    
    let currentLength = 0;
    const elements = Array.from(tempDiv.children);
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      currentLength += element.textContent.length;
      
      if (currentLength >= pageSize && i < elements.length - 1) {
        // 在适当的位置插入分页标记
        const pageBreak = document.createElement('div');
        pageBreak.style.pageBreakBefore = 'always';
        element.parentNode.insertBefore(pageBreak, element.nextSibling);
        currentLength = 0;
      }
    }
    
    return tempDiv.innerHTML;
  }

  createMimetype() {
    this.zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  }

  createContainer() {
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    this.zip.folder("META-INF").file("container.xml", containerXml);
  }

  createStylesheet(oebps) {
    oebps.file("style.css", `
      @charset "UTF-8";
      
      body {
        font-family: ${CONFIG.epub.defaultFont}, serif;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        text-align: justify;
      }
      
      .sigil_not_in_toc {
        display: block;
        margin: 0;
        padding: 0;
      }
      
      h1.sigil_not_in_toc {
        font-size: 1.5em;
        font-weight: bold;
        line-height: 1.2;
        margin: 0.67em 0;
        text-align: center;
      }
      
      img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1em auto;
      }
      
      h1, h2, h3, h4, h5, h6 {
        margin: 1.5em 0 0.5em 0;
      }
      
      p {
        margin: 1em 0;
        text-indent: 2em;
      }
      
      a {
        color: #0066cc;
        text-decoration: none;
      }
    `.trim());
  }

  createContent(oebps, title, content) {
    const fileName = 'content.xhtml';
    
    const html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${this.escapeXml(title)}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  </head>
  <body>
    <div class="sigil_not_in_toc">
      <h1 class="sigil_not_in_toc">${this.escapeXml(title)}</h1>
      <div class="sigil_not_in_toc">
        ${content}
      </div>
    </div>
  </body>
</html>`;
    
    oebps.file(fileName, html);
    return 1;
  }

  createContentOpf(oebps, title, images) {
    const manifest = [
      '<item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="style" href="style.css" media-type="text/css"/>'
    ];

    // 添加图片到manifest
    images.forEach((_, index) => {
      manifest.push(`<item id="image${index}" href="images/image${index}.jpg" media-type="image/jpeg"/>`);
    });

    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${this.escapeXml(title)}</dc:title>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="bookid">urn:uuid:${this.uuid}</dc:identifier>
    <dc:creator>Web to EPUB</dc:creator>
    <dc:date>${new Date().toISOString()}</dc:date>
    <meta name="cover" content="image0"/>
    <meta name="sigil_version" content="1.9.30"/>
    <meta name="sigil_epub_version" content="2.0"/>
    <meta name="sigil_epub_uid" content="${this.uuid}"/>
    <meta name="sigil_epub_creation_date" content="${new Date().toISOString()}"/>
    <meta name="sigil_epub_modification_date" content="${new Date().toISOString()}"/>
    <meta name="sigil_epub_language" content="zh-CN"/>
    <meta name="sigil_epub_title" content="${this.escapeXml(title)}"/>
    <meta name="sigil_epub_creator" content="Web to EPUB"/>
    <meta name="sigil_epub_identifier" content="urn:uuid:${this.uuid}"/>
    <meta name="sigil_epub_identifier_type" content="UUID"/>
    <meta name="sigil_epub_identifier_scheme" content="urn:uuid"/>
    <meta name="sigil_epub_identifier_value" content="${this.uuid}"/>
  </metadata>
  <manifest>
    ${manifest.join('\n    ')}
  </manifest>
  <spine>
    <itemref idref="content"/>
  </spine>
  <guide>
    <reference type="text" title="开始阅读" href="content.xhtml"/>
  </guide>
</package>`;

    oebps.file("content.opf", contentOpf);
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