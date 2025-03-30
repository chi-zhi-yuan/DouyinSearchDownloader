// 存储获取到的视频链接
let videoLinks = [];

// 在文件开头添加消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStatus') {
        setStatus(request.message);
    }
});

// 设置状态显示的辅助函数
function setStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = isError ? 'error' : 'success';
}

// 获取链接按钮点击事件
document.getElementById('getLinks').addEventListener('click', async () => {
    setStatus('正在获取链接...');
    
    try {
        // 获取当前标签页
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tab.url.includes('douyin.com')) {
            setStatus('请在抖音网站使用此插件', true);
            return;
        }

        // 获取最小点赞数
        const minLikes = parseInt(document.getElementById('minLikes').value) || 0;

        // 确保content script已注入
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        } catch (e) {
            console.log('Content script 已经存在');
        }
        
        // 向content script发送消息
        chrome.tabs.sendMessage(tab.id, {
            action: 'getLinks',
            minLikes: minLikes
        }, response => {
            if (chrome.runtime.lastError) {
                setStatus('获取链接失败: ' + chrome.runtime.lastError.message, true);
                return;
            }
            
            if (response.error) {
                setStatus(response.error, true);
                return;
            }
            
            if (response.links && response.links.length > 0) {
                videoLinks = response.links;
                setStatus(`成功获取 ${videoLinks.length} 个视频链接`);
            } else {
                setStatus('未找到符合条件的视频链接', true);
            }
        });
    } catch (error) {
        setStatus('获取链接失败: ' + error.message, true);
    }
});

// 导出链接按钮点击事件
document.getElementById('exportLinks').addEventListener('click', () => {
    if (videoLinks.length === 0) {
        setStatus('没有可导出的链接', true);
        return;
    }
    
    // 格式化链接信息
    const content = videoLinks.map(info => 
        `标题：${info.title}\n作者：${info.author}\n时长：${info.duration}\n点赞：${info.likes}\n链接：${info.link}\n\n`
    ).join('-------------------\n');
    
    // 创建Blob对象
    const blob = new Blob([content], {type: 'text/plain'});
    
    // 下载文件
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
        url: url,
        filename: '抖音视频链接.txt'
    });
    
    setStatus('导出成功！');
}); 