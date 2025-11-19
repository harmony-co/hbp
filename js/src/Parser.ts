import { HBPVersion, Marker } from "./Specification.js";

class BufferReader {
    private readonly view: DataView;
    private offset: number;
    private readonly textDecoder: TextDecoder;

    public constructor(buffer: Uint8Array) {
        this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        this.offset = 0;
        this.textDecoder = new TextDecoder("utf-8");
    }

    public hasBytes(n: number): boolean {
        return this.offset + n <= this.view.byteLength;
    }

    public readUint8(): number {
        const val = this.view.getUint8(this.offset);
        this.offset += 1;
        return val;
    }

    public readInt8(): number {
        const val = this.view.getInt8(this.offset);
        this.offset += 1;
        return val;
    }

    // Force Big Endian (littleEndian = false)
    public readUint16(): number {
        const val = this.view.getUint16(this.offset, false);
        this.offset += 2;
        return val;
    }

    public readInt16(): number {
        const val = this.view.getInt16(this.offset, false);
        this.offset += 2;
        return val;
    }

    public readUint32(): number {
        const val = this.view.getUint32(this.offset, false);
        this.offset += 4;
        return val;
    }

    public readInt32(): number {
        const val = this.view.getInt32(this.offset, false);
        this.offset += 4;
        return val;
    }

    public readBigInt64(): bigint {
        const val = this.view.getBigInt64(this.offset, false);
        this.offset += 8;
        return val;
    }

    public readBigUint64(): bigint {
        const val = this.view.getBigUint64(this.offset, false);
        this.offset += 8;
        return val;
    }

    public readFloat32(): number {
        const val = this.view.getFloat32(this.offset, false);
        this.offset += 4;
        return val;
    }

    public readFloat64(): number {
        const val = this.view.getFloat64(this.offset, false);
        this.offset += 8;
        return val;
    }

    // Helpers for arbitrary int reading in Big Endian
    public readBigIntBytesSigned(len: number): bigint {
        let val = 0n;
        const firstByte = this.view.getUint8(this.offset);
        const isNegative = (firstByte & 0x80) !== 0;

        for (let i = 0; i < len; i++) val = (val << 8n) | BigInt(this.view.getUint8(this.offset + i));

        this.offset += len;

        if (isNegative) {
            const limit = 1n << (BigInt(len) * 8n);
            val -= limit;
        }
        return val;
    }

    public readBigIntBytesUnsigned(len: number): bigint {
        let val = 0n;
        for (let i = 0; i < len; i++) val = (val << 8n) | BigInt(this.view.getUint8(this.offset + i));

        this.offset += len;
        return val;
    }

    public readBytes(len: number): Uint8Array {
        const buf = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
        this.offset += len;
        return buf;
    }

    public readString(len: number): string {
        const bytes = this.readBytes(len);
        return this.textDecoder.decode(bytes);
    }

    public getOffset(): number {
        return this.offset;
    }
}

export class HBPParser {
    private readonly reader: BufferReader;

    public constructor(buffer: Uint8Array) {
        this.reader = new BufferReader(buffer);

        const version = this.reader.readUint8();
        if (version !== HBPVersion)
            throw new Error(`Unsupported HBP Version: ${version}`);
    }

    public parse(): any {
        return this.parseValue();
    }

