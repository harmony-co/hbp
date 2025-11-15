export * from "./Deserialzer.js";
export * from "./Serializer.js";

export const HBPVersion = 0x01;

export const enum Marker {
    /* eslint-disable @typescript-eslint/naming-convention */
    null = 0x00,

    /// Boolean
    false = 0x01,
    true,

    /// Signed Integer
    signed_int_8 = 0x10,
    signed_int_16,
    signed_int_32,
    signed_int_64,
    signed_int_128,
    signed_int_256,
    signed_int_512,
    signed_int_arbitrary = 0x1F,

    /// Unsigned Integer
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

    /// Decimal
    /** @see [IEEE 754 Decimal32](https://en.wikipedia.org/wiki/Decimal32_floating-point_format) */
    decimal_32 = 0x3A,
    /** @see [IEEE 754 Decimal64](https://en.wikipedia.org/wiki/Decimal64_floating-point_format) */
    decimal_64,
    /** @see [IEEE 754 Decimal128](https://en.wikipedia.org/wiki/Decimal128_floating-point_format) */
    decimal_128,

    /// String
    /** Empty string */
    string_utf8_0 = 0x60,
    string_utf8_1,
    string_utf8_2,
    string_utf8_3,
    string_utf8_4,
    string_utf8_5,
    string_utf8_6,
    string_utf8_7,
    string_utf8_8,
    string_utf8_9,
    string_utf8_10,
    string_utf8_11,
    string_utf8_12,
    string_utf8_13,
    string_utf8_14,
    string_utf8_15,

    /// Tuple
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

    /// Long String
    string_utf8_255 = 0xC0,
    string_utf8_65535,
    /** 4,294,967,295 characters */
    string_utf8_4G,

    /// Arbitrarily Encoded String
    string_arbitrary,

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

    /// Long Tuple
    tuple_255 = 0xDA,
    tuple_65535,
    /** 4,294,967,295 Tuple elements */
    tuple_4G,

    /// Long Vector
    vector_255 = 0xDD,
    vector_65535,
    /** 4,294,967,295 Vector elements */
    vector_4G,

    /// Meta Data Types
    optional = 0xE0,
    enum = 0xE1,
    error = 0xFF

    /* eslint-enable @typescript-eslint/naming-convention */
}

