"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForSpecificTime = waitForSpecificTime;
exports.delay = delay;
exports.formatTimeRemaining = formatTimeRemaining;
exports.formatTimestamp = formatTimestamp;
async function waitForSpecificTime(targetTimestamp) {
    return new Promise((resolve) => {
        const wait = () => {
            const currentTime = Date.now();
            if (currentTime >= targetTimestamp) {
                resolve();
            }
            else {
                setTimeout(wait, 1);
            }
        };
        wait();
    });
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function formatTimeRemaining(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (days > 0)
        parts.push(`${days}d`);
    if (hours > 0)
        parts.push(`${hours}h`);
    if (minutes > 0)
        parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0)
        parts.push(`${seconds}s`);
    return parts.join(' ');
}
function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString();
}
//# sourceMappingURL=time.utils.js.map