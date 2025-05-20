// src/ui.js

const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');

// Современный разделитель
const divider = chalk.gray('─────────────────────────────────────────────────────────────');

// Красивый баннер с инфой
function showBanner() {
    console.clear();
    console.log(
        chalk.cyan.bold(`
 _   _           _  _____      
| \\ | |         | ||____ |     
|  \\| | ___   __| |    / /_ __ 
| . \` |/ _ \\ / _\` |    \\ \\ '__|
| |\\  | (_) | (_| |.___/ / |   
\\_| \\_/\\___/ \\__,_|\\____/|_|   

Менеджер фарминга Pharos Testnet
 @nod3r — CLI-версия (open-source)
        `)
    );
    console.log(chalk.yellow('ВНИМАНИЕ! Никогда не используйте реальные кошельки с активами!'));
    console.log(chalk.yellow('Все приватные ключи хранятся только локально у вас. Не делитесь ими!'));
    console.log(divider);
}

// Новый блок: красивый вывод кошельков и прокси ОДИН раз
function showWalletsAndProxies(wallets, proxies) {
    console.log(
        chalk.bold.cyan(
            `\n👛 Найдено кошельков: ${wallets.length}   🌐 Прокси: ${proxies.length}\n`
        )
    );
    if (wallets.length > 0) {
        wallets.forEach((w, i) => {
            console.log(
                chalk.greenBright(`[${i + 1}] `) +
                chalk.whiteBright(w.address)
            );
        });
    } else {
        console.log(chalk.red('Кошельки не найдены!'));
    }
    console.log(divider + '\n');
}

// Показать текущие настройки
function showSettings(config) {
    console.log(chalk.magenta.bold('\nТекущие параметры программы:'));
    console.log(chalk.cyan(`  Количество swap за цикл:         ${config.swapCount}`));
    console.log(chalk.cyan(`  Количество переводов PHRS:       ${config.transferCount}`));
    console.log(chalk.cyan(`  Задержка между циклами (мин):    ${config.cooldownMinutes}`));
    console.log(chalk.cyan(`  Рандомизация порядка действий:    ${config.randomizeOrder ? 'ВКЛ' : 'ВЫКЛ'}`));
    console.log(divider);
}

// Изменение настроек через меню
async function changeSettings(config, saveConfig) {
    const answer = await inquirer.prompt([
        {
            type: 'input',
            name: 'swapCount',
            message: 'Введите количество swap за цикл:',
            default: config.swapCount,
            validate: v => (!isNaN(Number(v)) && Number(v) > 0 ? true : 'Введите число > 0')
        },
        {
            type: 'input',
            name: 'transferCount',
            message: 'Введите количество переводов PHRS за цикл:',
            default: config.transferCount,
            validate: v => (!isNaN(Number(v)) && Number(v) > 0 ? true : 'Введите число > 0')
        },
        {
            type: 'input',
            name: 'cooldownMinutes',
            message: 'Введите задержку между циклами (минуты):',
            default: config.cooldownMinutes,
            validate: v => (!isNaN(Number(v)) && Number(v) >= 0 ? true : 'Введите число >= 0')
        },
        {
            type: 'confirm',
            name: 'randomizeOrder',
            message: 'Включить рандомизацию порядка действий?',
            default: config.randomizeOrder
        }
    ]);
    const newConfig = {
        swapCount: Number(answer.swapCount),
        transferCount: Number(answer.transferCount),
        cooldownMinutes: Number(answer.cooldownMinutes),
        randomizeOrder: answer.randomizeOrder
    };
    saveConfig(newConfig);
    console.log(chalk.green('\nНастройки успешно обновлены!\n'));
    showSettings(newConfig);
    return newConfig;
}

module.exports = {
    showBanner,
    showWalletsAndProxies, // <--- добавлено!
    showSettings,
    changeSettings
};
