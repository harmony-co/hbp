import { test } from 'node:test';
import assert from 'node:assert';

import {
    Marker,
    serialize,
    serializeValue,
    parse,
} from '../dist/src/index.js';

test('serializeNull', () => {
    assert.deepStrictEqual(serialize(null), new Uint8Array([0x01, 0x00]));
});

test('serializeBool', () => {
    assert.deepStrictEqual(serialize(false), new Uint8Array([0x01, 0x01]));
    assert.deepStrictEqual(serialize(true), new Uint8Array([0x01, 0x02]));
});

test('serializeInt (Little Endian)', () => {
    const cases = [
        [45n, Marker.signed_int_8, [0x01, 0x10, 0x2D]],
        [6347n, Marker.signed_int_16, [0x01, 0x11, 0xCB, 0x18]],
        [9123424n, Marker.signed_int_32, [0x01, 0x12, 0x60, 0x36, 0x8B, 0x00]],
        [5294967295n, Marker.signed_int_64, [0x01, 0x13, 0xFF, 0xC9, 0x9A, 0x3B, 0x01, 0x00, 0x00, 0x00]],

        [28446744073709551615n, Marker.signed_int_128, [
            0x01, 0x14,
            0xFF, 0xFF, 0xE7, 0x89, 0x04, 0x23, 0xC7, 0x8A,
            0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]],

        [340282366920938463463375607431768211456n, Marker.signed_int_256, [
            0x01, 0x15,
            0x00, 0x80, 0xC6, 0xA4, 0x7E, 0x8D, 0x03, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]],
        [115792089237316395423570985008687907853269984665640564039457584007913129639935n, Marker.signed_int_512, [
            0x01, 0x16,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F,
            0x94, 0x29, 0x59, 0xEF, 0xD3, 0xB2, 0xC3, 0x44,
            0x70, 0xE9, 0xC5, 0x6A, 0x70, 0xC2, 0x95, 0xD6,
            0x75, 0x7C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]],

        [30n, Marker.signed_int_arbitrary, [0x01, 0x1F, 0x01, 0x00, 0x1E]],
        [9123424n, Marker.signed_int_arbitrary, [0x01, 0x1F, 0x03, 0x00, 0x60, 0x36, 0x8B]],
        [5294967295n, Marker.signed_int_arbitrary, [0x01, 0x1F, 0x05, 0x00, 0xFF, 0xC9, 0x9A, 0x3B, 0x01]],

        [250n, Marker.unsigned_int_8, [0x01, 0x20, 0xFA]],
        [6347n, Marker.unsigned_int_16, [0x01, 0x21, 0xCB, 0x18]],
        [9123424n, Marker.unsigned_int_32, [0x01, 0x22, 0x60, 0x36, 0x8B, 0x00]],
        [5294967295n, Marker.unsigned_int_64, [0x01, 0x23, 0xFF, 0xC9, 0x9A, 0x3B, 0x01, 0x00, 0x00, 0x00]],
    ];

    for (let [value, type, expected] of cases) {
        const result = serializeValue(value, type);
        assert.deepStrictEqual(result, new Uint8Array(expected), `Failed for value ${value} (${type})`);
    }
});

test('serializeString', () => {
    const cases = [
        ["Hello World", [0x01, 0x6B, 0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F, 0x72, 0x6C, 0x64]],
    ];

    for (let [str, expected] of cases) {
        const result = serialize(str);
        assert.deepStrictEqual(result, new Uint8Array(expected), `Failed for string "${str}"`);
    }
});

test('serializeFloat', () => {
    const num = 3.14159;
    const serialized = serialize(num);

    assert.strictEqual(serialized[0], 0x01);
    assert.strictEqual(serialized[1], Marker.float_double);

    const parsed = parse(serialized);
    assert.strictEqual(parsed, num);
});

test('serializeTuple', () => {
    const emptyTuple = serialize([]);
    assert.strictEqual(emptyTuple[1], Marker.tuple_0);


    const smallTuple = serialize([1, 2, 3]);
    assert.strictEqual(smallTuple[1], Marker.tuple_3);


    const largeTuple = serialize(Array.from({ length: 20 }, (_, i) => i));
    assert.strictEqual(largeTuple[1], Marker.tuple_255);
});

test('serializeVector', () => {
    const int8 = serialize(new Int8Array([1, 2, 3]));
    assert.strictEqual(int8[1], Marker.vector_3);
    assert.strictEqual(int8[2], Marker.signed_int_8);


    const uint8 = serialize(new Uint8Array([1, 2, 3]));
    assert.strictEqual(uint8[1], Marker.vector_3);
    assert.strictEqual(uint8[2], Marker.unsigned_int_8);


    const float32 = serialize(new Float32Array([1.5, 2.5]));
    assert.strictEqual(float32[1], Marker.vector_2);
    assert.strictEqual(float32[2], Marker.float_single);


    const float64 = serialize(new Float64Array([1.5, 2.5]));
    assert.strictEqual(float64[1], Marker.vector_2);
    assert.strictEqual(float64[2], Marker.float_double);
});

