export * from "./Deserialzer.js"
export * from "./Serializer.js"

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
    /** Empty array */
    array_0 = 0x70,
    array_1,
    array_2,
    array_3,
    array_4,
    array_5,
    array_6,
    array_7,
    array_8,
    array_9,
    array_10,
    array_11,
    array_12,
    array_13,
    array_14,
    array_15,
    array_256 = 0xDA,
    array_65536,
    /** 4,294,967,296 Array elements */
    array_4G,

    /// List
    /** Empty list */
    list_0 = 0x80,
    list_1,
    list_2,
    list_3,
    list_4,
    list_5,
    list_6,
    list_7,
    list_8,
    list_9,
    list_10,
    list_11,
    list_12,
    list_13,
    list_14,
    list_15,
    list_256 = 0xDD,
    list_65536,
    /** 4,294,967,296 List elements */
    list_4G,

    /// Dictionary
    dict_256 = 0xD0,
    dict_65536,
    /** 4,294,967,296 Dictionary elements */
    dict_4G,

    /// Map
    map_256 = 0xD3,
    map_65536,
    /** 4,294,967,296 Map elements */
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
type SignedIntByteLengths = {
    [Marker.signed_int_8]: 1,
    [Marker.signed_int_16]: 2,
    [Marker.signed_int_32]: 4,
    [Marker.signed_int_64]: 8,
    [Marker.signed_int_128]: 16,
    [Marker.signed_int_256]: 32,
    [Marker.signed_int_512]: 64
};
type SignedIntFixedSpecs = {
    [K in keyof SignedIntByteLengths]: [K, ...FixedLengthBuffer<Byte, SignedIntByteLengths[K]>];
}[keyof SignedIntByteLengths];
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
type UnsignedIntByteLengths = {
    [Marker.unsigned_int_8]: 1,
    [Marker.unsigned_int_16]: 2,
    [Marker.unsigned_int_32]: 4,
    [Marker.unsigned_int_64]: 8,
    [Marker.unsigned_int_128]: 16,
    [Marker.unsigned_int_256]: 32,
    [Marker.unsigned_int_512]: 64
};
type UnsignedIntFixedSpecs = {
    [K in keyof UnsignedIntByteLengths]: [K, ...FixedLengthBuffer<Byte, UnsignedIntByteLengths[K]>];
}[keyof UnsignedIntByteLengths];
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
type FloatByteLengths = {
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
    [K in keyof FloatByteLengths]: [K, ...FixedLengthBuffer<Byte, FloatByteLengths[K]>];
}[keyof FloatByteLengths];

/// Decimals
type DecimalMarkers = Extract<
    Marker,
    | IntRange<Marker.decimal_32, Marker.decimal_128>
>;
type DecimalByteLengths = {
    [Marker.decimal_32]: 4,
    [Marker.decimal_64]: 8,
    [Marker.decimal_128]: 16
};
type DecimalSpec = {
    [K in keyof DecimalByteLengths]: [K, ...FixedLengthBuffer<Byte, DecimalByteLengths[K]>];
}[keyof DecimalByteLengths];

/// Array
type ArrayMarkers = Extract<
    Marker,
    | IntRange<Marker.array_0, Marker.array_15>
    | IntRange<Marker.array_256, Marker.array_4G>
>;
type SmallArrayLengths = {
    [Marker.array_0]: 0,
    [Marker.array_1]: 1,
    [Marker.array_2]: 2,
    [Marker.array_3]: 3,
    [Marker.array_4]: 4,
    [Marker.array_5]: 5,
    [Marker.array_6]: 6,
    [Marker.array_7]: 7,
    [Marker.array_8]: 8,
    [Marker.array_9]: 9,
    [Marker.array_10]: 10,
    [Marker.array_11]: 11,
    [Marker.array_12]: 12,
    [Marker.array_13]: 13,
    [Marker.array_14]: 14,
    [Marker.array_15]: 15
};
type LongArrayLengths = {
    [Marker.array_256]: 256,
    [Marker.array_65536]: 65536,
    [Marker.array_4G]: 4_294_967_296
};
type SmallArraySpec = {
    [K in keyof SmallArrayLengths]: [K, ...FixedLengthBuffer<PrimitiveMarkerSpecs, SmallArrayLengths[K]>];
}[keyof SmallArrayLengths];
type LongArraySpec = {
    [K in keyof LongArrayLengths]: [K, ...Array<PrimitiveMarkerSpecs>, LongArrayLengths[K]];
}[keyof LongArrayLengths];

