import { HBPVersion, Marker } from "./Specification.js";

class BufferWriter {
    private buffer: Uint8Array;
    private offset: number;
    private view: DataView;

    public constructor(initialSize: number = 1024) {
        this.buffer = new Uint8Array(initialSize);
        this.view = new DataView(this.buffer.buffer);
        this.offset = 0;
    }

    public ensureCapacity(needed: number): void {
        if (this.offset + needed > this.buffer.length) {
            const newSize = Math.max(this.buffer.length * 2, this.offset + needed);
            const newBuffer = new Uint8Array(newSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            this.view = new DataView(this.buffer.buffer);
        }
    }

    public writeUint8(value: number): void {
        this.ensureCapacity(1);
        this.view.setUint8(this.offset, value);
        this.offset += 1;
    }

    public writeInt8(value: number): void {
        this.ensureCapacity(1);
        this.view.setInt8(this.offset, value);
        this.offset += 1;
    }

    public writeUint16(value: number): void {
        this.ensureCapacity(2);
        this.view.setUint16(this.offset, value, false);
        this.offset += 2;
    }

    public writeInt16(value: number): void {
        this.ensureCapacity(2);
        this.view.setInt16(this.offset, value, false);
        this.offset += 2;
    }

    public writeUint32(value: number): void {
        this.ensureCapacity(4);
        this.view.setUint32(this.offset, value, false);
        this.offset += 4;
    }

    public writeInt32(value: number): void {
        this.ensureCapacity(4);
        this.view.setInt32(this.offset, value, false);
        this.offset += 4;
    }

    public writeBigInt64(value: bigint): void {
        this.ensureCapacity(8);
        this.view.setBigInt64(this.offset, value, false);
        this.offset += 8;
    }

    public writeBigUint64(value: bigint): void {
        this.ensureCapacity(8);
        this.view.setBigUint64(this.offset, value, false);
        this.offset += 8;
    }

    public writeBigIntBytes(value: bigint, byteLength: number): void {
        this.ensureCapacity(byteLength);
        let tempVal = value;
        // Write in Big Endian order: MSB at lowest offset
        // We iterate from end of buffer backwards for simple extraction
        for (let i = byteLength - 1; i >= 0; i--) {
            const byte = Number(tempVal & 0xFFn);
            this.view.setUint8(this.offset + i, byte);
            tempVal >>= 8n;
        }
        this.offset += byteLength;
    }

    public writeFloat32(value: number): void {
        this.ensureCapacity(4);
        this.view.setFloat32(this.offset, value, false);
        this.offset += 4;
    }

    public writeFloat64(value: number): void {
        this.ensureCapacity(8);
        this.view.setFloat64(this.offset, value, false);
        this.offset += 8;
    }

    public writeBuffer(buf: Uint8Array): void {
        this.ensureCapacity(buf.length);
        this.buffer.set(buf, this.offset);
        this.offset += buf.length;
    }

    public getResult(): Uint8Array {
        return this.buffer.slice(0, this.offset);
    }
}

export class HBPSerializer {
    private writer: BufferWriter;
    private readonly textEncoder: TextEncoder;

    public constructor() {
        this.writer = new BufferWriter();
        this.textEncoder = new TextEncoder();
    }

    public serialize(data: unknown): Uint8Array {
        this.writer = new BufferWriter();
        this.writer.writeUint8(HBPVersion);
        this.writeAny(data);
        return this.writer.getResult();
    }

    // Exposed for testing specific markers
    public serializeValue(data: any, forcedMarker: Marker): Uint8Array {
        this.writer = new BufferWriter();
        this.writer.writeUint8(HBPVersion);
        this.writeExplicit(data, forcedMarker);
        return this.writer.getResult();
    }

    private writeExplicit(data: any, marker: Marker): void {
        this.writer.writeUint8(marker);
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (marker) {
            case Marker.signed_int_8: this.writer.writeInt8(Number(data)); break;
            case Marker.signed_int_16: this.writer.writeInt16(Number(data)); break;
            case Marker.signed_int_32: this.writer.writeInt32(Number(data)); break;
            case Marker.signed_int_64: this.writer.writeBigInt64(BigInt(data as number)); break;
            case Marker.signed_int_128: this.writer.writeBigIntBytes(BigInt(data as number), 16); break;
            case Marker.signed_int_256: this.writer.writeBigIntBytes(BigInt(data as number), 32); break;
            case Marker.signed_int_512: this.writer.writeBigIntBytes(BigInt(data as number), 64); break;

            case Marker.unsigned_int_8: this.writer.writeUint8(Number(data)); break;
            case Marker.unsigned_int_16: this.writer.writeUint16(Number(data)); break;
            case Marker.unsigned_int_32: this.writer.writeUint32(Number(data)); break;
            case Marker.unsigned_int_64: this.writer.writeBigUint64(BigInt(data as number)); break;
            case Marker.unsigned_int_128: this.writer.writeBigIntBytes(BigInt(data as number), 16); break;
            case Marker.unsigned_int_256: this.writer.writeBigIntBytes(BigInt(data as number), 32); break;
            case Marker.unsigned_int_512: this.writer.writeBigIntBytes(BigInt(data as number), 64); break;

            case Marker.signed_int_arbitrary:
            case Marker.unsigned_int_arbitrary:
                this.writeArbitraryInt(data as bigint);
                break;
            default:
                // Fallback to auto-detection if strict marker logic isn't defined here
                this.writeAny(data);
        }
    }

