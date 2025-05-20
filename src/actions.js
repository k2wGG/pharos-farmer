// src/actions.js

const chalk = require('chalk');
const { setupProvider, getRandomProxy, getProxyAgent, RPC_URL } = require('./network');
const { ethers } = require('ethers');
const axios = require('axios');
const delay = ms => new Promise(res => setTimeout(res, ms));
const randomUseragent = require('random-useragent');

const contractAddress = '0x1a4de519154ae51200b0ad7c90f7fac75547888a';
const tokens = {
    USDC: '0xad902cf99c2de2f1ba5ec4d642fd7e49cae9ee37',
    WPHRS: '0x76aaada469d23216be5f7c596fa25f282ff9b364',
};
const tokenDecimals = {
    WPHRS: 18,
    USDC: 6,
};
const contractAbi = [
    'function multicall(uint256 collectionAndSelfcalls, bytes[] data) public',
];
const erc20Abi = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) public returns (bool)',
];

// ------------------- Действия -----------------------

function prettyHeader({ action, idx, total, address, proxy }) {
    console.log(
        chalk.hex('#00d2ff')('═'.repeat(50)),
        '\n' +
        chalk.bold.hex('#38ef7d')(`[${action}] [${idx + 1}/${total}]`) +
        chalk.cyan(` Аккаунт: `) + chalk.yellow(address) +
        chalk.cyan(' | Прокси: ') + chalk.yellow(proxy || 'Без прокси')
    );
}

async function dailyCheckIn(wallets, proxies, config) {
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const proxy = getRandomProxy(proxies);
        prettyHeader({ action: 'Check-in', idx: i, total: wallets.length, address: wallet.address, proxy });
        try {
            await performCheckIn(wallet, proxy);
            await randomDelay();
        } catch (e) {
            console.log(chalk.red(`[Check-in] Ошибка: ${e.message}`));
        }
    }
}

async function claimFaucet(wallets, proxies, config) {
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const proxy = getRandomProxy(proxies);
        prettyHeader({ action: 'Faucet', idx: i, total: wallets.length, address: wallet.address, proxy });
        try {
            await claimFaucetInternal(wallet, proxy);
            await randomDelay();
        } catch (e) {
            console.log(chalk.red(`[Faucet] Ошибка: ${e.message}`));
        }
    }
}

async function makeSwap(wallets, proxies, config) {
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const proxy = getRandomProxy(proxies);
        const provider = setupProvider(proxy);
        const signer = wallet.connect(provider);
        prettyHeader({ action: 'Swap', idx: i, total: wallets.length, address: wallet.address, proxy });
        let actions = [];
        for (let j = 0; j < config.swapCount; j++) {
            actions.push(() => performSwap(signer, provider, j));
        }
        if (config.randomizeOrder) actions = shuffleArray(actions);
        for (const act of actions) {
            await act();
            await randomDelay();
        }
    }
}

async function transferPHRS(wallets, proxies, config) {
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const proxy = getRandomProxy(proxies);
        const provider = setupProvider(proxy);
        const signer = wallet.connect(provider);
        prettyHeader({ action: 'Transfer', idx: i, total: wallets.length, address: wallet.address, proxy });
        let actions = [];
        for (let j = 0; j < config.transferCount; j++) {
            actions.push(() => transferPHRSInternal(signer, provider, j));
        }
        if (config.randomizeOrder) actions = shuffleArray(actions);
        for (const act of actions) {
            await act();
            await randomDelay();
        }
    }
}

// ------------------- Реализация действий -------------------

async function performCheckIn(wallet, proxy = null) {
    const message = "pharos";
    const signature = await wallet.signMessage(message);
    const loginUrl = `https://api.pharosnetwork.xyz/user/login?address=${wallet.address}&signature=${signature}&invite_code=S6NGMzXSCDBxhnwo`;
    const headers = defaultHeaders();
    const axiosConfig = {
        method: 'post',
        url: loginUrl,
        headers,
        httpsAgent: getProxyAgent(proxy),
    };
    const loginResponse = await axios(axiosConfig);
    const jwt = loginResponse?.data?.data?.jwt;
    if (!jwt) {
        console.log(chalk.red('Check-in: не удалось получить JWT!'));
        return false;
    }
    const checkInUrl = `https://api.pharosnetwork.xyz/sign/in?address=${wallet.address}`;
    const checkInHeaders = { ...headers, authorization: `Bearer ${jwt}` };
    const checkInResponse = await axios({
        method: 'post',
        url: checkInUrl,
        headers: checkInHeaders,
        httpsAgent: getProxyAgent(proxy),
    });
    if (checkInResponse.data.code === 0) {
        console.log(chalk.green('Check-in успешно выполнен!'));
        return true;
    } else {
        console.log(chalk.yellow('Check-in уже был сегодня или ошибка.'));
        return false;
    }
}

