// src/helpers.js

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const logFilePath = path.join(__dirname, '../logs/history.log');

// Добавить запись в лог
function writeLog({ wallet, action, status, txHash = '', info = '' }) {
    const time = new Date().toISOString();
    const logLine = `[${time}] ${wallet} | ${action} | ${status} | ${txHash} | ${info}\n`;
    try {
        fs.appendFileSync(logFilePath, logLine, 'utf8');
    } catch (e) {
        console.log(chalk.red('Ошибка записи в лог:'), e.message);
    }
}

// Проверить, выполнялось ли действие (по кошельку/дате/операции)
function isActionLogged(wallet, action, periodMinutes = 1440) {
    // Проверяем, не было ли такого действия за последние N минут (по лог-файлу)
    try {
        if (!fs.existsSync(logFilePath)) return false;
        const lines = fs.readFileSync(logFilePath, 'utf8').trim().split('\n');
        const now = Date.now();
        for (const line of lines.reverse()) {
            if (line.includes(wallet) && line.includes(action)) {
                const timeMatch = line.match(/^\[(.*?)\]/);
                if (timeMatch) {
                    const logTime = new Date(timeMatch[1]).getTime();
                    const deltaMin = (now - logTime) / 60000;
                    if (deltaMin < periodMinutes) {
                        return true;
                    }
                }
            }
        }
    } catch (e) {
        // В случае ошибки — не блокируем работу
        return false;
    }
    return false;
}

// Простой delay
function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

module.exports = {
    writeLog,
    isActionLogged,
    delay,
};
