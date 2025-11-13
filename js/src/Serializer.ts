import { fromBig } from "./util.js";
import { HBP_VERSION, Marker } from "./index.js";

export function serializeNull(): Buffer {
    return Buffer.from([HBP_VERSION, 0x00]);
}

export function serializeBool(value: boolean): Buffer {
    return Buffer.from([HBP_VERSION, value ? Marker.true : Marker.false]);
}

export function serializeInt(type: Marker, value: bigint): Buffer {
    let bits: number;
    const isArbitrary = (type & 0x0F) === 0x0F;
    if (isArbitrary) {
        // https://stackoverflow.com/a/76616288/28282697
        bits = (value.toString(16).length - 1) * 4;
        bits += 32 - Math.clz32(Number(value >> BigInt(bits)));
        bits = Math.ceil(bits / 8) * 8; // byte-align the bit width
    } else bits = 8 * (1 << (type & 0x0F));

    const intBytes = fromBig(value, bits / 8);
    const marker = isArbitrary
        ? Buffer.from([type, (bits >> 8) & 0xFF, bits & 0xFF])
        : Buffer.from([type]);
    const buffer = Buffer.alloc(1 + marker.length + intBytes.length);
    buffer[0] = HBP_VERSION;
    marker.copy(buffer, 1);
    intBytes.copy(buffer, 1 + marker.length);

    return buffer;
}

export function serializeString(str: string): Buffer {
    const strBuffer = Buffer.from(str, "utf8");

    const buffer = Buffer.alloc(1 + 2 + strBuffer.length);
    buffer[0] = HBP_VERSION;
    buffer[1] = 0xE0;
    buffer[2] = 0x80 + strBuffer.length;
    strBuffer.copy(buffer, 3);
    return buffer;
}

