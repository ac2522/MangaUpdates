const ANIME_URL = "https://zoro.to/";
const DATA = "data.json";



initializeStorage();


function initializeStorage() {
    chrome.storage.sync.get(["data"], async (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error fetching data from storage:", chrome.runtime.lastError);
            return;
        }

        if (result.data === undefined) {
            fetchDefaultData()
                .then((defaultData) => {
                    setData(defaultData);
                })
                .catch((error) => {
                    console.error("Error fetching default data:", error);
                });
        }
    });
}

async function fetchDefaultData() {
    const response = await fetch(DATA);
    const data = await response.json();
    return data;
}


async function urlClean(url) {
    if (url.startsWith(ANIME_URL)) {
        url = url.replace(/watch\/|(\?.*)/g, "");
        let chapter = await updateZoro();
        if (chapter instanceof Error) {
            console.error("Error in updateZoro:", chapter);
            return;
        }
        return [url, chapter];
    } else {
        url = url.replace("#/next/", "");
        url = url.replace(/^(https:\/\/flamescans\.org\/\d+)-/, "https:\/\/flamescans\.org\/");
        url = url.replace(/\/$/, "");
        return url.match(/^(.*-)(\d+)$/)?.slice(1) ?? [url, ""];
    }
}


async function updateCurrentChapter(url) {
    let chapter;
    [url, chapter] = await urlClean(url);
    chapter++;

    chrome.storage.sync.get(["data"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error fetching data from storage:", chrome.runtime.lastError);
            return;
        }

        let data = result.data;
    
        if (data.hasOwnProperty(url) && data[url] === chapter) {
            delete data[url];
            chrome.runtime.sendMessage({action: "updateCurrentResponse", response: "delete"});
        } else {
            data[url] = chapter;
            chrome.runtime.sendMessage({action: "updateCurrentResponse", response: "added"});
        }
        setData(data);
    });
}

async function checkPage(url) {
    let chapter;
    [url, chapter] = await urlClean(url);
    chapter++;

    chrome.storage.sync.get(["data"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error fetching data from storage:", chrome.runtime.lastError);
            return;
        }

        let data = result.data;
    
        if (data.hasOwnProperty(url) && data[url] === chapter) {
            chrome.runtime.sendMessage({action: "updateCurrentResponse", response: "added"});
        } else {
            chrome.runtime.sendMessage({action: "updateCurrentResponse", response: "delete"});
        }
    });
}



async function deleteUrl(url) {
    chrome.storage.sync.get(["data"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error fetching data from storage:", chrome.runtime.lastError);
            return;
        }

        let data = result.data;

        if (data.hasOwnProperty(url)) {
            delete data[url];
        }
        setData(data);
    });
}

async function setData(data) {
    chrome.storage.sync.set({ data }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error setting updated data to storage:", chrome.runtime.lastError);
        }
    });
}



function updateZoro() {
    return new Promise((resolve) => {
        // Listener for receiving messages from the content script
        function messageListener(request, sender, sendResponse) {
            chrome.runtime.onMessage.removeListener(messageListener); // Remove the listener after receiving the message
            if (request.episodeNumber) {
                resolve(request.episodeNumber);
            } else if (request.error) {
                resolve(new Error(request.error));
            }
        }

        chrome.runtime.onMessage.addListener(messageListener);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.executeScript(tabs[0].id, { file: "zoro.js", allFrames: false }, () => {
            });
        });
    });
}



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkUpdates") {
        checkForNewChapters();
    } else if (request.action === "updateCurrent") {
        updateCurrentChapter(request.url);
    } else if (request.action === "delete") {
        deleteUrl(request.text);
    } else if (request.action === "print") {
        printChapters();
    } else if (request.action === "check") {
        checkPage(request.url);
    }
});


async function checkForNewChapters() {
    getData().then(async(urls) => {
        extract(urls);
    });
}


async function printChapters() {
    getData().then(async(urls) => {
        for (const url in urls) {
            console.log(url + " " + urls[url]);
        }
    });
}


function getData() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(["data"], (result) => {
            if (chrome.runtime.lastError) {
                console.error("Error fetching data from storage:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(result.data);
            }
        });
    });
}



async function extract(urls, threads = 10) {
    const queue = [];
    const workerPromises = [];
    const workers = [];
    let processedCount = 0;
  
    for (let url in urls) {
        queue.push([url, urls[url]]);
    }

    for (let i = 0; i < threads; i++) {
        const worker = new Worker("worker.js");
        const workerPromise = new Promise((resolve) => {
            worker.addEventListener("message", createWorkerListener(i, worker, resolve));
        });
        workers.push(worker);
        workerPromises.push(workerPromise);
    }
  
    workers.forEach((worker) => {
        if (queue.length > 0) {
            worker.postMessage({ url: queue.shift() });
        }
    });
  
    await Promise.all(workerPromises);


    function createWorkerListener(workerIndex, worker, resolve) {
        return async function (e) {
            processedCount++;
    
            if (e.data.html && await checkZoro(e.data.html, e.data.chapter)) {
                if (e.data.length) {
                    window.open(e.data, '_blank');
                }
            } else if (e.data.length > 0) {
                window.open(e.data, '_blank');
            }
    
            if (queue.length > 0) {
                worker.postMessage({ url: queue.shift() });
            } else {
                //console.log("Worker", workerIndex, "finished processing its share of URLs");
                resolve();
            }
        };
    }
}


async function checkZoro(html, episodeNumber) {
    const soup = new DOMParser().parseFromString(html, 'text/html');
    const episode = soup.querySelector('.film-stats').innerHTML.match(/Ep (\d+)/);
    return episodeNumber <= parseInt(episode[1], 10);
}

