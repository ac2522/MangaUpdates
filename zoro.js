try {
    const serverNotice = document.querySelector(".server-notice");
    const episodeNumber = parseInt(serverNotice.querySelector("b")?.textContent?.match(/Episode (\d+)/)?.[1]);
    chrome.runtime.sendMessage({episodeNumber: episodeNumber});
} catch (error) {
    chrome.runtime.sendMessage({error: error.message});
}