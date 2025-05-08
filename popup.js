// 工具函数
function showMessage(message, type = 'info') {
  const preview = document.getElementById('preview');
  preview.innerHTML = `<div class="message ${type}">${message}</div>`;
}

function showLoading() {
  const preview = document.getElementById('preview');
  preview.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div>正在处理中...</div>
    </div>
  `;
}

function sanitizeTitle(title) {
  if (!title) return 'untitled';
  return title.replace(/[\\/:*?"<>|]/g, "_").trim();
}

function generateUUID() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function checkFileSize(blob) {
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (blob.size > maxSize) {
    throw new Error("文件太大，请选择较小的文章");
  }
}

// 主要功能函数
async function extractContent() {
  try {
    showLoading();
    
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error("无法获取当前标签页");
    }

    // 注入 readability.js 脚本
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['readability.js']
    });

    // 执行提取文章脚本
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try {
          const clone = document.cloneNode(true);
          const article = new Readability(clone).parse();
          return article;
        } catch (error) {
          return { error: error.message };
        }
      }
    });

    const result = results[0].result;
    if (result.error) {
      throw new Error(result.error);
    }

    if (!result) {
      throw new Error("无法提取文章内容");
    }

    document.getElementById('preview').innerHTML = `
      <div class="article-preview">
        <h2>${result.title}</h2>
        <div class="content">${result.content}</div>
      </div>
    `;
    
    const saveButton = document.getElementById('save');
    saveButton.style.display = 'block';
    saveButton.onclick = () => saveAsEPUB(result.title, result.content);
  } catch (error) {
    showMessage(`处理失败：${error.message}`, 'error');
  }
}

async function saveAsEPUB(title, content) {
  try {
    showLoading();
    const zip = new JSZip();
    const uuid = generateUUID();
    const sanitizedTitle = sanitizeTitle(title);

    // 创建 mimetype 文件
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // 创建 META-INF 文件夹和 container.xml
    zip.folder("META-INF").file("container.xml", `
      <?xml version="1.0" encoding="UTF-8"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
      </container>
    `.trim());

    // 创建 OEBPS 文件夹和内容
    const oebps = zip.folder("OEBPS");

    // 添加章节文件
    oebps.file("chapter1.xhtml", `
      <?xml version="1.0" encoding="UTF-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>${sanitizedTitle}</title>
          <meta charset="UTF-8"/>
        </head>
        <body>${content}</body>
      </html>
    `.trim());

    // 添加目录文件
    oebps.file("nav.xhtml", `
      <?xml version="1.0" encoding="UTF-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
        <head>
          <title>目录</title>
          <meta charset="UTF-8"/>
        </head>
        <body>
          <nav epub:type="toc" id="toc">
            <h1>目录</h1>
            <ol>
              <li><a href="chapter1.xhtml">${sanitizedTitle}</a></li>
            </ol>
          </nav>
        </body>
      </html>
    `.trim());

    // 创建 content.opf 文件
    oebps.file("content.opf", `
      <?xml version="1.0" encoding="UTF-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>${sanitizedTitle}</dc:title>
          <dc:language>zh</dc:language>
          <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
          <dc:creator>Web to EPUB Extension</dc:creator>
          <dc:date>${new Date().toISOString()}</dc:date>
        </metadata>
        <manifest>
          <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
          <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        </manifest>
        <spine>
          <itemref idref="chapter1"/>
        </spine>
      </package>
    `.trim());

    // 生成 EPUB 文件
    const blob = await zip.generateAsync({ 
      type: "blob",
      mimeType: "application/epub+zip"
    });

    checkFileSize(blob);

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${sanitizedTitle}.epub`;
    link.click();

    showMessage("EPUB 文件已生成！", 'success');
  } catch (error) {
    showMessage(`保存失败：${error.message}`, 'error');
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  extractContent();
});