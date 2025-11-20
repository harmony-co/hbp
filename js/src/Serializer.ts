import type { BooleanMarker, DecimalMarker, DictMarker, FloatMarker, HBPFrame, MapMarker, NullMarker, Tail, TupleMarker, UTF8StringMarker, VectorMarker, PrimitiveMarker } from "./Specification.js";
import { HBPVersion, Marker } from "./Specification.js";

type BufferWriterState = {
    buffer: Uint8Array,
    offset: number,
    view: DataView
};

export type HBPMapKey = MarkerToType<PrimitiveMarker>;

export type HBPValue =
    | null
    | undefined
    | boolean
    | number
    | bigint
    | string
    | Array<HBPValue>
    | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | Map<HBPMapKey, HBPValue>
    | { [key: string]: HBPValue }
    | Error;

/* eslint-disable @stylistic/indent */
export type MarkerToType<M extends Marker> =
    M extends NullMarker ? null :
    M extends Marker.false ? false :
    M extends Marker.true ? true :
    M extends
        | Marker.signed_int_8
        | Marker.signed_int_16
        | Marker.signed_int_32 ? number :
    M extends
        | Marker.signed_int_64
        | Marker.signed_int_128
        | Marker.signed_int_256
        | Marker.signed_int_512
        | Marker.signed_int_arbitrary ? bigint :
    M extends
        | Marker.unsigned_int_8
        | Marker.unsigned_int_16
        | Marker.unsigned_int_32 ? number :
    M extends
        | Marker.unsigned_int_64
        | Marker.unsigned_int_128
        | Marker.unsigned_int_256
        | Marker.unsigned_int_512
        | Marker.unsigned_int_arbitrary ? bigint :
    M extends FloatMarker ? number :
    M extends DecimalMarker ? number :
    M extends
        | UTF8StringMarker
        | Marker.string_arbitrary ? string :
    M extends TupleMarker ? Array<HBPValue> :
    M extends VectorMarker ?
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array
        | Float32Array
        | Float64Array :
    M extends DictMarker ? Record<string, HBPValue> :
    M extends MapMarker ? Map<HBPMapKey, HBPValue> :
    M extends Marker.error ? Error :
    M extends Marker.optional ? HBPValue :
    M extends Marker.enum ? number | bigint :
    never;
/* eslint-enable @stylistic/indent */

/* eslint-disable @stylistic/indent */
export type InferHBPType<T> =
    T extends null ? NullMarker :
    T extends false ? Marker.false :
    T extends true ? Marker.true :
    T extends boolean ? BooleanMarker :
    T extends number ?
        | FloatMarker
        | Marker.signed_int_8
        | Marker.signed_int_16
        | Marker.signed_int_32 :
    T extends bigint ?
        | Marker.signed_int_64
        | Marker.signed_int_128
        | Marker.unsigned_int_64
        | Marker.unsigned_int_128
        | Marker.signed_int_arbitrary
        | Marker.unsigned_int_arbitrary :
    T extends string ?
        | UTF8StringMarker
        | Marker.string_arbitrary :
    T extends Array<any> ? TupleMarker :
    T extends
        | Int8Array
        | Uint8Array
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array
        | Float32Array
        | Float64Array ? VectorMarker :
    T extends Map<any, any> ? MapMarker :
    T extends Error ? Marker.error :
    T extends object ? DictMarker :
    never;
/* eslint-enable @stylistic/indent */

function createBufferWriter(initialSize: number = 1024): BufferWriterState {
    const buffer = new Uint8Array(initialSize);
    return {
        buffer,
        offset: 0,
        view: new DataView(buffer.buffer)
    };
}

function ensureCapacity(state: BufferWriterState, needed: number): void {
    if (state.offset + needed > state.buffer.length) {
        const newSize = Math.max(state.buffer.length * 2, state.offset + needed);
        const newBuffer = new Uint8Array(newSize);
        newBuffer.set(state.buffer);
        state.buffer = newBuffer;
        state.view = new DataView(state.buffer.buffer);
    }
}

