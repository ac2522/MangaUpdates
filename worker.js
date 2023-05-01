const TIMEOUT = 3000;
const ANIME_URL = "https://zoro.to/";
const HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 Safari/605.1.15',
                'Accept-Language': 'en-US,en;q=0.9' };

self.addEventListener('message', async (e) => {
    const { url, ANIME_URL } = e.data;
    const result = await checkUrl(url[0], url[1]);
    self.postMessage(result);
});


async function checkUrl(url, chapter) {
    const anime = url.startsWith(ANIME_URL);
    if (!anime) {
        url += chapter;
    }

    try {
        const response = await fetch(url, { headers: HEADERS });
        //fetchWithTimeout(url)

        if (response.status === 200) {
            if (!anime) {
                return url;
            }
            console.log("zoro");
            const html = await response.text();
            self.postMessage({ html, chapter });
            return url;
        }
        throw new Error(`response status code: ${response.status} at url: ${url}`);
    } catch (error) {
        console.log(error);
        return "";
    }
}


async function fetchWithTimeout(url, options={}, timeout=3000) {

    const timeoutPromise = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
            clearTimeout(timeoutId);
            reject(new Error(`Request timed out after ${timeout}ms`));
        }, timeout);
    });
  
    try {
        const response = await Promise.race([
            fetch(url, options),
            timeoutPromise
        ]);
        return response;
    } catch (error) {
        throw error;
    }
}


