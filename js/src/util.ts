export function fHex(hex: number): string {
    return `0x${hex.toString(16).toUpperCase()}`;
}

export function toBig(buffer: Buffer): bigint {
    let result = BigInt(0);
    for (let i = 0; i < buffer.length; i++) result = (result << BigInt(8)) | BigInt(buffer[i]);
    return result;
}

export function fromBig(value: bigint, length: number): Buffer {
    const buffer = Buffer.allocUnsafe(length);
    for (let i = length - 1; i >= 0; i--) {
        buffer[i] = Number(value & 0xFFn);
        value >>= 8n;
    }
    return buffer;
}
