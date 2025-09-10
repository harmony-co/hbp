export function fHex(hex: number): string {
    return `0x${hex.toString(16).toUpperCase()}`;
}

export function toBig(buffer: Buffer): bigint {
    let result = BigInt(0);
    for (let i = 0; i < buffer.length; i++) result = (result << BigInt(8)) | BigInt(buffer[i]);
    return result;
}