function writeUint8(state: BufferWriterState, value: number): void {
    ensureCapacity(state, 1);
    state.view.setUint8(state.offset, value);
    state.offset += 1;
}

function writeInt8(state: BufferWriterState, value: number): void {
    ensureCapacity(state, 1);
    state.view.setInt8(state.offset, value);
    state.offset += 1;
}

function writeUint16(state: BufferWriterState, value: number): void {
    ensureCapacity(state, 2);
    state.view.setUint16(state.offset, value, false);
    state.offset += 2;
}

function writeInt16(state: BufferWriterState, value: number): void {
    ensureCapacity(state, 2);
    state.view.setInt16(state.offset, value, false);
    state.offset += 2;
}

function writeUint32(state: BufferWriterState, value: number): void {
    ensureCapacity(state, 4);
    state.view.setUint32(state.offset, value, false);
    state.offset += 4;
}

function writeInt32(state: BufferWriterState, value: number): void {
    ensureCapacity(state, 4);
    state.view.setInt32(state.offset, value, false);
    state.offset += 4;
}

function writeBigInt64(state: BufferWriterState, value: bigint): void {
    ensureCapacity(state, 8);
    state.view.setBigInt64(state.offset, value, false);
    state.offset += 8;
}

function writeBigUint64(state: BufferWriterState, value: bigint): void {
    ensureCapacity(state, 8);
    state.view.setBigUint64(state.offset, value, false);
    state.offset += 8;
}

function writeBigIntBytes(state: BufferWriterState, value: bigint, byteLength: number): void {
    ensureCapacity(state, byteLength);
    let tempVal = value;
    for (let i = byteLength - 1; i >= 0; i--) {
        const byte = Number(tempVal & 0xFFn);
        state.view.setUint8(state.offset + i, byte);
        tempVal >>= 8n;
    }
    state.offset += byteLength;
}

function writeFloat32(state: BufferWriterState, value: number): void {
    ensureCapacity(state, 4);
    state.view.setFloat32(state.offset, value, false);
    state.offset += 4;
}

function writeFloat64(state: BufferWriterState, value: number): void {
    ensureCapacity(state, 8);
    state.view.setFloat64(state.offset, value, false);
    state.offset += 8;
}

function writeBuffer(state: BufferWriterState, buf: Uint8Array): void {
    ensureCapacity(state, buf.length);
    state.buffer.set(buf, state.offset);
    state.offset += buf.length;
}

function getResult(state: BufferWriterState): Uint8Array {
    return state.buffer.slice(0, state.offset);
}

const textEncoder = new TextEncoder();