export const enum CharacterEncoding {
    /* eslint-disable @typescript-eslint/naming-convention */
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
type Tail<M extends number, T extends Array<unknown>> = T extends [M, ...infer R] ? R : never;

/** @see https://stackoverflow.com/a/59833759/28282697 */
type Flatten<
    T extends ReadonlyArray<unknown>,
    Acc extends ReadonlyArray<unknown> = []
> = T extends [infer F, ...infer R]
    ? Flatten<R, F extends ReadonlyArray<unknown>
        ? [...Acc, ...F]
        : [...Acc, F]>
    : Acc;

type Byte = IntRange<0x00, 0xFF>;

/// Null
export type NullMarker = Extract<Marker, Marker.null>;
type NullSpec = [NullMarker];

/// Boolean
export type BooleanMarker = Extract<
    Marker,
    | Marker.false
    | Marker.true
>;
type BooleanSpec = [BooleanMarker];

/// Signed Integer
export type SignedIntMarker = Extract<
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

/// Unsigned Integer
export type UnsignedIntMarker = Extract<
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
export type FloatMarker = Extract<
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

/// Decimal
export type DecimalMarker = Extract<
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
export type TupleMarker = Extract<
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
type LongTupleExtraBytes = {
    [Marker.tuple_255]: 1,
    [Marker.tuple_65535]: 2,
    [Marker.tuple_4G]: 4
};
type SmallTupleSpec = {
    [K in keyof SmallTupleCapacity]: [K, ...FixedLengthBuffer<PrimitiveMarkerSpecs, SmallTupleCapacity[K]>];
}[keyof SmallTupleCapacity];
type LongTupleSpec = {
    [K in keyof LongTupleExtraBytes]: [K, ...FixedLengthBuffer<Byte, LongTupleExtraBytes[K]>, ...Array<PrimitiveMarkerSpecs>];
}[keyof LongTupleExtraBytes];

type TupleSpec =
    | SmallTupleSpec
    | LongTupleSpec;

/// Vector
export type VectorMarker = Extract<
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
type LongVectorExtraBytes = {
    [Marker.vector_255]: 1,
    [Marker.vector_65535]: 2,
    [Marker.vector_4G]: 4
};
type SmallVectorSpec = {
    [K in keyof SmallVectorCapacity]: {
        [M in PrimitiveMarker]: [K, M, ...Flatten<FixedLengthBuffer<Tail<M, PrimitiveMarkerSpecs>, SmallVectorCapacity[K]>>]
    }[PrimitiveMarker];
}[keyof SmallVectorCapacity];
type LongVectorSpec = {
    [K in keyof LongVectorExtraBytes]: {
        [M in PrimitiveMarker]: [K, M, ...FixedLengthBuffer<Byte, LongVectorExtraBytes[K]>, ...Tail<M, PrimitiveMarkerSpecs>]
    }[PrimitiveMarker];
}[keyof LongVectorExtraBytes];

type VectorSpec =
    | SmallVectorSpec
    | LongVectorSpec;

/// Dictionary
export type DictMarker = Extract<
    Marker,
    | IntRange<Marker.dict_255, Marker.dict_4G>
>;
type DictExtraBytes = {
    [Marker.dict_255]: 1,
    [Marker.dict_65535]: 2,
    [Marker.dict_4G]: 4
};

type DictSpec = {
    [K in keyof DictExtraBytes]: [K, ...FixedLengthBuffer<Byte, DictExtraBytes[K]>,
        ...Flatten<[UTF8StringSpec, PrimitiveMarkerSpecs]>
    ];
}[keyof DictExtraBytes];

/// Map
export type MapMarker = Extract<
    Marker,
    | IntRange<Marker.map_255, Marker.map_4G>
>;
type MapExtraBytes = {
    [Marker.map_255]: 1,
    [Marker.map_65535]: 2,
    [Marker.map_4G]: 4
};
type MapSpec = {
    [K in keyof MapExtraBytes]: [K, ...FixedLengthBuffer<Byte, MapExtraBytes[K]>,
        ...Flatten<[Exclude<
            PrimitiveMarkerSpecs,
            | NullSpec
            | BooleanSpec
        >, PrimitiveMarkerSpecs]>
    ];
}[keyof MapExtraBytes];

/// String
export type UTF8StringMarker = Extract<
    Marker,
    | IntRange<Marker.string_utf8_0, Marker.string_utf8_15>
    | IntRange<Marker.string_utf8_255, Marker.string_utf8_4G>
>;
type SmallUTF8StringCapacity = {
    [Marker.string_utf8_0]: 0,
    [Marker.string_utf8_1]: 1,
    [Marker.string_utf8_2]: 2,
    [Marker.string_utf8_3]: 3,
    [Marker.string_utf8_4]: 4,
    [Marker.string_utf8_5]: 5,
    [Marker.string_utf8_6]: 6,
    [Marker.string_utf8_7]: 7,
    [Marker.string_utf8_8]: 8,
    [Marker.string_utf8_9]: 9,
    [Marker.string_utf8_10]: 10,
    [Marker.string_utf8_11]: 11,
    [Marker.string_utf8_12]: 12,
    [Marker.string_utf8_13]: 13,
    [Marker.string_utf8_14]: 14,
    [Marker.string_utf8_15]: 15
};
type LongUTF8StringExtraBytes = {
    [Marker.string_utf8_255]: 1,
    [Marker.string_utf8_65535]: 2,
    [Marker.string_utf8_4G]: 4
};
type SmallUTF8StringSpec = {
    [K in keyof SmallUTF8StringCapacity]: [K, ...FixedLengthBuffer<Byte, SmallUTF8StringCapacity[K]>]
}[keyof SmallUTF8StringCapacity];
type LongUTF8StringSpec = {
    [K in keyof LongUTF8StringExtraBytes]: [K, ...FixedLengthBuffer<Byte, LongUTF8StringExtraBytes[K]>, ...Array<Byte>]
}[keyof LongUTF8StringExtraBytes];
type ArbitraryStringSpec = [Marker.string_arbitrary, CharacterEncoding, Byte, Byte, ...Array<Byte>];

type UTF8StringSpec =
    | SmallUTF8StringSpec
    | LongUTF8StringSpec;

type StringSpec =
    | UTF8StringSpec
    | ArbitraryStringSpec;

/// Meta Data Types
export type MetaMarker = Extract<
    Marker,
    | Marker.optional
    | Marker.enum
    | Marker.error
>;

/// Optional
type OptionalSpec = Prepend<
    PrimitiveMarkerSpecs,
    Marker.optional
>;

/// Enum
type EnumSpec = Prepend<
    UnsignedIntFixedSpecs,
    Marker.enum
>;

/// Error
type ErrorSpec = Prepend<
    UTF8StringSpec,
    Marker.error
>;

export type PrimitiveMarker =
    | NullMarker
    | BooleanMarker
    | SignedIntMarker
    | UnsignedIntMarker
    | FloatMarker
    | DecimalMarker;

export type PrimitiveMarkerSpecs =
    | NullSpec
    | BooleanSpec
    | SignedIntSpec
    | UnsignedIntSpec
    | FloatSpec
    | DecimalSpec;

export type MarkerSpecs =
    | PrimitiveMarkerSpecs
    | TupleSpec
    | VectorSpec
    | DictSpec
    | MapSpec
    | EnumSpec
    | StringSpec
    | ErrorSpec
    | OptionalSpec;

export type HBPFrame = [typeof HBPVersion, ...MarkerSpecs];