    private writeAny(data: unknown): void {
        if (data === null || data === undefined) {
            this.writer.writeUint8(Marker.null);
            return;
        }

        const type = typeof data;

        switch (type) {
            case "boolean":
                this.writer.writeUint8(data === true ? Marker.true : Marker.false);
                break;
            case "number":
                this.writeNumber(data as number);
                break;
            case "string":
                this.writeString(data as string);
                break;
            case "bigint":
                this.writeBigIntAuto(data as bigint);
                break;
            case "object":
                this.writeObject(data as object);
                break;
            case "symbol": { throw new Error('Unsupported type: "symbol"'); }
            case "undefined": { throw new Error('Unsupported type: "undefined"'); }
            case "function": { throw new Error('Unsupported type: "function"'); }
        }
    }

    private writeNumber(num: number): void {
        // Default to double for JS numbers to ensure precision/special values (NaN/Infinity) are preserved
        // Optimization for small integers could go here if desired
        this.writer.writeUint8(Marker.float_double);
        this.writer.writeFloat64(num);
    }

    private writeBigIntAuto(num: bigint): void {
        if (num < 0n) {
            // Signed
            if (num >= -128n) {
                this.writer.writeUint8(Marker.signed_int_8);
                this.writer.writeInt8(Number(num));
            } else if (num >= -32768n) {
                this.writer.writeUint8(Marker.signed_int_16);
                this.writer.writeInt16(Number(num));
            } else if (num >= -2147483648n) {
                this.writer.writeUint8(Marker.signed_int_32);
                this.writer.writeInt32(Number(num));
            } else if (num >= -9223372036854775808n) {
                this.writer.writeUint8(Marker.signed_int_64);
                this.writer.writeBigInt64(num);
            } else if (num >= -(1n << 127n)) {
                this.writer.writeUint8(Marker.signed_int_128);
                this.writer.writeBigIntBytes(num, 16);
            } else if (num >= -(1n << 255n)) {
                this.writer.writeUint8(Marker.signed_int_256);
                this.writer.writeBigIntBytes(num, 32);
            } else if (num >= -(1n << 511n)) {
                this.writer.writeUint8(Marker.signed_int_512);
                this.writer.writeBigIntBytes(num, 64);
            } else {
                this.writer.writeUint8(Marker.signed_int_arbitrary);
                this.writeArbitraryInt(num);
            }
        } else {
            // Unsigned preference
            // eslint-disable-next-line no-lonely-if
            if (num <= 255n) {
                this.writer.writeUint8(Marker.unsigned_int_8);
                this.writer.writeUint8(Number(num));
            } else if (num <= 65535n) {
                this.writer.writeUint8(Marker.unsigned_int_16);
                this.writer.writeUint16(Number(num));
            } else if (num <= 4294967295n) {
                this.writer.writeUint8(Marker.unsigned_int_32);
                this.writer.writeUint32(Number(num));
            } else if (num <= 18446744073709551615n) {
                this.writer.writeUint8(Marker.unsigned_int_64);
                this.writer.writeBigUint64(num);
            } else if (num < (1n << 128n)) {
                this.writer.writeUint8(Marker.unsigned_int_128);
                this.writer.writeBigIntBytes(num, 16);
            } else if (num < (1n << 256n)) {
                this.writer.writeUint8(Marker.unsigned_int_256);
                this.writer.writeBigIntBytes(num, 32);
            } else if (num < (1n << 512n)) {
                this.writer.writeUint8(Marker.unsigned_int_512);
                this.writer.writeBigIntBytes(num, 64);
            } else {
                this.writer.writeUint8(Marker.unsigned_int_arbitrary);
                this.writeArbitraryInt(num);
            }
        }
    }

    private writeArbitraryInt(num: bigint): void {
        const isNegative = num < 0n;
        if (isNegative) num = -num;

        let tmp = num;
        let byteLen = 0;
        while (tmp > 0n) {
            byteLen++;
            tmp >>= 8n;
        }
        if (byteLen === 0) byteLen = 1;

        this.writer.writeUint16(byteLen);

        const buffer = Buffer.allocUnsafe(byteLen);
        for (let i = byteLen - 1; i >= 0; i--) {
            buffer[i] = Number(num & 0xFFn);
            num >>= 8n;
        }

        for (let i = 0; i < byteLen; i++) this.writer.writeUint8(buffer[i]);
    }

