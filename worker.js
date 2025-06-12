// 图片压缩Web Worker
// 用于在后台线程处理图片压缩，避免阻塞主UI线程

// 监听来自主线程的消息
self.addEventListener('message', async (e) => {
    const { imageData, quality, mimeType, originalSize } = e.data;
    
    try {
        // imageData 现在是 ImageBitmap
        const imgBitmap = imageData;
        
        // 创建canvas
        const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
        const ctx = canvas.getContext('2d');
        
        // 在canvas上绘制ImageBitmap
        ctx.drawImage(imgBitmap, 0, 0);
        imgBitmap.close(); // 关闭ImageBitmap以释放资源
        
        // 压缩图片
        const blob = await canvas.convertToBlob({
            type: mimeType,
            quality: quality
        });
        
        // 计算压缩比率
        const compressedSize = blob.size;
        const ratio = ((1 - (compressedSize / originalSize)) * 100).toFixed(1);
        
        // 将压缩后的图片数据发送回主线程
        self.postMessage({
            success: true,
            blob: blob,
            width: canvas.width, // 使用canvas的宽高，因为imgBitmap已关闭
            height: canvas.height,
            size: compressedSize,
            ratio: ratio
        });
        
    } catch (error) {
        // 发送错误信息回主线程
        self.postMessage({
            success: false,
            error: error.message
        });
    }
});

// 通知主线程worker已准备就绪
self.postMessage({ status: 'ready' });