test('serializeDictionary', () => {
    const dict = { name: "Alice", age: 30 };
    const serialized = serialize(dict);

    assert.strictEqual(serialized[0], 0x01);
    assert.strictEqual(serialized[1], Marker.dict_255);
    assert.strictEqual(serialized[2], 2);

    const parsed = parse(serialized);
    assert.deepStrictEqual(parsed, dict);
});

test('serializeMap', () => {
    const map = new Map();
    map.set(1n, "one");
    map.set(2n, "two");

    const serialized = serialize(map);

    assert.strictEqual(serialized[0], 0x01);
    assert.strictEqual(serialized[1], Marker.map_255);
    assert.strictEqual(serialized[2], 2);

    const parsed = parse(serialized);
    assert.ok(parsed instanceof Map);
    assert.strictEqual(parsed.size, 2);
});

test('serializeError', () => {
    const error = new Error("Test error message");
    const serialized = serialize(error);

    assert.strictEqual(serialized[0], 0x01);
    assert.strictEqual(serialized[1], Marker.error);

    const parsed = parse(serialized);
    assert.ok(parsed instanceof Error);
    assert.strictEqual(parsed.message, "Test error message");
});

test('serializeLongString', () => {
    const str16 = "a".repeat(16);
    const serialized16 = serialize(str16);
    assert.strictEqual(serialized16[1], Marker.string_utf8_255);
    assert.strictEqual(serialized16[2], 16);


    const str256 = "a".repeat(256);
    const serialized256 = serialize(str256);
    assert.strictEqual(serialized256[1], Marker.string_utf8_65535);
});

test('serializeNestedStructures', () => {
    const nested = {
        users: [
            { name: "Alice", scores: new Uint8Array([95, 87, 92]) },
            { name: "Bob", scores: new Uint8Array([88, 91, 85]) }
        ],
        metadata: {
            created: "2024-01-01",
            version: 1n
        }
    };

    const serialized = serialize(nested);
    const parsed = parse(serialized);

    assert.strictEqual(parsed.users.length, 2);
    assert.strictEqual(parsed.users[0].name, "Alice");
    assert.ok(parsed.users[0].scores instanceof Uint8Array);
    assert.strictEqual(parsed.metadata.created, "2024-01-01");

    assert.strictEqual(parsed.metadata.version, 1);
});

test('serializeBigIntegers', () => {
    const small = 100n;
    const medium = 70000n;
    const large = 5000000000n;

    const serializedSmall = serialize(small);
    assert.strictEqual(serializedSmall[1], Marker.unsigned_int_8);

    const serializedMedium = serialize(medium);
    assert.strictEqual(serializedMedium[1], Marker.unsigned_int_32);

    const serializedLarge = serialize(large);
    assert.strictEqual(serializedLarge[1], Marker.unsigned_int_64);
});

test('serializeNegativeBigIntegers', () => {
    const small = -50n;
    const medium = -40000n;
    const large = -3000000000n;

    const serializedSmall = serialize(small);
    assert.strictEqual(serializedSmall[1], Marker.signed_int_8);

    const serializedMedium = serialize(medium);
    assert.strictEqual(serializedMedium[1], Marker.signed_int_32);

    const serializedLarge = serialize(large);
    assert.strictEqual(serializedLarge[1], Marker.signed_int_64);
});

test('roundTripComplex', () => {
    const complex = {
        id: 12345n,
        name: "Test System",
        active: true,
        scores: new Float64Array([1.1, 2.2, 3.3]),
        tags: ["tag1", "tag2", "tag3"],
        metadata: new Map([
            [1n, { type: "primary", value: 100 }],
            [2n, { type: "secondary", value: 200 }]
        ]),
        nested: {
            level1: {
                level2: {
                    value: "deep"
                }
            }
        }
    };

    const serialized = serialize(complex);
    const parsed = parse(serialized);


    assert.strictEqual(parsed.id, 12345);
    assert.strictEqual(parsed.name, "Test System");
    assert.strictEqual(parsed.active, true);
    assert.ok(parsed.scores instanceof Float64Array);
    assert.deepStrictEqual([...parsed.scores], [1.1, 2.2, 3.3]);
    assert.deepStrictEqual(parsed.tags, ["tag1", "tag2", "tag3"]);
    assert.ok(parsed.metadata instanceof Map);
    assert.strictEqual(parsed.metadata.size, 2);
    assert.strictEqual(parsed.nested.level1.level2.value, "deep");
});

test('unsupportedTypes', () => {
    assert.throws(() => serialize(Symbol("test")), /Unsupported type: "symbol"/);
    assert.throws(() => serialize(() => { }), /Unsupported type: "function"/);
});
