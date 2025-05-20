// src/index.js

require('dotenv').config();
const inquirer = require('inquirer');
const chalk = require('chalk');
const { loadWallets } = require('./wallet');
const { loadProxies } = require('./network');
const actions = require('./actions');
const { showBanner, showWalletsAndProxies, showSettings, changeSettings } = require('./ui');
const fs = require('fs');

// Глобальные настройки (читаются из config.json)
function loadConfig() {
    try {
        const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
        return config;
    } catch {
        return {
            swapCount: 10,
            transferCount: 10,
            cooldownMinutes: 30,
            randomizeOrder: true
        };
    }
}
function saveConfig(config) {
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf8');
}

async function mainMenu() {
    while (true) {
        // Загружаем кошельки и прокси (чтобы показывать актуально каждый раз)
        const wallets = loadWallets();
        const proxies = loadProxies();

        showBanner();
        showWalletsAndProxies(wallets, proxies);

        // Параметры программы
        let config = loadConfig();

        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: chalk.cyan('Выберите действие:'),
                choices: [
                    { name: '1. Ежедневный check-in', value: 'checkin' },
                    { name: '2. Кран (получить PHRS)', value: 'faucet' },
                    { name: '3. Swap токенов', value: 'swap' },
                    { name: '4. Перевод PHRS', value: 'transfer' },
                    { name: '5. Настройки программы', value: 'settings' },
                    { name: '6. Просмотреть параметры', value: 'viewSettings' },
                    { name: '7. Выход', value: 'exit' },
                ]
            }
        ]);

        if (answer.action === 'exit') {
            console.log(chalk.green('\nДо встречи!\n'));
            process.exit(0);
        }

        if (!wallets.length) {
            console.log(chalk.red('\nНе найдено ни одного приватного ключа в .env!\n'));
            continue;
        }

        switch (answer.action) {
            case 'checkin':
                await actions.dailyCheckIn(wallets, proxies, config);
                break;
            case 'faucet':
                await actions.claimFaucet(wallets, proxies, config);
                break;
            case 'swap':
                await actions.makeSwap(wallets, proxies, config);
                break;
            case 'transfer':
                await actions.transferPHRS(wallets, proxies, config);
                break;
            case 'settings':
                config = await changeSettings(config, saveConfig);
                break;
            case 'viewSettings':
                showSettings(config);
                break;
        }
    }
}

mainMenu().catch(e => {
    console.error(chalk.red('Ошибка основного меню: '), e);
    process.exit(1);
});