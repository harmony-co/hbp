export * from "./Deserialzer.js";
export * from "./Serializer.js";

export const HBP_VERSION = 0x01;

export const enum Marker {
    /* eslint-disable @typescript-eslint/naming-convention */
    null = 0x00,

    /// Booleans
    false = 0x01,
    true,

    /// Signed Integers
    signed_int_8 = 0x10,
    signed_int_16,
    signed_int_32,
    signed_int_64,
    signed_int_128,
    signed_int_256,
    signed_int_512,
    signed_int_arbitrary = 0x1F,

    /// Unsigned Integers
    unsigned_int_8 = 0x20,
    unsigned_int_16,
    unsigned_int_32,
    unsigned_int_64,
    unsigned_int_128,
    unsigned_int_256,
    unsigned_int_512,
    unsigned_int_arbitrary = 0x2F,

    /// Floating Point
    /** @see [IEEE 754 Half precision float](https://en.wikipedia.org/wiki/Half-precision_floating-point_format) */
    float_half = 0x30,
    /** @see [IEEE 754 Minifloat](https://en.wikipedia.org/wiki/Minifloat) */
    float_mini,
    /** @see [IEEE 754 Single precision float](https://en.wikipedia.org/wiki/Single-precision_floating-point_format) */
    float_single,
    /** @see [IEEE 754 Extended precision float](https://en.wikipedia.org/wiki/Extended_precision) */
    float_extended_40,
    /** @see [IEEE 754 Double precision float](https://en.wikipedia.org/wiki/Double-precision_floating-point_format) */
    float_double,
    /** @see [IEEE 754 Extended precision float](https://en.wikipedia.org/wiki/Extended_precision) */
    float_extended_80,
    /** @see [IEEE 754 Quadruple precision float](https://en.wikipedia.org/wiki/Quadruple-precision_floating-point_format) */
    float_quad,
    /** @see [IEEE 754 Octuple precision float](https://en.wikipedia.org/wiki/Octuple-precision_floating-point_format) */
    float_octuple,
    /** @see [Brain Floating Point](https://en.wikipedia.org/wiki/Bfloat16_floating-point_format) */
    float_brain = 0x3F,

    /// Decimals
    /** @see [IEEE 754 Decimal32](https://en.wikipedia.org/wiki/Decimal32_floating-point_format) */
    decimal_32 = 0x3A,
    /** @see [IEEE 754 Decimal64](https://en.wikipedia.org/wiki/Decimal64_floating-point_format) */
    decimal_64,
    /** @see [IEEE 754 Decimal128](https://en.wikipedia.org/wiki/Decimal128_floating-point_format) */
    decimal_128,

    /// Array
    /** Empty tuple */
    tuple_0 = 0x70,
    tuple_1,
    tuple_2,
    tuple_3,
    tuple_4,
    tuple_5,
    tuple_6,
    tuple_7,
    tuple_8,
    tuple_9,
    tuple_10,
    tuple_11,
    tuple_12,
    tuple_13,
    tuple_14,
    tuple_15,
    tuple_255 = 0xDA,
    tuple_65535,
    /** 4,294,967,295 Tuple elements */
    tuple_4G,

    /// Vector
    /** Empty vector */
    vector_0 = 0x80,
    vector_1,
    vector_2,
    vector_3,
    vector_4,
    vector_5,
    vector_6,
    vector_7,
    vector_8,
    vector_9,
    vector_10,
    vector_11,
    vector_12,
    vector_13,
    vector_14,
    vector_15,
    vector_255 = 0xDD,
    vector_65535,
    /** 4,294,967,295 Vector elements */
    vector_4G,

    /// Dictionary
    dict_255 = 0xD0,
    dict_65535,
    /** 4,294,967,295 Dictionary elements */
    dict_4G,

    /// Map
    map_255 = 0xD3,
    map_65535,
    /** 4,294,967,295 Map elements */
    map_4G,

    /// Meta Data Types
    string = 0xE0,
    vector = 0xE3,
    optional = 0xF0,
    enum = 0xF1,
    error = 0xFF

    /* eslint-enable @typescript-eslint/naming-convention */
}

