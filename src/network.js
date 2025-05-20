// src/network.js

const fs = require('fs');
const chalk = require('chalk');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { JsonRpcProvider } = require('ethers');
const randomUseragent = require('random-useragent');

const RPC_URL = 'https://testnet.dplabs-internal.com';
const CHAIN_ID = 688688;
const NETWORK_NAME = 'Pharos Testnet';

// Загрузка списка прокси
function loadProxies() {
    let proxies = [];
    try {
        if (fs.existsSync('proxies.txt')) {
            proxies = fs.readFileSync('proxies.txt', 'utf8')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
            // Убрано дублирование: не выводим ничего здесь!
        }
    } catch (e) {
        console.log(chalk.yellow('Не удалось загрузить proxies.txt. Работа без прокси.'));
    }
    return proxies;
}

// Получить случайный прокси
function getRandomProxy(proxies) {
    if (!proxies.length) return null;
    return proxies[Math.floor(Math.random() * proxies.length)];
}

// Создать агент прокси для axios, ethers, fetch
function getProxyAgent(proxy) {
    if (!proxy) return undefined;
    let url = proxy.trim();
    // Добавляем схему, если не указана
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
    return new HttpsProxyAgent(url);
}

// Создать провайдера с поддержкой прокси (ethers)
function setupProvider(proxy = null) {
    if (proxy) {
        console.log(chalk.cyan(`Используется прокси: ${proxy}`));
        const agent = getProxyAgent(proxy);
        return new JsonRpcProvider(RPC_URL, {
            chainId: CHAIN_ID,
            name: NETWORK_NAME,
        }, {
            fetchOptions: { agent },
            headers: { 'User-Agent': randomUseragent.getRandom() },
        });
    } else {
        console.log(chalk.cyan('Используется прямое подключение (без прокси)'));
        return new JsonRpcProvider(RPC_URL, {
            chainId: CHAIN_ID,
            name: NETWORK_NAME,
        });
    }
}

module.exports = {
    loadProxies,
    getRandomProxy,
    getProxyAgent,
    setupProvider,
    RPC_URL,
    CHAIN_ID,
    NETWORK_NAME
};
