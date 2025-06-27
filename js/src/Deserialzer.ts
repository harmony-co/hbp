export const HBP_VERSION = 0x01;

function fHex(hex: number): string {
    return `0x${hex.toString(16).toUpperCase()}`;
}

function toBig(buffer: Buffer): bigint {
    let result = BigInt(0);
    for (let i = 0; i < buffer.length; i++) result = (result << BigInt(8)) | BigInt(buffer[i]);

    return result;
}

export function deserializeBool(buffer: Buffer): boolean {
    switch (buffer[1]) {
        case 0x01: return false;
        case 0x02: return true;
        default: throw new Error("Invalid Boolean Encoding: Expected one of [0x01, 0x02]");
    }
}

export function deserializeInt(buffer: Buffer): bigint {
    const buf = buffer[0] === HBP_VERSION ? buffer.subarray(1) : buffer;
    const [tag] = buf;

    if ((tag >= 0x10 && tag <= 0x16) || (tag >= 0x20 && tag <= 0x26))
        return toBig(buf.subarray(1));
    else if (tag === 0x1F || tag === 0x2F)
        return toBig(buf.subarray(3));

    throw new Error(`Unsupported integer format ${fHex(tag)}`);
}

export function deserializeString(buffer: Buffer): string {
    let buf = buffer[0] === HBP_VERSION ? buffer.subarray(1) : buffer;

    if (buf[0] !== 0xE0)
        throw new Error(`Invalid Buffer: Expected marker [0xE0], got ${fHex(buf[0])}`);
    if ((buf[1] & 0xF0) !== 0x80 && buf[1] !== 0xDD && buf[1] !== 0xDE && buf[1] !== 0xDF)
        throw new Error(`Invalid Buffer: Expected a list marker in ranges of [0x80, 0x8F] or [0xDD, 0xDF], got ${fHex(buf[1])}`);
    buf = buf.subarray(2);

    if (buf[2] === 0x20) buf = buf.subarray(1);

    return buf.subarray(1).toString();
}