export const enum CharacterEncoding {
    /* eslint-disable @typescript-eslint/naming-convention */
    utf8 = 0x20,
    utf16
    /* eslint-enable @typescript-eslint/naming-convention */
}

/// Helpers
/** @see https://stackoverflow.com/a/39495173/28282697 */
type Enumerate<
    N extends number,
    Acc extends ReadonlyArray<number> = []
> = Acc["length"] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc["length"]]>;

type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>> | T;

type BuildTuple<T, L extends number, Acc extends ReadonlyArray<T> = []> =
    Acc["length"] extends L ? Acc : BuildTuple<T, L, [...Acc, T]>;

type FixedLengthBuffer<T, L extends number> =
    number extends L ? Array<T> : BuildTuple<T, L>;

type Prepend<T, U> = T extends Array<unknown> ? [U, ...T] : never;

/** @see https://stackoverflow.com/a/59833759/28282697 */
type Flatten<
    T extends ReadonlyArray<unknown>,
    Acc extends ReadonlyArray<unknown> = []
> = T extends [infer F, ...infer R]
    ? Flatten<R, F extends ReadonlyArray<unknown>
        ? [...Acc, ...F]
        : [...Acc, F]>
    : Acc;

type Byte = IntRange<0, 255>;

/// Markers
type NullMarker = [Extract<Marker, Marker.null>];

type BooleanMarkers = [Extract<
    Marker,
    | Marker.false
    | Marker.true
>];

/// Signed Integers
export type SignedIntMarkers = Extract<
    Marker,
    | IntRange<Marker.signed_int_8, Marker.signed_int_512>
    | Marker.signed_int_arbitrary
>;
type SignedIntByteLength = {
    [Marker.signed_int_8]: 1,
    [Marker.signed_int_16]: 2,
    [Marker.signed_int_32]: 4,
    [Marker.signed_int_64]: 8,
    [Marker.signed_int_128]: 16,
    [Marker.signed_int_256]: 32,
    [Marker.signed_int_512]: 64
};
type SignedIntFixedSpecs = {
    [K in keyof SignedIntByteLength]: [K, ...FixedLengthBuffer<Byte, SignedIntByteLength[K]>];
}[keyof SignedIntByteLength];
type SignedIntArbitrarySpec = [
    Marker.signed_int_arbitrary, ...FixedLengthBuffer<Byte, 2>, ...Array<Byte>
];
type SignedIntSpec =
    | SignedIntFixedSpecs
    | SignedIntArbitrarySpec;

/// Unsigned Integers
export type UnsignedIntMarkers = Extract<
    Marker,
    | IntRange<Marker.unsigned_int_8, Marker.unsigned_int_512>
    | Marker.unsigned_int_arbitrary
>;
type UnsignedIntByteLength = {
    [Marker.unsigned_int_8]: 1,
    [Marker.unsigned_int_16]: 2,
    [Marker.unsigned_int_32]: 4,
    [Marker.unsigned_int_64]: 8,
    [Marker.unsigned_int_128]: 16,
    [Marker.unsigned_int_256]: 32,
    [Marker.unsigned_int_512]: 64
};
type UnsignedIntFixedSpecs = {
    [K in keyof UnsignedIntByteLength]: [K, ...FixedLengthBuffer<Byte, UnsignedIntByteLength[K]>];
}[keyof UnsignedIntByteLength];
type UnsignedIntArbitrarySpec = [
    Marker.unsigned_int_arbitrary, ...FixedLengthBuffer<Byte, 2>, ...Array<Byte>
];
type UnsignedIntSpec =
    | UnsignedIntFixedSpecs
    | UnsignedIntArbitrarySpec;

