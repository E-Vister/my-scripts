export function pluralize(n, one, few, many) {
    const abs = Math.abs(n) % 100;
    const mod10 = abs % 10;
    if (abs >= 11 && abs <= 14) return `${n} ${many}`;
    if (mod10 === 1) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
    return `${n} ${many}`;
}
