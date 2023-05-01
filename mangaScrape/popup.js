document.getElementById("checkUpdates").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "checkUpdates" });
});

document.getElementById("updateCurrent").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let url = tabs[0].url;
        chrome.runtime.sendMessage({ action: "updateCurrent", url });
    });
});


document.getElementById("printChapters").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "print" });
}, { passive: true });

const textBox = document.getElementById("input");

document.getElementById("send").addEventListener('click', () => {
    const text = textBox.value.replace(/\s+/g, '');
    chrome.runtime.sendMessage({ action: "delete", text });
    
    textBox.value = '';
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateCurrentResponse") {

        const tick = document.querySelector(".tick");
        const cross = document.querySelector(".cross");
        
        
        if (tick) tick.remove();
        if (cross) cross.remove();

        if (request.response === 'delete') {
            document.querySelector(".circle").innerHTML = '<i class="cross">&#x2716;</i>';
        } else if (request.response === 'added') {
            document.querySelector(".circle").innerHTML = '<i class="tick">&#x2714;</i>';
        }
    }
});


window.onload = function() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let url = tabs[0].url;
        chrome.runtime.sendMessage({ action: "check", url });
    });
};