type ArraySpec =
    | SmallArraySpec
    | LongArraySpec;

/// List
type ListMarkers = Extract<
    Marker,
    | IntRange<Marker.list_0, Marker.list_15>
    | IntRange<Marker.list_256, Marker.list_4G>
>;
type SmallListLengths = {
    [Marker.list_0]: 0,
    [Marker.list_1]: 1,
    [Marker.list_2]: 2,
    [Marker.list_3]: 3,
    [Marker.list_4]: 4,
    [Marker.list_5]: 5,
    [Marker.list_6]: 6,
    [Marker.list_7]: 7,
    [Marker.list_8]: 8,
    [Marker.list_9]: 9,
    [Marker.list_10]: 10,
    [Marker.list_11]: 11,
    [Marker.list_12]: 12,
    [Marker.list_13]: 13,
    [Marker.list_14]: 14,
    [Marker.list_15]: 15
};
type LongListLengths = {
    [Marker.list_256]: 256,
    [Marker.list_65536]: 65536,
    [Marker.list_4G]: 4_294_967_296
};
type ListLengths = SmallListLengths & LongListLengths;
type SmallListSpec = {
    [K in keyof SmallListLengths]: [K, ...FixedLengthBuffer<PrimitiveMarkerSpecs, SmallListLengths[K]>];
}[keyof SmallListLengths];
type LongListSpec = {
    [K in keyof LongListLengths]: [K, ...Array<PrimitiveMarkerSpecs>, LongListLengths[K]];
}[keyof LongListLengths];

type ListSpec =
    | SmallListSpec
    | LongListSpec;

/// Dictionary
type DictMarkers = Extract<
    Marker,
    | IntRange<Marker.dict_256, Marker.dict_4G>
>;
type DictLengths = {
    [Marker.dict_256]: 256,
    [Marker.dict_65536]: 65536,
    [Marker.dict_4G]: 4_294_967_296
};

type DictSpec = {
    [K in keyof DictLengths]: [K, number,
        ...Flatten<
            [Marker.string, CharacterEncoding, PrimitiveMarkerSpecs]
        >
    ];
}[keyof DictLengths];

/// Map
type MapMarkers = Extract<
    Marker,
    | IntRange<Marker.map_256, Marker.map_4G>
>;
type MapLengths = {
    [Marker.map_256]: 256,
    [Marker.map_65536]: 65536,
    [Marker.map_4G]: 4_294_967_296
};
type MapSpec = {
    [K in keyof MapLengths]: [K, number,
        ...Flatten<
            [PrimitiveMarkerSpecs, PrimitiveMarkerSpecs]
        >
    ];
}[keyof MapLengths];

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
type UTFCharBytes<E extends CharacterEncoding> =
    E extends CharacterEncoding.utf8
    ? [Byte]
    : [Byte, Byte];
type UTFSpec<
    E extends CharacterEncoding,
    K extends keyof ListLengths
> = K extends keyof SmallListLengths
    ? Flatten<FixedLengthBuffer<UTFCharBytes<E>, ListLengths[K]>>
    : Array<Byte>;
type StringSpec = {
    [K in keyof ListLengths]: {
        [E in CharacterEncoding]: [
            Marker.string,
            E,
            K,
            ...UTFSpec<E, K>
        ]
    }[CharacterEncoding]
}[keyof ListLengths];

/// Vector
type VectorSpec = [
    Marker.vector,
    ...ListSpec
];

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
type ErrorSpec = [
    Marker.error,
    ...StringSpec
];

export type Markers =
    | NullMarker
    | BooleanMarkers
    | SignedIntMarkers
    | UnsignedIntMarkers
    | FloatMarkers
    | DecimalMarkers
    | ArrayMarkers
    | ListMarkers
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
    | StringSpec
    | EnumSpec
    | ErrorSpec;

type MarkerSpecs =
    | PrimitiveMarkerSpecs
    | ArraySpec
    | ListSpec
    | DictSpec
    | MapSpec
    | VectorSpec
    | OptionalSpec;

export type HBPFrame = Prepend<MarkerSpecs, typeof HBP_VERSION>;

