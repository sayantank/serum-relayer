import BN from 'bn.js';

export function toPlainString(num: string) {
    return `${num}`.replace(/(-?)(\d*)\.?(\d+)e([+-]\d+)/, (a, b, c, d, e) =>
        e < 0 ? `${b}0.${Array(1 - e - c.length).join('0')}${c}${d}` : b + c + d + Array(e - d.length + 1).join('0')
    );
}

// TODO: Do not export until Intl NumberFormat is supported
function tokenAtomicsToDecimalString(tokenAtomics: BN, decimals: number): string {
    const s = tokenAtomics.toString().padStart(decimals + 1, '0');
    const decIndex = s.length - decimals;
    return `${s.substring(0, decIndex)}.${s.substring(decIndex)}`;
}

export function tokenAtomicsToDecimal(tokenAtomics: BN, decimals: number): number {
    return Number(tokenAtomicsToDecimalString(tokenAtomics, decimals));
}

// TODO: Do not export until Intl NumberFormat is supported
function tokenDecimalStringToAtomics(tokenDecimalString: string, decimals: number): BN {
    const [integer, fractional = ''] = tokenDecimalString.split('.');
    return new BN(`${integer}${'0'.repeat(decimals)}`).add(new BN(fractional.padEnd(decimals, '0').slice(0, decimals)));
}

export function tokenDecimalsToAtomics(tokenDecimals: number, decimals: number): BN {
    return tokenDecimalStringToAtomics(toPlainString(tokenDecimals.toString()), decimals);
}