/// Floating Point
type FloatMarkers = Extract<
    Marker,
    | IntRange<Marker.float_half, Marker.float_octuple>
    | Marker.float_brain
>;
type FloatByteLength = {
    [Marker.float_half]: 2,
    [Marker.float_mini]: 3,
    [Marker.float_single]: 4,
    [Marker.float_extended_40]: 5,
    [Marker.float_double]: 8,
    [Marker.float_extended_80]: 10,
    [Marker.float_quad]: 16,
    [Marker.float_octuple]: 32,
    [Marker.float_brain]: 2
};
type FloatSpec = {
    [K in keyof FloatByteLength]: [K, ...FixedLengthBuffer<Byte, FloatByteLength[K]>];
}[keyof FloatByteLength];

/// Decimals
type DecimalMarkers = Extract<
    Marker,
    | IntRange<Marker.decimal_32, Marker.decimal_128>
>;
type DecimalByteLength = {
    [Marker.decimal_32]: 4,
    [Marker.decimal_64]: 8,
    [Marker.decimal_128]: 16
};
type DecimalSpec = {
    [K in keyof DecimalByteLength]: [K, ...FixedLengthBuffer<Byte, DecimalByteLength[K]>];
}[keyof DecimalByteLength];

/// Tuple
type TupleMarkers = Extract<
    Marker,
    | IntRange<Marker.tuple_0, Marker.tuple_15>
    | IntRange<Marker.tuple_255, Marker.tuple_4G>
>;
type SmallTupleCapacity = {
    [Marker.tuple_0]: 0,
    [Marker.tuple_1]: 1,
    [Marker.tuple_2]: 2,
    [Marker.tuple_3]: 3,
    [Marker.tuple_4]: 4,
    [Marker.tuple_5]: 5,
    [Marker.tuple_6]: 6,
    [Marker.tuple_7]: 7,
    [Marker.tuple_8]: 8,
    [Marker.tuple_9]: 9,
    [Marker.tuple_10]: 10,
    [Marker.tuple_11]: 11,
    [Marker.tuple_12]: 12,
    [Marker.tuple_13]: 13,
    [Marker.tuple_14]: 14,
    [Marker.tuple_15]: 15
};
type LongTupleCapacity = {
    [Marker.tuple_255]: 255,
    [Marker.tuple_65535]: 65535,
    [Marker.tuple_4G]: 4_294_967_295
};
type SmallTupleSpec = {
    [K in keyof SmallTupleCapacity]: [K, ...FixedLengthBuffer<PrimitiveMarkerSpecs, SmallTupleCapacity[K]>];
}[keyof SmallTupleCapacity];
type LongTupleSpec = {
    [K in keyof LongTupleCapacity]: [K, ...Array<PrimitiveMarkerSpecs>, LongTupleCapacity[K]];
}[keyof LongTupleCapacity];

type TupleSpec =
    | SmallTupleSpec
    | LongTupleSpec;

/// Vectors
type VectorMarkers = Extract<
    Marker,
    | IntRange<Marker.vector_0, Marker.vector_15>
    | IntRange<Marker.vector_255, Marker.vector_4G>
>;
type SmallVectorCapacity = {
    [Marker.vector_0]: 0,
    [Marker.vector_1]: 1,
    [Marker.vector_2]: 2,
    [Marker.vector_3]: 3,
    [Marker.vector_4]: 4,
    [Marker.vector_5]: 5,
    [Marker.vector_6]: 6,
    [Marker.vector_7]: 7,
    [Marker.vector_8]: 8,
    [Marker.vector_9]: 9,
    [Marker.vector_10]: 10,
    [Marker.vector_11]: 11,
    [Marker.vector_12]: 12,
    [Marker.vector_13]: 13,
    [Marker.vector_14]: 14,
    [Marker.vector_15]: 15
};
type LongVectorCapacity = {
    [Marker.vector_255]: 255,
    [Marker.vector_65535]: 65535,
    [Marker.vector_4G]: 4_294_967_295
};
// type VectorCapacity = SmallVectorCapacity & LongVectorCapacity;
type SmallVectorSpec = {
    [K in keyof SmallVectorCapacity]: [K, ...FixedLengthBuffer<PrimitiveMarkerSpecs, SmallVectorCapacity[K]>];
}[keyof SmallVectorCapacity];
type LongVectorSpec = {
    [K in keyof LongVectorCapacity]: [K, ...Array<PrimitiveMarkerSpecs>, LongVectorCapacity[K]];
}[keyof LongVectorCapacity];