    private parseValue(): string | number | bigint | boolean | object | null {
        const marker: Marker = this.reader.readUint8();

        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (marker) {
            case Marker.null: return null;
            case Marker.false: return false;
            case Marker.true: return true;

            case Marker.signed_int_8: return this.reader.readInt8();
            case Marker.signed_int_16: return this.reader.readInt16();
            case Marker.signed_int_32: return this.reader.readInt32();
            case Marker.signed_int_64: return this.reader.readBigInt64();
            case Marker.signed_int_128: return this.reader.readBigIntBytesSigned(16);
            case Marker.signed_int_256: return this.reader.readBigIntBytesSigned(32);
            case Marker.signed_int_512: return this.reader.readBigIntBytesSigned(64);

            case Marker.signed_int_arbitrary: {
                const len = this.reader.readUint16();
                return this.reader.readBigIntBytesSigned(len);
            }

            case Marker.unsigned_int_8: return this.reader.readUint8();
            case Marker.unsigned_int_16: return this.reader.readUint16();
            case Marker.unsigned_int_32: return this.reader.readUint32();
            case Marker.unsigned_int_64: return this.reader.readBigUint64();
            case Marker.unsigned_int_128: return this.reader.readBigIntBytesUnsigned(16);
            case Marker.unsigned_int_256: return this.reader.readBigIntBytesUnsigned(32);
            case Marker.unsigned_int_512: return this.reader.readBigIntBytesUnsigned(64);

            case Marker.unsigned_int_arbitrary: {
                const len = this.reader.readUint16();
                return this.reader.readBigIntBytesUnsigned(len);
            }

            case Marker.float_single: return this.reader.readFloat32();
            case Marker.float_double: return this.reader.readFloat64();

            case Marker.string_utf8_0: return "";
            case Marker.string_utf8_1: return this.reader.readString(1);
            case Marker.string_utf8_2: return this.reader.readString(2);
            case Marker.string_utf8_3: return this.reader.readString(3);
            case Marker.string_utf8_4: return this.reader.readString(4);
            case Marker.string_utf8_5: return this.reader.readString(5);
            case Marker.string_utf8_6: return this.reader.readString(6);
            case Marker.string_utf8_7: return this.reader.readString(7);
            case Marker.string_utf8_8: return this.reader.readString(8);
            case Marker.string_utf8_9: return this.reader.readString(9);
            case Marker.string_utf8_10: return this.reader.readString(10);
            case Marker.string_utf8_11: return this.reader.readString(11);
            case Marker.string_utf8_12: return this.reader.readString(12);
            case Marker.string_utf8_13: return this.reader.readString(13);
            case Marker.string_utf8_14: return this.reader.readString(14);
            case Marker.string_utf8_15: return this.reader.readString(15);

            case Marker.string_utf8_255: return this.reader.readString(this.reader.readUint8());
            case Marker.string_utf8_65535: return this.reader.readString(this.reader.readUint16());
            case Marker.string_utf8_4G: return this.reader.readString(this.reader.readUint32());

            case Marker.tuple_0: return [];
            case Marker.tuple_1: return this.parseTuple(1);
            case Marker.tuple_2: return this.parseTuple(2);
            case Marker.tuple_3: return this.parseTuple(3);
            case Marker.tuple_4: return this.parseTuple(4);
            case Marker.tuple_5: return this.parseTuple(5);
            case Marker.tuple_6: return this.parseTuple(6);
            case Marker.tuple_7: return this.parseTuple(7);
            case Marker.tuple_8: return this.parseTuple(8);
            case Marker.tuple_9: return this.parseTuple(9);
            case Marker.tuple_10: return this.parseTuple(10);
            case Marker.tuple_11: return this.parseTuple(11);
            case Marker.tuple_12: return this.parseTuple(12);
            case Marker.tuple_13: return this.parseTuple(13);
            case Marker.tuple_14: return this.parseTuple(14);
            case Marker.tuple_15: return this.parseTuple(15);

            case Marker.tuple_255: return this.parseTuple(this.reader.readUint8());
            case Marker.tuple_65535: return this.parseTuple(this.reader.readUint16());
            case Marker.tuple_4G: return this.parseTuple(this.reader.readUint32());

            case Marker.vector_0: return this.parseVector(0);
            case Marker.vector_1: return this.parseVector(1);
            case Marker.vector_2: return this.parseVector(2);
            case Marker.vector_3: return this.parseVector(3);
            case Marker.vector_4: return this.parseVector(4);
            case Marker.vector_5: return this.parseVector(5);
            case Marker.vector_6: return this.parseVector(6);
            case Marker.vector_7: return this.parseVector(7);
            case Marker.vector_8: return this.parseVector(8);
            case Marker.vector_9: return this.parseVector(9);
            case Marker.vector_10: return this.parseVector(10);
            case Marker.vector_11: return this.parseVector(11);
            case Marker.vector_12: return this.parseVector(12);
            case Marker.vector_13: return this.parseVector(13);
            case Marker.vector_14: return this.parseVector(14);
            case Marker.vector_15: return this.parseVector(15);

            case Marker.vector_255: return this.parseVector(this.reader.readUint8());
            case Marker.vector_65535: return this.parseVector(this.reader.readUint16());
            case Marker.vector_4G: return this.parseVector(this.reader.readUint32());

            case Marker.dict_255: return this.parseDictionary(this.reader.readUint8());
            case Marker.dict_65535: return this.parseDictionary(this.reader.readUint16());
            case Marker.dict_4G: return this.parseDictionary(this.reader.readUint32());

            case Marker.map_255: return this.parseMap(this.reader.readUint8());
            case Marker.map_65535: return this.parseMap(this.reader.readUint16());
            case Marker.map_4G: return this.parseMap(this.reader.readUint32());

            default:
                throw new Error(`Unknown or Unimplemented Marker: 0x${marker.toString(16)}`);
        }
    }

