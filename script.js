document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const controlsSection = document.getElementById('controlsSection');
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const compressBtn = document.getElementById('compressBtn');
    const previewSection = document.getElementById('previewSection');
    const originalImage = document.getElementById('originalImage');
    const compressedImage = document.getElementById('compressedImage');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const originalDimensions = document.getElementById('originalDimensions');
    const compressedDimensions = document.getElementById('compressedDimensions');
    const compressionRatio = document.getElementById('compressionRatio');
    const downloadBtn = document.getElementById('downloadBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // 存储原始文件和压缩后的文件
    let originalFile = null;
    let compressedBlob = null;
    let originalImageObj = null;
    
    // 创建Web Worker实例
    let compressionWorker = null;
    
    // 初始化Web Worker
    function initWorker() {
        if (window.Worker) {
            compressionWorker = new Worker('worker.js');
            
            // 监听来自Worker的消息
            compressionWorker.addEventListener('message', (e) => {
                const data = e.data;
                
                // 检查Worker是否已准备就绪
                if (data.status === 'ready') {
                    console.log('压缩Worker已准备就绪');
                    return;
                }
                
                // 处理压缩结果
                if (data.success) {
                    // 存储压缩后的blob
                    compressedBlob = data.blob;
                    
                    // 创建URL并设置压缩后的图片
                    const compressedURL = URL.createObjectURL(data.blob);
                    compressedImage.src = compressedURL;
                    
                    // 显示压缩后的文件大小
                    compressedSize.textContent = formatFileSize(data.size);
                    
                    // 显示压缩后的图片尺寸
                    compressedDimensions.textContent = `${data.width} × ${data.height}`;
                    
                    // 显示压缩比率
                    compressionRatio.textContent = `节省了 ${data.ratio}%`;
                    
                    // 启用下载按钮
                    downloadBtn.disabled = false;
                    
                    // 滚动到压缩后的图片
                    setTimeout(() => {
                        compressedImage.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                } else {
                    // 显示错误信息
                    handleCompressionError(data.error || '压缩失败');
                }
                
                // 恢复压缩按钮状态
                resetCompressButton();
                
                // 隐藏加载动画
                loadingOverlay.style.display = 'none';
            });
            
            // 监听Worker错误
            compressionWorker.addEventListener('error', (error) => {
                console.error('Worker错误:', error);
                handleCompressionError('压缩过程中发生错误，请重试');
                resetCompressButton();
                loadingOverlay.style.display = 'none';
            });
        } else {
            console.warn('浏览器不支持Web Worker，将使用主线程压缩');
        }
    }

    // 初始化事件监听器
    function initEventListeners() {
        console.log('Initializing event listeners...');
        
        // 上传按钮点击事件
        uploadBtn.addEventListener('click', () => {
            console.log('Upload button clicked, triggering file input');
            fileInput.click();
        });

        // 文件选择事件
        console.log('Adding change event listener to fileInput:', fileInput);
        fileInput.addEventListener('change', handleFileSelect);
        console.log('File input change event listener added');

        // 拖放事件
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });

        // 点击上传区域也可以选择文件
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // 质量滑块事件
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = `${qualitySlider.value}%`;
        });

        // 压缩按钮点击事件
        compressBtn.addEventListener('click', compressImage);

        // 下载按钮点击事件
        downloadBtn.addEventListener('click', downloadCompressedImage);
    }

    // 处理文件选择
    function handleFileSelect(e) {
        console.log('handleFileSelect called, files:', e.target.files);
        console.log('Number of files selected:', e.target.files.length);
        if (e.target.files.length > 0) {
            console.log('Calling handleFiles with selected files');
            handleFiles(e.target.files);
        } else {
            console.log('No files selected');
        }
    }

    // 处理文件
    function handleFiles(files) {
        console.log('handleFiles called with:', files.length, 'files');
        const file = files[0]; // 目前只处理第一个文件
        
        // 检查文件类型
        if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
            alert('请上传 JPG 或 PNG 格式的图片！');
            return;
        }

        console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

        // 存储原始文件
        originalFile = file;

        // 显示控制区域
        console.log('Showing controls section');
        controlsSection.style.display = 'block';
        controlsSection.classList.add('fade-in');

        // 显示快速信息区域
        const quickInfoSection = document.getElementById('quickInfoSection');
        console.log('Quick info section element:', quickInfoSection);
        if (quickInfoSection) {
            quickInfoSection.style.display = 'block';
            console.log('Quick info section displayed');
            
            const quickOriginalSize = document.getElementById('quickOriginalSize');
            if (quickOriginalSize) {
                quickOriginalSize.textContent = formatFileSize(file.size);
                console.log('Original size set to:', formatFileSize(file.size));
            } else {
                console.error('quickOriginalSize element not found');
            }
            
            const quickCompressedContainer = document.getElementById('quickCompressedInfoContainer');
            if (quickCompressedContainer) {
                quickCompressedContainer.style.display = 'none';
            }
            
            const downloadBtnQuick = document.getElementById('downloadBtnQuick');
            if (downloadBtnQuick) {
                downloadBtnQuick.disabled = true;
            }
        } else {
            console.error('quickInfoSection element not found');
        }

        // 加载并显示原始图片
        loadOriginalImage(file);
        
        // 滚动到压缩控制区域
        setTimeout(() => {
            controlsSection.scrollIntoView({ behavior: 'smooth' });
            // 添加闪烁效果提示用户点击压缩按钮
            compressBtn.classList.add('highlight-btn');
            setTimeout(() => {
                compressBtn.classList.remove('highlight-btn');
            }, 2000);
        }, 500);
    }

    // 加载原始图片
    function loadOriginalImage(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            // 创建图片对象以获取尺寸
            originalImageObj = new Image();
            originalImageObj.onload = () => {
                // 显示原始图片尺寸
                originalDimensions.textContent = `${originalImageObj.width} × ${originalImageObj.height}`;
            };
            originalImageObj.src = e.target.result;
            
            // 设置原始图片预览
            originalImage.src = e.target.result;
            
            // 显示原始文件大小
            originalSize.textContent = formatFileSize(file.size);
            
            // 显示预览区域
            previewSection.style.display = 'block';
            previewSection.classList.add('slide-up');
        };
        
        reader.readAsDataURL(file);
    }

    // 压缩图片
    async function compressImage() { // 修改为异步函数
        if (!originalFile || !originalImageObj) { // 确保originalImageObj存在
            alert('请先上传图片！');
            return;
        }
        
        // 禁用压缩按钮，防止重复点击
        compressBtn.disabled = true;
        compressBtn.textContent = '正在压缩...';
        
        // 显示加载动画
        loadingOverlay.style.display = 'flex';
        
        // 获取压缩质量
        const quality = parseInt(qualitySlider.value) / 100;
        
        try {
            // 检查是否支持Web Worker
            if (compressionWorker) {
                console.log('使用Web Worker进行压缩');
                
                // 从originalImageObj创建ImageBitmap
                const imageBitmap = await createImageBitmap(originalImageObj);
                
                // 将ImageBitmap发送给Worker处理
                try {
                    compressionWorker.postMessage({
                        imageData: imageBitmap, // 发送ImageBitmap
                        quality: quality,
                        mimeType: originalFile.type,
                        originalSize: originalFile.size
                    }, [imageBitmap]); // 将imageBitmap添加到可转移对象列表
                } catch (error) {
                    handleCompressionError('发送数据到Worker失败: ' + error.message);
                }
            } else {
                console.log('浏览器不支持Web Worker，使用主线程压缩');
                // 回退到主线程压缩
                compressImageInMainThread(quality);
            }
        } catch (error) {
            handleCompressionError('压缩过程中发生错误: ' + error.message);
        }
    }
    
    // 在主线程中压缩图片（作为回退方案）
    function compressImageInMainThread(quality) {
        // 使用setTimeout让UI有时间更新
        setTimeout(() => {
            try {
                // 创建canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    handleCompressionError('无法创建Canvas上下文');
                    return;
                }
                
                // 设置canvas尺寸为原图尺寸
                canvas.width = originalImageObj.width;
                canvas.height = originalImageObj.height;
                
                // 在canvas上绘制图片
                try {
                    ctx.drawImage(originalImageObj, 0, 0);
                } catch (error) {
                    handleCompressionError('绘制图片失败: ' + error.message);
                    return;
                }
                
                // 获取压缩后的图片数据
                const mimeType = originalFile.type;
                canvas.toBlob((blob) => {
                    if (!blob) {
                        handleCompressionError('无法创建压缩后的图像数据');
                        return;
                    }
                    
                    try {
                        // 存储压缩后的blob
                    compressedBlob = blob;
                    
                    // 创建URL并设置压缩后的图片
                    const compressedURL = URL.createObjectURL(blob);
                    compressedImage.src = compressedURL;
                    
                    // 显示压缩后的文件大小
                    compressedSize.textContent = formatFileSize(blob.size);
                    document.getElementById('quickCompressedSize').textContent = formatFileSize(blob.size);
                    
                    // 显示压缩后的图片尺寸
                    compressedDimensions.textContent = `${canvas.width} × ${canvas.height}`;
                    
                    // 计算并显示压缩比率
                    const ratio = ((1 - (blob.size / originalFile.size)) * 100).toFixed(1);
                    compressionRatio.textContent = `节省了 ${ratio}%`;
                    
                    // 启用下载按钮
                    downloadBtn.disabled = false;
                    document.getElementById('downloadBtnQuick').disabled = false;
                    document.getElementById('quickCompressedInfoContainer').style.display = 'block';
                        
                        // 滚动到压缩后的图片
                        setTimeout(() => {
                            compressedImage.scrollIntoView({ behavior: 'smooth' });
                        }, 300);
                    } catch (error) {
                        handleCompressionError('处理压缩结果失败: ' + error.message);
                        return;
                    }
                    
                    // 恢复压缩按钮状态
                    resetCompressButton();
                    
                    // 隐藏加载动画
                    loadingOverlay.style.display = 'none';
                }, mimeType, quality);
            } catch (error) {
                handleCompressionError('主线程压缩失败: ' + error.message);
            }
        }, 100);
    }

    // 下载压缩后的图片
    function downloadCompressedImage() {
        if (!compressedBlob) return;
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = URL.createObjectURL(compressedBlob);
        
        // 设置文件名
        const originalName = originalFile.name;
        const extension = originalName.slice(originalName.lastIndexOf('.'));
        const baseName = originalName.slice(0, originalName.lastIndexOf('.'));
        link.download = `${baseName}-compressed${extension}`;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 处理压缩过程中的错误
    function handleCompressionError(errorMessage) {
        console.error('压缩错误:', errorMessage);
        alert(`压缩失败: ${errorMessage}\n请尝试使用较小的图片或降低压缩质量。`);
        
        // 重置压缩按钮状态
        resetCompressButton();
        
        // 隐藏加载动画
        loadingOverlay.style.display = 'none';
    }
    
    // 重置压缩按钮状态
    function resetCompressButton() {
        compressBtn.disabled = false;
        compressBtn.textContent = '开始压缩';
    }

    // 初始化应用
    console.log('Initializing application...');
    console.log('DOM elements check:');
    console.log('uploadArea:', uploadArea);
    console.log('fileInput:', fileInput);
    console.log('uploadBtn:', uploadBtn);
    console.log('quickInfoSection:', document.getElementById('quickInfoSection'));
    console.log('quickOriginalSize:', document.getElementById('quickOriginalSize'));
    
    initEventListeners();
    initWorker();
    
    // 初始化快速下载按钮事件
    const downloadBtnQuick = document.getElementById('downloadBtnQuick');
    if (downloadBtnQuick) {
        downloadBtnQuick.addEventListener('click', downloadCompressedImage);
        console.log('Quick download button event listener added');
    } else {
        console.error('downloadBtnQuick element not found during initialization');
    }
});