async function claimFaucetInternal(wallet, proxy = null) {
    const message = "pharos";
    const signature = await wallet.signMessage(message);
    const loginUrl = `https://api.pharosnetwork.xyz/user/login?address=${wallet.address}&signature=${signature}&invite_code=S6NGMzXSCDBxhnwo`;
    const headers = defaultHeaders();
    const axiosConfig = {
        method: 'post',
        url: loginUrl,
        headers,
        httpsAgent: getProxyAgent(proxy),
    };
    const loginResponse = await axios(axiosConfig);
    const jwt = loginResponse?.data?.data?.jwt;
    if (!jwt) {
        console.log(chalk.red('Faucet: не удалось получить JWT!'));
        return false;
    }
    const statusUrl = `https://api.pharosnetwork.xyz/faucet/status?address=${wallet.address}`;
    const statusHeaders = { ...headers, authorization: `Bearer ${jwt}` };
    const statusResponse = await axios({
        method: 'get',
        url: statusUrl,
        headers: statusHeaders,
        httpsAgent: getProxyAgent(proxy),
    });
    if (!statusResponse?.data?.data?.is_able_to_faucet) {
        console.log(chalk.yellow('Фаусет недоступен (ещё не прошло 24ч).'));
        return false;
    }
    const claimUrl = `https://api.pharosnetwork.xyz/faucet/daily?address=${wallet.address}`;
    const claimResponse = await axios({
        method: 'post',
        url: claimUrl,
        headers: statusHeaders,
        httpsAgent: getProxyAgent(proxy),
    });
    if (claimResponse.data.code === 0) {
        console.log(chalk.green('Фаусет успешно получен!'));
        return true;
    } else {
        console.log(chalk.yellow('Ошибка получения фаусета.'));
        return false;
    }
}

async function performSwap(wallet, provider, index) {
    try {
        const pairs = [
            { from: 'WPHRS', to: 'USDC' },
            { from: 'USDC', to: 'WPHRS' },
        ];
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const amount = pair.from === 'WPHRS' ? 0.001 : 0.1;
        const decimals = tokenDecimals[pair.from];
        const tokenContract = new ethers.Contract(tokens[pair.from], erc20Abi, wallet);
        const balance = await tokenContract.balanceOf(wallet.address);
        const required = ethers.parseUnits(amount.toString(), decimals);
        if (balance < required) {
            console.log(chalk.yellow(`[Swap ${index + 1}] Недостаточно средств для ${pair.from}: ${ethers.formatUnits(balance, decimals)} < ${amount}`));
            return;
        }
        const allowance = await tokenContract.allowance(wallet.address, contractAddress);
        if (allowance < required) {
            const approveTx = await tokenContract.approve(contractAddress, ethers.MaxUint256);
            await approveTx.wait();
            console.log(chalk.green('Апрув выполнен!'));
        }
        const contract = new ethers.Contract(contractAddress, contractAbi, wallet);
        const multicallData = ['0x'];
        const gasLimit = 219249;
        const tx = await contract.multicall(
            Math.floor(Date.now() / 1000),
            multicallData,
            {
                gasLimit,
                gasPrice: 0,
            }
        );
        await tx.wait();
        console.log(chalk.green(`[Swap ${index + 1}] Swap выполнен!`));
    } catch (e) {
        console.log(chalk.red(`[Swap ${index + 1}] Ошибка: ${e.message}`));
    }
}

async function transferPHRSInternal(wallet, provider, index) {
    try {
        const amount = 0.000001;
        const randomWallet = ethers.Wallet.createRandom();
        const toAddress = randomWallet.address;
        const balance = await provider.getBalance(wallet.address);
        const required = ethers.parseEther(amount.toString());
        if (balance < required) {
            console.log(chalk.yellow(`[Transfer ${index + 1}] Недостаточно PHRS: ${ethers.formatEther(balance)} < ${amount}`));
            return;
        }
        const tx = await wallet.sendTransaction({
            to: toAddress,
            value: required,
            gasLimit: 21000,
            gasPrice: 0,
        });
        await tx.wait();
        console.log(chalk.green(`[Transfer ${index + 1}] Перевод выполнен на ${toAddress}`));
    } catch (e) {
        console.log(chalk.red(`[Transfer ${index + 1}] Ошибка: ${e.message}`));
    }
}

// ----------------- Вспомогательные ------------------

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function randomDelay() {
    const ms = 2000 + Math.floor(Math.random() * 6000);
    await delay(ms);
}

function defaultHeaders() {
    return {
        accept: "application/json, text/plain, */*",
        "accept-language": "ru,en;q=0.9",
        "authorization": "Bearer null",
        "User-Agent": randomUseragent.getRandom(),
        Referer: "https://testnet.pharosnetwork.xyz/",
    };
}

module.exports = {
    dailyCheckIn,
    claimFaucet,
    makeSwap,
    transferPHRS
};
