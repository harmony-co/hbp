import { test } from 'node:test';
import assert from 'node:assert';

import {
    parse,
    serialize,
    Marker,
} from '../dist/src/index.js';

test('parseBool', () => {
    assert.strictEqual(parse(new Uint8Array([0x01, 0x01])), false);
    assert.strictEqual(parse(new Uint8Array([0x01, 0x02])), true);
});

test('parseInt (Little Endian)', () => {
    const cases = [
        [0x01, 0x10, 0x2D], // i8
        [0x01, 0x11, 0xCB, 0x18], // i16
        [0x01, 0x12, 0x60, 0x36, 0x8B, 0x00], // i32
        [0x01, 0x13, 0xFF, 0xC9, 0x9A, 0x3B, 0x01, 0x00, 0x00, 0x00], // i64

        // i128
        [0x01, 0x14,
            0xFF, 0xFF, 0xE7, 0x89, 0x04, 0x23, 0xC7, 0x8A,
            0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],

        // i256
        [0x01, 0x15,
            0x00, 0x80, 0xC6, 0xA4, 0x7E, 0x8D, 0x03, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],

        // unsigned
        [0x01, 0x20, 0xFA], // u8
        [0x01, 0x21, 0xCB, 0x18], // u16
        [0x01, 0x22, 0x60, 0x36, 0x8B, 0x00], // u32
        [0x01, 0x23, 0xFF, 0xC9, 0x9A, 0x3B, 0x01, 0x00, 0x00, 0x00], // u64
    ];

    const expected = [
        45n,
        6347n,
        9123424n,
        5294967295n,
        28446744073709551615n,
        340282366920938463463375607431768211456n,

        // unsigned
        250n,
        6347n,
        9123424n,
        5294967295n,
    ];

    for (let i = 0; i < cases.length; i++) {
        const result = parse(new Uint8Array(cases[i]));
        assert.strictEqual(BigInt(result), expected[i], `Case ${i} failed`);
    }
});

test("parseString", () => {
    const cases = [
        [0x01, 0x6B, 0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F, 0x72, 0x6C, 0x64],
    ];

    const expected = [
        "Hello World",
    ];

    for (let i = 0; i < cases.length; i++) {
        const result = parse(new Uint8Array(cases[i]));
        assert.strictEqual(result, expected[i], `Case ${i} failed`);
    }
});

test("parseStringCounter (Negative Tests)", () => {
    assert.throws(() => {
        parse(new Uint8Array(
            [0x01, 0xAA, 0x20, 0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F, 0x72, 0x6C, 0x64]
        ));
    }, /Unknown or Unimplemented Marker: 0xaa/i);
});

test("parseFloat", () => {
    const float32Buffer = new Uint8Array(6);
    float32Buffer[0] = 0x01;
    float32Buffer[1] = Marker.float_single;
    new DataView(float32Buffer.buffer).setFloat32(2, 3.14159, true);

    const result32 = parse(float32Buffer);
    assert.ok(Math.abs(result32 - 3.14159) < 0.0001, `Float32 parse failed, got ${result32}`);


    const float64Buffer = new Uint8Array(10);
    float64Buffer[0] = 0x01;
    float64Buffer[1] = Marker.float_double;
    new DataView(float64Buffer.buffer).setFloat64(2, 3.141592653589793, true);

    const result64 = parse(float64Buffer);
    assert.strictEqual(result64, 3.141592653589793, `Float64 parse failed, got ${result64}`);
});

test("parseTuple", () => {
    const emptyTuple = parse(new Uint8Array([0x01, Marker.tuple_0]));
    assert.deepStrictEqual(emptyTuple, []);


    const mixedTuple = serialize([42, "test", true]);
    const parsedMixed = parse(mixedTuple);
    assert.strictEqual(parsedMixed.length, 3);
    assert.strictEqual(parsedMixed[0], 42);
    assert.strictEqual(parsedMixed[1], "test");
    assert.strictEqual(parsedMixed[2], true);
});