function writeExplicit(
    state: BufferWriterState,
    data: string | number | bigint | boolean | object | undefined | null,
    marker: Marker
): void {
    writeUint8(state, marker);

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (marker) {
        case Marker.null:
        case Marker.true:
        case Marker.false:
            return;
        case Marker.signed_int_8: writeInt8(state, Number(data)); return;
        case Marker.signed_int_16: writeInt16(state, Number(data)); return;
        case Marker.signed_int_32: writeInt32(state, Number(data)); return;
        case Marker.signed_int_64: writeBigInt64(state, BigInt(data as number)); return;
        case Marker.signed_int_128: writeBigIntBytes(state, BigInt(data as number), 16); return;
        case Marker.signed_int_256: writeBigIntBytes(state, BigInt(data as number), 32); return;
        case Marker.signed_int_512: writeBigIntBytes(state, BigInt(data as number), 64); return;
        case Marker.signed_int_arbitrary: writeArbitraryInt(state, BigInt(data as number)); return;
        case Marker.unsigned_int_8: writeUint8(state, Number(data)); return;
        case Marker.unsigned_int_16: writeUint16(state, Number(data)); return;
        case Marker.unsigned_int_32: writeUint32(state, Number(data)); return;
        case Marker.unsigned_int_64: writeBigUint64(state, BigInt(data as number)); return;
        case Marker.unsigned_int_128: writeBigIntBytes(state, BigInt(data as number), 16); return;
        case Marker.unsigned_int_256: writeBigIntBytes(state, BigInt(data as number), 32); return;
        case Marker.unsigned_int_512: writeBigIntBytes(state, BigInt(data as number), 64); return;
        case Marker.unsigned_int_arbitrary: writeArbitraryInt(state, BigInt(data as number)); return;
        case Marker.float_single: writeFloat32(state, Number(data)); return;
        case Marker.float_double: writeFloat64(state, Number(data)); return;
        default:
            if (marker >= Marker.string_utf8_0 && marker <= Marker.string_utf8_15) {
                const bytes = textEncoder.encode(String(data as string));
                writeBuffer(state, bytes);
                return;
            }

            if (marker === Marker.string_utf8_255) {
                const bytes = textEncoder.encode(String(data as string));
                writeUint8(state, bytes.length);
                writeBuffer(state, bytes);
                return;
            }

            if (marker === Marker.string_utf8_65535) {
                const bytes = textEncoder.encode(String(data as string));
                writeUint16(state, bytes.length);
                writeBuffer(state, bytes);
                return;
            }

            if (marker === Marker.string_utf8_4G) {
                const bytes = textEncoder.encode(String(data as string));
                writeUint32(state, bytes.length);
                writeBuffer(state, bytes);
                return;
            }

            if (marker >= Marker.tuple_0 && marker <= Marker.tuple_15) {
                const arr = data as Array<any>;
                for (const item of arr) writeAny(state, item);
                return;
            }

            if (marker === Marker.tuple_255) {
                const arr = data as Array<any>;
                writeUint8(state, arr.length);
                for (const item of arr) writeAny(state, item);
                return;
            }

            if (marker === Marker.tuple_65535) {
                const arr = data as Array<any>;
                writeUint16(state, arr.length);
                for (const item of arr) writeAny(state, item);
                return;
            }

            if (marker === Marker.tuple_4G) {
                const arr = data as Array<any>;
                writeUint32(state, arr.length);
                for (const item of arr) writeAny(state, item);
                return;
            }

            if (marker >= Marker.vector_0 && marker <= Marker.vector_15) {
                writeVectorData(state, data as ArrayBufferView);
                return;
            }

            if (marker === Marker.vector_255) {
                const view = data as ArrayBufferView;
                writeUint8(state, view.byteLength);
                writeVectorData(state, view);
                return;
            }

            if (marker === Marker.vector_65535) {
                const view = data as ArrayBufferView;
                writeUint16(state, view.byteLength);
                writeVectorData(state, view);
                return;
            }

            if (marker === Marker.vector_4G) {
                const view = data as ArrayBufferView;
                writeUint32(state, view.byteLength);
                writeVectorData(state, view);
                return;
            }

            if (marker === Marker.dict_255) {
                const entries = Object.entries(data as object);
                writeUint8(state, entries.length);
                for (const [k, v] of entries) {
                    writeString(state, k);
                    writeAny(state, v);
                }
                return;
            }

            if (marker === Marker.dict_65535) {
                const entries = Object.entries(data as object);
                writeUint16(state, entries.length);
                for (const [k, v] of entries) {
                    writeString(state, k);
                    writeAny(state, v);
                }
                return;
            }

            if (marker === Marker.dict_4G) {
                const entries = Object.entries(data as object);
                writeUint32(state, entries.length);
                for (const [k, v] of entries) {
                    writeString(state, k);
                    writeAny(state, v);
                }
                return;
            }

            if (marker === Marker.map_255) {
                const map = data as Map<any, any>;
                writeUint8(state, map.size);
                for (const [k, v] of map) {
                    writeAny(state, k);
                    writeAny(state, v);
                }
                return;
            }

            if (marker === Marker.map_65535) {
                const map = data as Map<any, any>;
                writeUint16(state, map.size);
                for (const [k, v] of map) {
                    writeAny(state, k);
                    writeAny(state, v);
                }
                return;
            }

            if (marker === Marker.map_4G) {
                const map = data as Map<any, any>;
                writeUint32(state, map.size);
                for (const [k, v] of map) {
                    writeAny(state, k);
                    writeAny(state, v);
                }
                return;
            }

            if (marker === Marker.error) {
                const err = data as Error;
                writeString(state, err.message);
                return;
            }

            throw new Error(`Marker ${marker} is not supported in serializeValue`);
    }
}

