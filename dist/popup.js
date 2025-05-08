import CONFIG from '../config/config.js';
import Logger from '../utils/logger.js';
import EpubGenerator from './EpubGenerator.js';

class PopupManager {
  constructor() {
    this.epubGenerator = new EpubGenerator();
    this.initializeUI();
  }

  initializeUI() {
    this.previewElement = document.getElementById('preview');
    this.saveButton = document.getElementById('save');
    this.progressElement = document.getElementById('progress');
    this.errorElement = document.getElementById('error');
    
    this.saveButton.addEventListener('click', () => this.handleSave());
  }

  showLoading(message = CONFIG.ui.loadingText) {
    this.progressElement.textContent = message;
    this.progressElement.style.display = 'block';
    this.errorElement.style.display = 'none';
    this.saveButton.disabled = true;
  }

  hideLoading() {
    this.progressElement.style.display = 'none';
    this.saveButton.disabled = false;
  }

  showError(message) {
    this.errorElement.textContent = message;
    this.errorElement.style.display = 'block';
    this.hideLoading();
  }

  async extractContent() {
    try {
      this.showLoading('正在获取页面内容...');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error(CONFIG.ui.errorMessages.noTab);
      }

      // 注入readability.js
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['readability.js']
      });

      // 提取文章内容
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const clone = document.cloneNode(true);
          const article = new Readability(clone).parse();
          return article;
        }
      });

      const article = results[0].result;
      if (!article) {
        throw new Error(CONFIG.ui.errorMessages.noContent);
      }

      this.previewElement.innerHTML = `<h2>${article.title}</h2>${article.content}`;
      this.article = article;
      
      this.hideLoading();
      Logger.info('内容提取成功');
    } catch (error) {
      Logger.error('内容提取失败', error);
      this.showError(error.message);
    }
  }

  async handleSave() {
    if (!this.article) {
      this.showError('没有可保存的内容');
      return;
    }

    try {
      this.showLoading('正在生成EPUB文件...');
      
      const blob = await this.epubGenerator.generate(
        this.article.title || CONFIG.epub.defaultTitle,
        this.article.content
      );

      // 下载文件
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${this.article.title.replace(/[\\/:*?"<>|]/g, '_')}.epub`;
      link.click();

      this.hideLoading();
      Logger.info('文件保存成功');
    } catch (error) {
      Logger.error('文件保存失败', error);
      this.showError(error.message);
    }
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const popupManager = new PopupManager();
  popupManager.extractContent();
}); 