// 延迟函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 检查是否到达页面底部
function isBottomOfPage() {
    return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight;
}

// 滚动到页面底部
async function scrollToBottom() {
    const scrollStep = 800; // 每次滚动的像素
    const scrollInterval = 500; // 滚动间隔时间（毫秒）
    const maxScrollAttempts = 50; // 最大滚动次数
    let scrollAttempts = 0;
    let lastScrollHeight = 0;

    while (scrollAttempts < maxScrollAttempts) {
        const currentScrollHeight = document.documentElement.scrollHeight;
        
        // 如果连续两次滚动高度相同，说明已经到达底部
        if (currentScrollHeight === lastScrollHeight) {
            break;
        }
        
        window.scrollBy(0, scrollStep);
        lastScrollHeight = currentScrollHeight;
        scrollAttempts++;
        
        // 等待内容加载
        await sleep(scrollInterval);
    }
    
    // 滚动回顶部
    window.scrollTo(0, 0);
}

// 获取视频链接的函数
async function getVideoLinks(minLikes = 0) {
    // 先滚动到底部以加载所有内容
    await scrollToBottom();
    
    // 存储所有视频信息的数组
    const videoInfo = [];
    
    // 获取所有视频卡片元素
    const videoCards = document.querySelectorAll('a.hY8lWHgA._4furHfW');
    
    if (videoCards.length === 0) {
        console.log('未找到视频卡片，可能不在搜索页面');
        return [];
    }
    
    videoCards.forEach(card => {
        try {
            // 获取视频标题
            const titleElement = card.querySelector('.VDYK8Xd7');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            // 获取作者信息
            const authorElement = card.querySelector('.MZNczJmS');
            const author = authorElement ? authorElement.textContent.trim() : '';
            
            // 获取视频链接
            const link = card.href;
            
            // 获取时长
            const durationElement = card.querySelector('.ckopQfVu');
            const duration = durationElement ? durationElement.textContent.trim() : '';

            // 获取点赞数
            const likesElement = card.querySelector('.cIiU4Muu');
            const likesText = likesElement ? likesElement.textContent.trim() : '0';
            // 将点赞数转换为数字（处理万、亿等单位）
            const likes = parseLikesCount(likesText);
            
            // 只有当点赞数大于最小点赞数时才添加到结果中
            if (link && likes >= minLikes) {
                videoInfo.push({
                    title,
                    author,
                    link,
                    duration,
                    likes: likesText
                });
            }
        } catch (error) {
            console.error('处理视频卡片时出错:', error);
        }
    });
    
    console.log('找到符合条件的视频数量:', videoInfo.length);
    return videoInfo;
}

// 解析点赞数文本
function parseLikesCount(likesText) {
    if (!likesText) return 0;
    
    const num = parseFloat(likesText);
    if (likesText.includes('万')) {
        return num * 10000;
    } else if (likesText.includes('亿')) {
        return num * 100000000;
    }
    return num;
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getLinks') {
        // 使用异步函数处理
        (async () => {
            try {
                setStatus('正在滚动加载页面...');
                const links = await getVideoLinks(request.minLikes || 0);
                if (links.length > 0) {
                    sendResponse({links: links});
                } else {
                    sendResponse({error: '未找到符合条件的视频链接'});
                }
            } catch (error) {
                console.error('获取链接时出错:', error);
                sendResponse({error: '获取链接失败: ' + error.message});
            }
        })();
        return true; // 保持消息通道开放
    }
});

// 设置状态的辅助函数
function setStatus(message) {
    chrome.runtime.sendMessage({
        action: 'updateStatus',
        message: message
    });
} 