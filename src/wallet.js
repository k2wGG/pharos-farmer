// src/wallet.js

require('dotenv').config();
const chalk = require('chalk');
const { Wallet } = require('ethers');

// Загрузка приватных ключей из .env
function loadWallets() {
    const wallets = [];
    const env = process.env;
    let count = 0;
    for (const key of Object.keys(env)) {
        if (key.startsWith('PRIVATE_KEY')) {
            const pk = env[key].trim();
            if (/^0x[a-fA-F0-9]{64}$/.test(pk)) {
                try {
                    const wallet = new Wallet(pk);
                    wallets.push(wallet);
                    count++;
                } catch {
                    console.log(chalk.red(`Ошибка: неверный приватный ключ (${key})`));
                }
            } else {
                console.log(chalk.red(`Ошибка: ${key} не похож на валидный приватный ключ!`));
            }
        }
    }
    if (!count) {
        console.log(chalk.red('\nНе найдено ни одного приватного ключа в .env (PRIVATE_KEY_1, PRIVATE_KEY_2, ...)!'));
    } else {
        console.log(chalk.green(`\nЗагружено кошельков: ${count}`));
        wallets.forEach((w, i) => {
            console.log(chalk.yellow(`  [${i + 1}] ${w.address}`));
        });
        console.log('');
    }
    return wallets;
}

module.exports = {
    loadWallets
};