function writeVectorData(state: BufferWriterState, view: ArrayBufferView): void {
    let typeMarker = Marker.null;
    // eslint-disable-next-line func-style
    let writerFunc: (val: number) => void = () => { /* empty */ };

    if (view instanceof Int8Array) {
        typeMarker = Marker.signed_int_8;
        writerFunc = (v) => { writeInt8(state, v); };
    } else if (view instanceof Uint8Array) {
        typeMarker = Marker.unsigned_int_8;
        writerFunc = (v) => { writeUint8(state, v); };
    } else if (view instanceof Int16Array) {
        typeMarker = Marker.signed_int_16;
        writerFunc = (v) => { writeInt16(state, v); };
    } else if (view instanceof Uint16Array) {
        typeMarker = Marker.unsigned_int_16;
        writerFunc = (v) => { writeUint16(state, v); };
    } else if (view instanceof Int32Array) {
        typeMarker = Marker.signed_int_32;
        writerFunc = (v) => { writeInt32(state, v); };
    } else if (view instanceof Uint32Array) {
        typeMarker = Marker.unsigned_int_32;
        writerFunc = (v) => { writeUint32(state, v); };
    } else if (view instanceof Float32Array) {
        typeMarker = Marker.float_single;
        writerFunc = (v) => { writeFloat32(state, v); };
    } else if (view instanceof Float64Array) {
        typeMarker = Marker.float_double;
        writerFunc = (v) => { writeFloat64(state, v); };
    } else
        throw new Error("Unsupported TypedArray for Vector serialization");

    writeUint8(state, typeMarker);
    for (const item of view) writerFunc(item);
}

function writeAny(state: BufferWriterState, data: unknown): void {
    if (data === null || data === undefined) {
        writeUint8(state, Marker.null);
        return;
    }

    const type = typeof data;

    switch (type) {
        case "boolean":
            writeUint8(state, data === true ? Marker.true : Marker.false);
            break;
        case "number":
            writeNumber(state, data as number);
            break;
        case "string":
            writeString(state, data as string);
            break;
        case "bigint":
            writeBigIntAuto(state, data as bigint);
            break;
        case "object":
            writeObject(state, data as object);
            break;
        case "symbol": { throw new Error('Unsupported type: "symbol"'); }
        case "undefined": { throw new Error('Unsupported type: "undefined"'); }
        case "function": { throw new Error('Unsupported type: "function"'); }
    }
}

function writeNumber(state: BufferWriterState, num: number): void {
    writeUint8(state, Marker.float_double);
    writeFloat64(state, num);
}