test("parseVector", () => {
    const int8Vec = serialize(new Int8Array([1, 2, 3, -4, -5]));
    const parsedInt8 = parse(int8Vec);
    assert.ok(parsedInt8 instanceof Int8Array);
    assert.deepStrictEqual([...parsedInt8], [1, 2, 3, -4, -5]);


    const uint8Vec = serialize(new Uint8Array([10, 20, 30, 40, 50]));
    const parsedUint8 = parse(uint8Vec);
    assert.ok(parsedUint8 instanceof Uint8Array);
    assert.deepStrictEqual([...parsedUint8], [10, 20, 30, 40, 50]);


    const float32Vec = serialize(new Float32Array([1.5, 2.5, 3.5]));
    const parsedFloat32 = parse(float32Vec);
    assert.ok(parsedFloat32 instanceof Float32Array);
    assert.ok(Math.abs(parsedFloat32[0] - 1.5) < 0.001);
    assert.ok(Math.abs(parsedFloat32[1] - 2.5) < 0.001);
    assert.ok(Math.abs(parsedFloat32[2] - 3.5) < 0.001);


    const float64Vec = serialize(new Float64Array([1.111, 2.222, 3.333]));
    const parsedFloat64 = parse(float64Vec);
    assert.ok(parsedFloat64 instanceof Float64Array);
    assert.strictEqual(parsedFloat64[0], 1.111);
    assert.strictEqual(parsedFloat64[1], 2.222);
    assert.strictEqual(parsedFloat64[2], 3.333);
});

test("parseDictionary", () => {
    const dict = { name: "John", age: 30, active: true };
    const serialized = serialize(dict);
    const parsed = parse(serialized);

    assert.strictEqual(parsed.name, "John");
    assert.strictEqual(parsed.age, 30);
    assert.strictEqual(parsed.active, true);
});

test("parseMap", () => {

    const map = new Map();
    map.set(1n, "one");
    map.set(2n, "two");
    map.set(3n, "three");

    const serialized = serialize(map);
    const parsed = parse(serialized);

    assert.ok(parsed instanceof Map);
    assert.strictEqual(parsed.size, 3);

    assert.strictEqual(parsed.get(1), "one");
    assert.strictEqual(parsed.get(2), "two");
    assert.strictEqual(parsed.get(3), "three");
});

test("parseNestedStructures", () => {
    const nested = [
        { name: "Alice", scores: new Uint8Array([95, 87, 92]) },
        { name: "Bob", scores: new Uint8Array([88, 91, 85]) }
    ];

    const serialized = serialize(nested);
    const parsed = parse(serialized);

    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].name, "Alice");
    assert.ok(parsed[0].scores instanceof Uint8Array);
    assert.deepStrictEqual([...parsed[0].scores], [95, 87, 92]);
    assert.strictEqual(parsed[1].name, "Bob");
    assert.deepStrictEqual([...parsed[1].scores], [88, 91, 85]);
});

test("parseNull", () => {
    const serialized = serialize(null);
    const parsed = parse(serialized);
    assert.strictEqual(parsed, null);
});

test("parseLongString", () => {
    const longStr = "This is a longer string that exceeds fifteen bytes";
    const serialized = serialize(longStr);
    const parsed = parse(serialized);
    assert.strictEqual(parsed, longStr);
});

test("parseLargeTuple", () => {
    const largeTuple = Array.from({ length: 20 }, (_, i) => i);
    const serialized = serialize(largeTuple);
    const parsed = parse(serialized);
    assert.deepStrictEqual(parsed, largeTuple);
});

test("parseError", () => {
    const error = new Error("Something went wrong");
    const serialized = serialize(error);
    const parsed = parse(serialized);

    assert.ok(parsed instanceof Error);
    assert.strictEqual(parsed.message, "Something went wrong");
});

test("roundTripFidelity", () => {

    const testCases = [
        { value: null, expected: null },
        { value: true, expected: true },
        { value: false, expected: false },
        { value: 42n, expected: 42 },
        { value: -42n, expected: -42 },
        { value: "hello", expected: "hello" },
        { value: [1, 2, 3], expected: [1, 2, 3] },
        { value: { a: 1, b: 2 }, expected: { a: 1, b: 2 } },
        { value: new Uint8Array([1, 2, 3]), expected: new Uint8Array([1, 2, 3]) },
        { value: new Float32Array([1.5, 2.5]), expected: new Float32Array([1.5, 2.5]) },
    ];

    for (const { value: testCase, expected } of testCases) {
        const serialized = serialize(testCase);
        const parsed = parse(serialized);

        if (ArrayBuffer.isView(testCase)) {
            assert.deepStrictEqual([...parsed], [...expected]);
        } else if (testCase instanceof Map) {
            assert.deepStrictEqual([...parsed.entries()], [...expected.entries()]);
        } else if (typeof expected === "object" && expected !== null) {
            assert.deepStrictEqual(parsed, expected);
        } else {
            assert.strictEqual(parsed, expected);
        }
    }
});
