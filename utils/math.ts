// Convert TON to nanoTON
export function tonToNanoTON(ton: number): number {
    return ton * 1_000_000_000;
}
    
// Convert nanoTON to TON
export function nanoTONToTon(nanoTON: number): number {
    return nanoTON / 1_000_000_000;
}

// Convert Jetton to smallest unit
export function jettonToSmallestUnit(jetton: number, decimals: number): number {
    return jetton * Math.pow(10, decimals);
}

// Convert smallest unit to Jetton
export function smallestUnitToJetton(smallestUnit: number, decimals: number): number {
    return smallestUnit / Math.pow(10, decimals);
}