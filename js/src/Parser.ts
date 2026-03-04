import type { MarkerToType } from "./Serializer.js";
import type { HBPFrame } from "./Specification.js";
import {
    DictExtraByte,
    FloatByteLength,
    HBPVersion,
    LongTupleExtraByte,
    LongUTF8StringExtraByte,
    LongVectorExtraByte,
    MapExtraByte,
    Marker,
    SignedIntByteLength,
    SmallTupleCapacity,
    SmallUTF8StringCapacity,
    SmallVectorCapacity,
    UnsignedIntByteLength
} from "./Specification.js";

type BufferReaderState = {
    readonly view: DataView,
    offset: number,
    readonly textDecoder: TextDecoder
};

function createBufferReader(buffer: HBPFrame): BufferReaderState {
    const buf = new Uint8Array(buffer as Array<any>);
    return {
        view: new DataView(buf.buffer, buf.byteOffset, buf.byteLength),
        offset: 0,
        textDecoder: new TextDecoder("utf-8")
    };
}

export function hasBytes(state: BufferReaderState, n: number): boolean {
    return state.offset + n <= state.view.byteLength;
}

function readUint(state: BufferReaderState, bytes: number): number {
    const method = `getUint${bytes * 8}`;
    // @ts-expect-error hehe
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const val: number = state.view[method](state.offset, true);
    state.offset += bytes;
    return val;
}

function readInt(state: BufferReaderState, bytes: number): number {
    const method = `getInt${bytes * 8}`;
    // @ts-expect-error hehe
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const val: number = state.view[method](state.offset, true);
    state.offset += bytes;
    return val;
}

function readBigInt(state: BufferReaderState, bytes: number): number {
    const method = `getBigInt${bytes * 8}`;
    // @ts-expect-error hehe
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const val: number = state.view[method](state.offset, true);
    state.offset += bytes;
    return val;
}

function readBigUint(state: BufferReaderState, bytes: number): number {
    const method = `getBigUint${bytes * 8}`;
    // @ts-expect-error hehe
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const val: number = state.view[method](state.offset, true);
    state.offset += bytes;
    return val;
}

function readFloat(state: BufferReaderState, bytes: number): number {
    const method = `getFloat${bytes * 8}`;
    // @ts-expect-error hehe
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const val: number = state.view[method](state.offset, true);
    state.offset += bytes;
    return val;
}

function readBigIntBytesSigned(state: BufferReaderState, len: number): bigint {
    let val = 0n;

    for (let i = len - 1; i >= 0; i--) val = (val << 8n) | BigInt(state.view.getUint8(state.offset + i));

    state.offset += len;

    const bits = BigInt(len * 8);
    const signBit = 1n << (bits - 1n);

    if (val & signBit) val -= 1n << bits;

    return val;
}

function readBigIntBytesUnsigned(state: BufferReaderState, len: number): bigint {
    let val = 0n;
    for (let i = len - 1; i >= 0; i--) val = (val << 8n) | BigInt(state.view.getUint8(state.offset + i));

    state.offset += len;
    return val;
}

function readBytes(state: BufferReaderState, len: number): Uint8Array {
    const buf = new Uint8Array(state.view.buffer, state.view.byteOffset + state.offset, len);
    state.offset += len;
    return buf;
}

function readString(state: BufferReaderState, len: number): string {
    const bytes = readBytes(state, len);
    return state.textDecoder.decode(bytes);
}

export function getOffset(state: BufferReaderState): number {
    return state.offset;
}

