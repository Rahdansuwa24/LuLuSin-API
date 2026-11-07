// In-memory cache untuk mencegah lonjakan RAM (OOM) akibat peluncuran browser berulang kali
let cachedCountdown = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // Cache berlaku 24 jam

const DEFAULT_TITLE = 'Countdown Menuju UTBK-SNBT';
const URL = 'https://snbt.utbkcak.com/';

/**
 * Hitung perkiraan hari tersisa menuju pelaksanaan UTBK-SNBT
 * @param {string} [targetDateStr] Format YYYY-MM-DD
 * @returns {number}
 */
function calculateDaysToSNBT(targetDateStr) {
    const now = new Date();
    const currentYear = now.getFullYear();
    // Default jadwal UTBK gelombang 1 umumnya awal Mei
    let target = targetDateStr ? new Date(targetDateStr) : new Date(currentYear, 4, 2);
    if (target < now) {
        target = new Date(currentYear + 1, 4, 2);
    }
    const diffTime = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

async function countdown() {
    const now = Date.now();
    if (cachedCountdown && (now - lastFetchTime < CACHE_DURATION_MS)) {
        return cachedCountdown;
    }

    const calculatedDays = calculateDaysToSNBT(process.env.SNBT_TARGET_DATE);

    // Jika mode hemat container diaktifkan (misal container 512MB di cloud), gunakan kalkulasi instan
    if (process.env.DISABLE_PUPPETEER_SCRAPER === 'true') {
        cachedCountdown = { title: DEFAULT_TITLE, days: calculatedDays };
        lastFetchTime = now;
        return cachedCountdown;
    }

    try {
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        });

        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36');
            await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForSelector('.countdown-items .ctw-label', { timeout: 5000 });

            const title = await page.$eval('h1.elementor-heading-title', el => el.innerText.trim()).catch(() => DEFAULT_TITLE);

            const days = await page.$$eval('.countdown-items', items => {
                for (const it of items) {
                    const label = it.querySelector('.ctw-label')?.innerText.trim().toLowerCase();
                    if (label === 'hari') {
                        const digit = it.querySelector('.ctw-digits')?.innerText.trim();
                        return parseInt(digit.replace(/\D/g, ''), 10);
                    }
                }
                return null;
            }).catch(() => null);

            cachedCountdown = {
                title: title || DEFAULT_TITLE,
                days: (days !== null && !isNaN(days)) ? days : calculatedDays
            };
            lastFetchTime = now;
            return cachedCountdown;
        } finally {
            await browser.close();
        }
    } catch (err) {
        console.warn('Scraper fallback digunakan:', err.message);
        cachedCountdown = { title: DEFAULT_TITLE, days: calculatedDays };
        lastFetchTime = now;
        return cachedCountdown;
    }
}

module.exports = { countdown };
