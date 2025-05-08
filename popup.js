async function extractContent() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Step 1: 注入 readability.js 脚本
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['readability.js']
  });

  // Step 2: 执行提取文章脚本
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const clone = document.cloneNode(true);
      const article = new Readability(clone).parse();
      return article;
    }
  }, (results) => {
    const article = results[0].result;

    if (!article) {
      document.getElementById('preview').innerHTML = "❌ 无法提取文章内容。";
      return;
    }

    document.getElementById('preview').innerHTML = `<h2>${article.title}</h2>${article.content}`;
    document.getElementById('save').onclick = () => saveAsEPUB(article.title, article.content);
  });
}

function saveAsEPUB(title, content) {
  const zip = new JSZip();
  const uuid = crypto.randomUUID();

  // Step 1: 创建 mimetype 文件，必须为 application/epub+zip
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // Step 2: 创建 META-INF 文件夹，并添加 container.xml 文件
  zip.folder("META-INF").file("container.xml", `
    <?xml version="1.0" encoding="UTF-8"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
      </rootfiles>
    </container>
  `.trim());

  // Step 3: 创建 OEBPS 文件夹，添加章节内容和封面
  const oebps = zip.folder("OEBPS");

  // 添加章节文件
  oebps.file("chapter1.xhtml", `
    <?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head><title>${title}</title></head>
      <body>${content}</body>
    </html>
  `.trim());

  // 添加目录文件
  oebps.file("nav.xhtml", `
    <?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head><title>目录</title></head>
      <body>
        <nav epub:type="toc" id="toc">
          <h1>目录</h1>
          <ol>
            <li><a href="chapter1.xhtml">${title}</a></li>
          </ol>
        </nav>
      </body>
    </html>
  `.trim());

  // Step 4: 创建 content.opf 文件，描述文件的结构和元数据
  oebps.file("content.opf", `
    <?xml version="1.0" encoding="UTF-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${title}</dc:title>
        <dc:language>zh</dc:language>
        <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
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

  // Step 5: 生成 EPUB 文件
  zip.generateAsync({ type: "blob" }).then(blob => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/[\\/:*?"<>|]/g, "_")}.epub`;
    link.click();
  });
}

extractContent();