function writeBigIntAuto(state: BufferWriterState, num: bigint): void {
    if (num < 0n) {
        if (num >= -128n) {
            writeUint8(state, Marker.signed_int_8);
            writeInt8(state, Number(num));
        } else if (num >= -32768n) {
            writeUint8(state, Marker.signed_int_16);
            writeInt16(state, Number(num));
        } else if (num >= -2147483648n) {
            writeUint8(state, Marker.signed_int_32);
            writeInt32(state, Number(num));
        } else if (num >= -9223372036854775808n) {
            writeUint8(state, Marker.signed_int_64);
            writeBigInt64(state, num);
        } else if (num >= -(1n << 127n)) {
            writeUint8(state, Marker.signed_int_128);
            writeBigIntBytes(state, num, 16);
        } else if (num >= -(1n << 255n)) {
            writeUint8(state, Marker.signed_int_256);
            writeBigIntBytes(state, num, 32);
        } else if (num >= -(1n << 511n)) {
            writeUint8(state, Marker.signed_int_512);
            writeBigIntBytes(state, num, 64);
        } else {
            writeUint8(state, Marker.signed_int_arbitrary);
            writeArbitraryInt(state, num);
        }
    } else {
        // eslint-disable-next-line no-lonely-if
        if (num <= 255n) {
            writeUint8(state, Marker.unsigned_int_8);
            writeUint8(state, Number(num));
        } else if (num <= 65535n) {
            writeUint8(state, Marker.unsigned_int_16);
            writeUint16(state, Number(num));
        } else if (num <= 4294967295n) {
            writeUint8(state, Marker.unsigned_int_32);
            writeUint32(state, Number(num));
        } else if (num <= 18446744073709551615n) {
            writeUint8(state, Marker.unsigned_int_64);
            writeBigUint64(state, num);
        } else if (num < (1n << 128n)) {
            writeUint8(state, Marker.unsigned_int_128);
            writeBigIntBytes(state, num, 16);
        } else if (num < (1n << 256n)) {
            writeUint8(state, Marker.unsigned_int_256);
            writeBigIntBytes(state, num, 32);
        } else if (num < (1n << 512n)) {
            writeUint8(state, Marker.unsigned_int_512);
            writeBigIntBytes(state, num, 64);
        } else {
            writeUint8(state, Marker.unsigned_int_arbitrary);
            writeArbitraryInt(state, num);
        }
    }
}

function writeArbitraryInt(state: BufferWriterState, num: bigint): void {
    const isNegative = num < 0n;
    if (isNegative) num = -num;

    let tmp = num;
    let byteLen = 0;
    while (tmp > 0n) {
        byteLen++;
        tmp >>= 8n;
    }
    if (byteLen === 0) byteLen = 1;

    writeUint16(state, byteLen);

    const buffer = Buffer.allocUnsafe(byteLen);
    for (let i = byteLen - 1; i >= 0; i--) {
        buffer[i] = Number(num & 0xFFn);
        num >>= 8n;
    }

    for (let i = 0; i < byteLen; i++) writeUint8(state, buffer[i]);
}

function writeString(state: BufferWriterState, str: string): void {
    const bytes = textEncoder.encode(str);
    const len = bytes.length;

    if (len <= 15)
        writeUint8(state, Marker.string_utf8_0 + len);
    else if (len <= 255) {
        writeUint8(state, Marker.string_utf8_255);
        writeUint8(state, len);
    } else if (len <= 65535) {
        writeUint8(state, Marker.string_utf8_65535);
        writeUint16(state, len);
    } else {
        writeUint8(state, Marker.string_utf8_4G);
        writeUint32(state, len);
    }
    writeBuffer(state, bytes);
}

function writeObject(state: BufferWriterState, obj: object): void {
    if (Array.isArray(obj)) {
        writeTuple(state, obj);
        return;
    }

    if (obj instanceof Map) {
        writeMap(state, obj);
        return;
    }

    if (obj instanceof Error) {
        writeError(state, obj);
        return;
    }

    if (ArrayBuffer.isView(obj)) {
        writeVector(state, obj);
        return;
    }

    writeDictionary(state, obj);
}

function writeTuple(state: BufferWriterState, arr: Array<any>): void {
    const len = arr.length;

    if (len <= 15)
        writeUint8(state, Marker.tuple_0 + len);
    else if (len <= 255) {
        writeUint8(state, Marker.tuple_255);
        writeUint8(state, len);
    } else if (len <= 65535) {
        writeUint8(state, Marker.tuple_65535);
        writeUint16(state, len);
    } else {
        writeUint8(state, Marker.tuple_4G);
        writeUint32(state, len);
    }

    for (const item of arr) writeAny(state, item);
}