type VectorSpec =
    | SmallVectorSpec
    | LongVectorSpec;

/// Dictionary
type DictMarkers = Extract<
    Marker,
    | IntRange<Marker.dict_255, Marker.dict_4G>
>;
type DictCapacity = {
    [Marker.dict_255]: 255,
    [Marker.dict_65535]: 65535,
    [Marker.dict_4G]: 4_294_967_295
};

type DictSpec = {
    [K in keyof DictCapacity]: [K, number,
        ...Flatten<
            [Marker.string, CharacterEncoding, PrimitiveMarkerSpecs]
        >
    ];
}[keyof DictCapacity];

/// Map
type MapMarkers = Extract<
    Marker,
    | IntRange<Marker.map_255, Marker.map_4G>
>;
type MapCapacity = {
    [Marker.map_255]: 255,
    [Marker.map_65535]: 65535,
    [Marker.map_4G]: 4_294_967_295
};
type MapSpec = {
    [K in keyof MapCapacity]: [K, number,
        ...Flatten<
            [PrimitiveMarkerSpecs, PrimitiveMarkerSpecs]
        >
    ];
}[keyof MapCapacity];

/// Meta Data Types
type MetaMarkers = Extract<
    Marker,
    | Marker.string
    | Marker.vector
    | Marker.optional
    | Marker.enum
    | Marker.error
>;

/// String
// type UTFCharBytes<E extends CharacterEncoding> = E extends CharacterEncoding.utf8
//     ? [Byte]
//     : [Byte, Byte];
// type UTFSpec<
//     E extends CharacterEncoding,
//     K extends keyof VectorCapacity
// > = K extends keyof SmallVectorCapacity
//     ? Flatten<FixedLengthBuffer<UTFCharBytes<E>, VectorCapacity[K]>>
//     : Array<Byte>;
// type StringSpec = {
//     [K in keyof VectorCapacity]: {
//         [E in CharacterEncoding]: [
//             Marker.string,
//             E,
//             K,
//             ...UTFSpec<E, K>
//         ]
//     }[CharacterEncoding]
// }[keyof VectorCapacity];

/// Optional
type OptionalSpec = [
    Marker.optional,
    ...PrimitiveMarkerSpecs
];

/// Enum
type EnumSpec = [
    Marker.enum,
    ...UnsignedIntFixedSpecs
];

/// Error
// type ErrorSpec = [
//     Marker.error,
//     ...StringSpec
// ];

export type Markers =
    | NullMarker
    | BooleanMarkers
    | SignedIntMarkers
    | UnsignedIntMarkers
    | FloatMarkers
    | DecimalMarkers
    | TupleMarkers
    | VectorMarkers
    | DictMarkers
    | MapMarkers
    | MetaMarkers;

type PrimitiveMarkerSpecs =
    | NullMarker
    | BooleanMarkers
    | SignedIntSpec
    | UnsignedIntSpec
    | FloatSpec
    | DecimalSpec
    // | StringSpec
    | EnumSpec;
    // | ErrorSpec;

type MarkerSpecs =
    | PrimitiveMarkerSpecs
    | TupleSpec
    | VectorSpec
    | DictSpec
    | MapSpec
    | OptionalSpec;

export type HBPFrame = Prepend<MarkerSpecs, typeof HBP_VERSION>;

