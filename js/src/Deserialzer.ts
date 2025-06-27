export const HBP_VERSION = 0x01;

function toBig(buffer: Buffer): bigint {
    let result = BigInt(0);
    for (let i = 0; i < buffer.length; i++) result = (result << BigInt(8)) | BigInt(buffer[i]);

    return result;
}

export function deserializeBool(buffer: Buffer): boolean {
    switch (buffer[1]) {
        case 0x01: return false;
        case 0x02: return true;
        default: throw new Error("Invalid boolean encoding");
    }
}

export function deserializeInt(buffer: Buffer): bigint {
    const buf = buffer[0] === HBP_VERSION ? buffer.subarray(1) : buffer;
    const [tag] = buf;

    if ((tag >= 0x10 && tag <= 0x16) || (tag >= 0x20 && tag <= 0x26))
        return toBig(buf.subarray(1));
    else if (tag === 0x1F || tag === 0x2F)
        return toBig(buf.subarray(3));

    throw new Error(`Unsupported integer format ${tag.toString(16)}`);
}

export function deserializeStringAssumeLength(maxLen: number, buffer: Buffer): { data: Buffer, length: number } {
    let buf = buffer[0] === HBP_VERSION ? buffer.subarray(1) : buffer;
    if (buf[0] !== 0xE0) throw new Error("InvalidBuffer");

    buf = buf.subarray(3);
    if (buf.length > maxLen) throw new Error("Buffer too long");

    const result = Buffer.alloc(maxLen);
    for (let i = 0; i < buf.length; i++) result[i] = buf[i];

    return { data: result, length: buf.length };
}