function writeVector(state: BufferWriterState, view: ArrayBufferView): void {
    let len = 0;
    let typeMarker = Marker.null;
    // eslint-disable-next-line func-style
    let writerFunc: (val: number) => void = () => { /* empty */ };

    if (view instanceof Int8Array) {
        len = view.length;
        typeMarker = Marker.signed_int_8;
        writerFunc = (v) => { writeInt8(state, v); };
    } else if (view instanceof Uint8Array) {
        len = view.length;
        typeMarker = Marker.unsigned_int_8;
        writerFunc = (v) => { writeUint8(state, v); };
    } else if (view instanceof Int16Array) {
        len = view.length;
        typeMarker = Marker.signed_int_16;
        writerFunc = (v) => { writeInt16(state, v); };
    } else if (view instanceof Uint16Array) {
        len = view.length;
        typeMarker = Marker.unsigned_int_16;
        writerFunc = (v) => { writeUint16(state, v); };
    } else if (view instanceof Int32Array) {
        len = view.length;
        typeMarker = Marker.signed_int_32;
        writerFunc = (v) => { writeInt32(state, v); };
    } else if (view instanceof Uint32Array) {
        len = view.length;
        typeMarker = Marker.unsigned_int_32;
        writerFunc = (v) => { writeUint32(state, v); };
    } else if (view instanceof Float32Array) {
        len = view.length;
        typeMarker = Marker.float_single;
        writerFunc = (v) => { writeFloat32(state, v); };
    } else if (view instanceof Float64Array) {
        len = view.length;
        typeMarker = Marker.float_double;
        writerFunc = (v) => { writeFloat64(state, v); };
    } else
        throw new Error("Unsupported TypedArray for Vector serialization");

    if (len <= 15)
        writeUint8(state, Marker.vector_0 + len);
    else if (len <= 255) {
        writeUint8(state, Marker.vector_255);
        writeUint8(state, len);
    } else if (len <= 65535) {
        writeUint8(state, Marker.vector_65535);
        writeUint16(state, len);
    } else {
        writeUint8(state, Marker.vector_4G);
        writeUint32(state, len);
    }

    writeUint8(state, typeMarker);
    for (const item of view) writerFunc(item);
}

function writeDictionary(state: BufferWriterState, obj: object): void {
    const entries = Object.entries(obj);
    const len = entries.length;

    if (len <= 255) {
        writeUint8(state, Marker.dict_255);
        writeUint8(state, len);
    } else if (len <= 65535) {
        writeUint8(state, Marker.dict_65535);
        writeUint16(state, len);
    } else {
        writeUint8(state, Marker.dict_4G);
        writeUint32(state, len);
    }

    for (const [key, value] of entries) {
        writeString(state, key);
        writeAny(state, value);
    }
}

function writeMap(state: BufferWriterState, map: Map<any, any>): void {
    const len = map.size;

    if (len <= 255) {
        writeUint8(state, Marker.map_255);
        writeUint8(state, len);
    } else if (len <= 65535) {
        writeUint8(state, Marker.map_65535);
        writeUint16(state, len);
    } else {
        writeUint8(state, Marker.map_4G);
        writeUint32(state, len);
    }

    for (const [key, value] of map) {
        writeAny(state, key);
        writeAny(state, value);
    }
}

function writeError(state: BufferWriterState, error: Error): void {
    writeUint8(state, Marker.error);
    writeString(state, error.message);
}

type HBPFrameFor<M> = [typeof HBPVersion, M, ...Tail<InferHBPType<M>, Tail<typeof HBPVersion, HBPFrame>>];

export function serialize<T>(data: T): HBPFrameFor<InferHBPType<T>> {
    const state = createBufferWriter();
    writeUint8(state, HBPVersion);
    writeAny(state, data);
    return getResult(state) as unknown as HBPFrameFor<InferHBPType<T>>;
}

export function serializeValue<M extends Marker>(
    data: MarkerToType<M>,
    forcedMarker: M
): HBPFrameFor<M> {
    const state = createBufferWriter();
    writeUint8(state, HBPVersion);
    writeExplicit(state, data, forcedMarker);
    return getResult(state) as unknown as HBPFrameFor<M>;
}