    private parseTuple<T>(length: number): Array<T> {
        const arr = new Array(length);
        for (let i = 0; i < length; i++) arr[i] = this.parseValue();

        return arr as Array<T>;
    }

    private parseVector(length: number): Float32Array | Float64Array | Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array {
        if (length === 0) return new Uint8Array(0);
        const typeMarker: Marker = this.reader.readUint8();

        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (typeMarker) {
            case Marker.signed_int_8: {
                const arr = new Int8Array(length);
                for (let i = 0; i < length; i++) arr[i] = this.reader.readInt8();
                return arr;
            }
            case Marker.unsigned_int_8: {
                const arr = new Uint8Array(length);
                for (let i = 0; i < length; i++) arr[i] = this.reader.readUint8();
                return arr;
            }
            case Marker.signed_int_16: {
                const arr = new Int16Array(length);
                for (let i = 0; i < length; i++) arr[i] = this.reader.readInt16();
                return arr;
            }
            case Marker.unsigned_int_16: {
                const arr = new Uint16Array(length);
                for (let i = 0; i < length; i++) arr[i] = this.reader.readUint16();
                return arr;
            }
            case Marker.signed_int_32: {
                const arr = new Int32Array(length);
                for (let i = 0; i < length; i++) arr[i] = this.reader.readInt32();
                return arr;
            }
            case Marker.unsigned_int_32: {
                const arr = new Uint32Array(length);
                for (let i = 0; i < length; i++) arr[i] = this.reader.readUint32();
                return arr;
            }
            case Marker.float_single: {
                const arr = new Float32Array(length);
                for (let i = 0; i < length; i++) arr[i] = this.reader.readFloat32();
                return arr;
            }
            case Marker.float_double: {
                const arr = new Float64Array(length);
                for (let i = 0; i < length; i++) arr[i] = this.reader.readFloat64();
                return arr;
            }
            default:
                throw new Error(`Unimplemented Vector Type: 0x${typeMarker.toString(16)}`);
        }
    }

    private parseDictionary(length: number): object {
        const obj: Record<string, any> = {};
        for (let i = 0; i < length; i++) {
            const key = this.parseValue();
            if (typeof key !== "string") throw new Error("Dictionary key must be a string");

            const value = this.parseValue();
            obj[key] = value;
        }
        return obj;
    }

    private parseMap(length: number): Map<any, any> {
        const map = new Map();
        for (let i = 0; i < length; i++) {
            const key = this.parseValue();
            const value = this.parseValue();
            map.set(key, value);
        }
        return map;
    }
}