function parseValue(state: BufferReaderState): string | number | bigint | boolean | object | null {
    const marker: Marker = readUint(state, 1);

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (marker) {
        case Marker.null: return null;
        case Marker.false: return false;
        case Marker.true: return true;

        case Marker.signed_int_8:
        case Marker.signed_int_16:
        case Marker.signed_int_32:
            return readInt(state, SignedIntByteLength[marker]);
        case Marker.signed_int_64:
            return readBigInt(state, SignedIntByteLength[marker]);

        case Marker.signed_int_128:
        case Marker.signed_int_256:
        case Marker.signed_int_512:
            return readBigIntBytesSigned(state, SignedIntByteLength[marker]);

        case Marker.signed_int_arbitrary: {
            const len = readUint(state, 2);
            return readBigIntBytesSigned(state, len);
        }

        case Marker.unsigned_int_8:
        case Marker.unsigned_int_16:
        case Marker.unsigned_int_32:
            return readUint(state, UnsignedIntByteLength[marker]);
        case Marker.unsigned_int_64:
            return readBigUint(state, UnsignedIntByteLength[marker]);

        case Marker.unsigned_int_128:
        case Marker.unsigned_int_256:
        case Marker.unsigned_int_512:
            return readBigIntBytesUnsigned(state, UnsignedIntByteLength[marker]);

        case Marker.unsigned_int_arbitrary: {
            const len = readUint(state, 2);
            return readBigIntBytesUnsigned(state, len);
        }

        case Marker.float_single:
        case Marker.float_double:
            return readFloat(state, FloatByteLength[marker]);

        case Marker.string_utf8_0: return "";
        case Marker.string_utf8_1:
        case Marker.string_utf8_2:
        case Marker.string_utf8_3:
        case Marker.string_utf8_4:
        case Marker.string_utf8_5:
        case Marker.string_utf8_6:
        case Marker.string_utf8_7:
        case Marker.string_utf8_8:
        case Marker.string_utf8_9:
        case Marker.string_utf8_10:
        case Marker.string_utf8_11:
        case Marker.string_utf8_12:
        case Marker.string_utf8_13:
        case Marker.string_utf8_14:
        case Marker.string_utf8_15:
            return readString(state, SmallUTF8StringCapacity[marker]);

        case Marker.string_utf8_255:
        case Marker.string_utf8_65535:
        case Marker.string_utf8_4G:
            return readString(state, readUint(state, LongUTF8StringExtraByte[marker]));

        case Marker.tuple_0: return [];
        case Marker.tuple_1:
        case Marker.tuple_2:
        case Marker.tuple_3:
        case Marker.tuple_4:
        case Marker.tuple_5:
        case Marker.tuple_6:
        case Marker.tuple_7:
        case Marker.tuple_8:
        case Marker.tuple_9:
        case Marker.tuple_10:
        case Marker.tuple_11:
        case Marker.tuple_12:
        case Marker.tuple_13:
        case Marker.tuple_14:
        case Marker.tuple_15:
            return parseTuple(state, SmallTupleCapacity[marker]);

        case Marker.tuple_255:
        case Marker.tuple_65535:
        case Marker.tuple_4G:
            return parseTuple(state, readUint(state, LongTupleExtraByte[marker]));

        case Marker.vector_0:
        case Marker.vector_1:
        case Marker.vector_2:
        case Marker.vector_3:
        case Marker.vector_4:
        case Marker.vector_5:
        case Marker.vector_6:
        case Marker.vector_7:
        case Marker.vector_8:
        case Marker.vector_9:
        case Marker.vector_10:
        case Marker.vector_11:
        case Marker.vector_12:
        case Marker.vector_13:
        case Marker.vector_14:
        case Marker.vector_15:
            return parseVector(state, SmallVectorCapacity[marker]);

        case Marker.vector_255:
        case Marker.vector_65535:
        case Marker.vector_4G:
            return parseVector(state, readUint(state, LongVectorExtraByte[marker]));

        case Marker.dict_255:
        case Marker.dict_65535:
        case Marker.dict_4G:
            return parseDictionary(state, readUint(state, DictExtraByte[marker]));

        case Marker.map_255:
        case Marker.map_65535:
        case Marker.map_4G:
            return parseMap(state, readUint(state, MapExtraByte[marker]));

        case Marker.optional: {
            const hasValue = readUint(state, 1);
            if (hasValue) return parseValue(state);
            return null;
        }

        case Marker.enum: {
            return readUint(state, 1);
        }

        case Marker.error: {
            const errorMessage = parseValue(state);
            if (typeof errorMessage !== "string")
                throw new Error("Error marker must contain a string message");

            return new Error(errorMessage);
        }

        default:
            throw new Error(`Unknown or Unimplemented Marker: 0x${marker.toString(16)}`);
    }
}

function parseTuple(state: BufferReaderState, length: number): Array<unknown> {
    const arr = new Array(length);
    for (let i = 0; i < length; i++) arr[i] = parseValue(state);
    return arr;
}

const ctorMap = {
    [Marker.signed_int_8]: Int8Array,
    [Marker.signed_int_16]: Int16Array,
    [Marker.signed_int_32]: Int32Array,

    [Marker.unsigned_int_8]: Uint8Array,
    [Marker.unsigned_int_16]: Uint16Array,
    [Marker.unsigned_int_32]: Uint32Array,

    [Marker.float_single]: Float32Array,
    [Marker.float_double]: Float64Array
} as const;

function parseVector(state: BufferReaderState, capacity: number): Float32Array | Float64Array | Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array {
    if (capacity === 0) return new Uint8Array(0);
    const marker: Marker = readUint(state, 1);

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (marker) {
        case Marker.signed_int_8:
        case Marker.signed_int_16:
        case Marker.signed_int_32: {
            const arr = new ctorMap[marker](capacity);
            const byteLength = SignedIntByteLength[marker];
            for (let i = 0; i < capacity; i++) arr[i] = readInt(state, byteLength);
            return arr;
        }
        case Marker.unsigned_int_8:
        case Marker.unsigned_int_16:
        case Marker.unsigned_int_32: {
            const arr = new ctorMap[marker](capacity);
            const byteLength = UnsignedIntByteLength[marker];
            for (let i = 0; i < capacity; i++) arr[i] = readUint(state, byteLength);
            return arr;
        }
        case Marker.float_single:
        case Marker.float_double: {
            const arr = new ctorMap[marker](capacity);
            const byteLength = FloatByteLength[marker];
            for (let i = 0; i < capacity; i++) arr[i] = readFloat(state, byteLength);
            return arr;
        }
        default:
            throw new Error(`Unimplemented Vector Type: 0x${marker.toString(16)}`);
    }
}

function parseDictionary(state: BufferReaderState, length: number): object {
    const obj: Record<string, any> = {};
    for (let i = 0; i < length; i++) {
        const key = parseValue(state);
        if (typeof key !== "string")
            throw new Error("Dictionary key must be a string");

        const value = parseValue(state);
        obj[key] = value;
    }
    return obj;
}

function parseMap(state: BufferReaderState, length: number): Map<any, any> {
    const map = new Map();
    for (let i = 0; i < length; i++) {
        const [key, value] = [parseValue(state), parseValue(state)];
        map.set(key, value);
    }
    return map;
}

type MarkerFromFrame<F extends HBPFrame> = F extends [typeof HBPVersion, infer M, ...infer _] ? M : never;

export function parse<F extends HBPFrame, M extends Marker = MarkerFromFrame<F>>(buffer: F): MarkerToType<M> {
    const state = createBufferReader(buffer);

    const version = readUint(state, 1);
    if (version !== HBPVersion)
        throw new Error(`Unsupported HBP Version: ${version}`);

    return parseValue(state) as MarkerToType<M>;
}

