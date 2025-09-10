import { HBP_VERSION } from "./index.js";
import { fromBig } from "./util.js";

export function serializeNull(): Buffer {
    return Buffer.from([HBP_VERSION, 0x00]);
}

export function serializeBool(value: boolean): Buffer {
    return Buffer.from([HBP_VERSION, value ? 0x02 : 0x01]);
}

export enum SignedInt {
    /* eslint-disable @typescript-eslint/naming-convention */
    i8 = 0x10,
    i16 = 0x11,
    i32 = 0x12,
    i64 = 0x13,
    i128 = 0x14,
    i256 = 0x15,
    i512 = 0x16,
    arbitrary = 0x1F
    /* eslint-enable @typescript-eslint/naming-convention */
}

export enum UnsignedInt {
    /* eslint-disable @typescript-eslint/naming-convention */
    u8 = 0x20,
    u16 = 0x21,
    u32 = 0x22,
    u64 = 0x23,
    u128 = 0x24,
    u256 = 0x25,
    u512 = 0x26,
    arbitrary = 0x2F
    /* eslint-enable @typescript-eslint/naming-convention */
}

export type Integer = SignedInt | UnsignedInt;

export function serializeInt(type: Integer, value: bigint): Buffer {
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

