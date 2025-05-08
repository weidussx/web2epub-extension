import Logger from './logger.js';

class ImageProcessor {
  static async processImages(content) {
    const images = content.querySelectorAll('img');
    const processedImages = new Map();

    for (const img of images) {
      try {
        const imageUrl = img.src;
        if (!imageUrl) continue;

        // 检查是否已经处理过这个图片
        if (processedImages.has(imageUrl)) {
          img.src = processedImages.get(imageUrl);
          continue;
        }

        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const blob = await response.blob();
        const fileName = this.generateImageFileName(imageUrl);
        
        // 将图片转换为base64
        const base64 = await this.blobToBase64(blob);
        processedImages.set(imageUrl, `data:${blob.type};base64,${base64}`);
        
        // 更新图片src
        img.src = processedImages.get(imageUrl);
        
        Logger.info(`Successfully processed image: ${fileName}`);
      } catch (error) {
        Logger.error(`Failed to process image: ${img.src}`, error);
        // 如果图片处理失败，移除图片
        img.remove();
      }
    }

    return processedImages;
  }

  static generateImageFileName(url) {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const extension = pathname.split('.').pop() || 'jpg';
    return `image_${Date.now()}.${extension}`;
  }

  static blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export default ImageProcessor; 