    private writeString(str: string): void {
        const bytes = this.textEncoder.encode(str);
        const len = bytes.length;

        if (len <= 15)
            this.writer.writeUint8(Marker.string_utf8_0 + len);
        else if (len <= 255) {
            this.writer.writeUint8(Marker.string_utf8_255);
            this.writer.writeUint8(len);
        } else if (len <= 65535) {
            this.writer.writeUint8(Marker.string_utf8_65535);
            this.writer.writeUint16(len);
        } else {
            this.writer.writeUint8(Marker.string_utf8_4G);
            this.writer.writeUint32(len);
        }
        this.writer.writeBuffer(bytes);
    }

    private writeObject(obj: object): void {
        if (Array.isArray(obj)) {
            this.writeTuple(obj);
            return;
        }

        if (obj instanceof Map) {
            this.writeMap(obj);
            return;
        }

        if (ArrayBuffer.isView(obj)) {
            this.writeVector(obj);
            return;
        }

        this.writeDictionary(obj);
    }

    private writeTuple(arr: Array<any>): void {
        const len = arr.length;

        if (len <= 15)
            this.writer.writeUint8(Marker.tuple_0 + len);
        else if (len <= 255) {
            this.writer.writeUint8(Marker.tuple_255);
            this.writer.writeUint8(len);
        } else if (len <= 65535) {
            this.writer.writeUint8(Marker.tuple_65535);
            this.writer.writeUint16(len);
        } else {
            this.writer.writeUint8(Marker.tuple_4G);
            this.writer.writeUint32(len);
        }

        for (const item of arr) this.writeAny(item);
    }

    private writeVector(view: ArrayBufferView): void {
        let len = 0;
        let typeMarker = Marker.null;
        // eslint-disable-next-line func-style
        let writerFunc: (val: number) => void = () => { /* empty */ };

        if (view instanceof Int8Array) {
            len = view.length;
            typeMarker = Marker.signed_int_8;
            writerFunc = (v) => { this.writer.writeInt8(v); };
        } else if (view instanceof Uint8Array) {
            len = view.length;
            typeMarker = Marker.unsigned_int_8;
            writerFunc = (v) => { this.writer.writeUint8(v); };
        } else if (view instanceof Int16Array) {
            len = view.length;
            typeMarker = Marker.signed_int_16;
            writerFunc = (v) => { this.writer.writeInt16(v); };
        } else if (view instanceof Uint16Array) {
            len = view.length;
            typeMarker = Marker.unsigned_int_16;
            writerFunc = (v) => { this.writer.writeUint16(v); };
        } else if (view instanceof Int32Array) {
            len = view.length;
            typeMarker = Marker.signed_int_32;
            writerFunc = (v) => { this.writer.writeInt32(v); };
        } else if (view instanceof Uint32Array) {
            len = view.length;
            typeMarker = Marker.unsigned_int_32;
            writerFunc = (v) => { this.writer.writeUint32(v); };
        } else if (view instanceof Float32Array) {
            len = view.length;
            typeMarker = Marker.float_single;
            writerFunc = (v) => { this.writer.writeFloat32(v); };
        } else if (view instanceof Float64Array) {
            len = view.length;
            typeMarker = Marker.float_double;
            writerFunc = (v) => { this.writer.writeFloat64(v); };
        } else
            throw new Error("Unsupported TypedArray for Vector serialization");

        if (len <= 15)
            this.writer.writeUint8(Marker.vector_0 + len);
        else if (len <= 255) {
            this.writer.writeUint8(Marker.vector_255);
            this.writer.writeUint8(len);
        } else if (len <= 65535) {
            this.writer.writeUint8(Marker.vector_65535);
            this.writer.writeUint16(len);
        } else {
            this.writer.writeUint8(Marker.vector_4G);
            this.writer.writeUint32(len);
        }

        this.writer.writeUint8(typeMarker);
        for (const item of view) writerFunc(item);
    }

    private writeDictionary(obj: object): void {
        const entries = Object.entries(obj);
        const len = entries.length;

        if (len <= 255) {
            this.writer.writeUint8(Marker.dict_255);
            this.writer.writeUint8(len);
        } else if (len <= 65535) {
            this.writer.writeUint8(Marker.dict_65535);
            this.writer.writeUint16(len);
        } else {
            this.writer.writeUint8(Marker.dict_4G);
            this.writer.writeUint32(len);
        }

        for (const [key, value] of entries) {
            this.writeString(key);
            this.writeAny(value);
        }
    }

    private writeMap(map: Map<any, any>): void {
        const len = map.size;

        if (len <= 255) {
            this.writer.writeUint8(Marker.map_255);
            this.writer.writeUint8(len);
        } else if (len <= 65535) {
            this.writer.writeUint8(Marker.map_65535);
            this.writer.writeUint16(len);
        } else {
            this.writer.writeUint8(Marker.map_4G);
            this.writer.writeUint32(len);
        }

        for (const [key, value] of map) {
            this.writeAny(key);
            this.writeAny(value);
        }
    }
}
