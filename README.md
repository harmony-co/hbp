# About

> [!CAUTION]
> The HBP spec is still in the prototype phase, the versioning portion of the spec will not be used until 1.0 is in place.

Harmony Binary Protocol (HBP) is a general purpose serialization protocol inspired by the protocols like Bolt's PackStream and Redis's RESP3, that aims to provide a standardized type aware way to serialize and deserialize data.

It consists of a set of primitive types, composite types, and meta types that together allow you to represent data in the way you need.

# Table of Contents

<!--toc:start-->
- [About](#about)
- [Table of Contents](#table-of-contents)
- [Representation](#representation)
- [Identifier](#identifier)
- [Primitive Data Types](#primitive-data-types)
  - [Null](#null)
  - [Bool](#bool)
  - [Numbers](#numbers)
    - [Signed Integers](#signed-integers)
    - [Unsigned Integers](#unsigned-integers)
    - [Floats](#floats)
    - [Decimals](#decimals)
- [Meta Data Types](#meta-data-types)
  - [Optional](#optional)
  - [Enum](#enum)
  - [Union](#union)
  - [Error](#error)
- [Composite Data Types](#composite-data-types)
  - [Strings](#strings)
  - [Tuple](#tuple)
  - [Vector](#vector)
  - [Dictionary](#dictionary)
  - [Map](#map)
<!--toc:end-->

# Representation

Every serialized HBP value begins with the HBP version used to encode it followed by a marker that represents the type of the data.

# Identifier

The HBP identifier is the byte at the beginning of every payload that tells you the version of the protocol and allows developers to pass custom flags.

The identifier is a single byte subdivided into 2 parts of 4 bits.
The first 4 bits are reserved for the protocol version, parsers use this information to adapt to version-specific changes.
The last 4 bits are used for user defined flags, spec compliant parsers will not validate or make use of this bits for anything, they are given to the user as-is.

# Primitive Data Types

Primitive types (or primitives) are the fundamental blocks used to represent the encoded data.

## Null

Marker: `00`

`null` represents the absence of a value and therefor has no data bytes.

## Bool

Markers:
- false: `01`
- true: `02`

Booleans are encoded as their respective single byte and have no data bytes.

## Numbers

### Signed Integers

Fixed size integers:

| Marker | Data Size (bytes) | Zig Type |
| :----: | :---------------: | :------: |
|  `10`  |         1         |   `i8`   |
|  `11`  |         2         |  `i16`   |
|  `12`  |         4         |  `i32`   |
|  `13`  |         8         |  `i64`   |
|  `14`  |        16         |  `i128`  |
|  `15`  |        32         |  `i256`  |
|  `16`  |        64         |  `i512`  |

Arbitrary size integers:

Marker: `1F`

Arbitrary sized integers are followed by `2` bytes designating their bit-width, however serializers should always aim to byte align the size.

### Unsigned Integers

Fixed size integers:

| Marker | Data Size (bytes) | Zig Type |
| :----: | :---------------: | :------: |
|  `20`  |         1         |   `u8`   |
|  `21`  |         2         |  `u16`   |
|  `22`  |         4         |  `u32`   |
|  `23`  |         8         |  `u64`   |
|  `24`  |        16         |  `u128`  |
|  `25`  |        32         |  `u256`  |
|  `26`  |        64         |  `u512`  |

Arbitrary size integers:

Marker: `2F`

Arbitrary sized integers are followed by `2` bytes designating their bit-width, however serializers should always aim to byte align the size.

### Floats

> [!CAUTION]
> Not all float formats are implemented yet, they are present on the spec for future proofing.

| Marker | Data Size (bytes) |                                                     Type                                                      |
| :----: | :---------------: | :-----------------------------------------------------------------------------------------------------------: |
|  `30`  |         2         |      [IEEE 754 Half precision float](https://en.wikipedia.org/wiki/Half-precision_floating-point_format)      |
|  `31`  |         3         |                         [IEEE 754 Minifloat](https://en.wikipedia.org/wiki/Minifloat)                         |
|  `32`  |         4         |    [IEEE 754 Single precision float](https://en.wikipedia.org/wiki/Single-precision_floating-point_format)    |
|  `33`  |         5         |             [IEEE 754 Extended precision float](https://en.wikipedia.org/wiki/Extended_precision)             |
|  `34`  |         8         |    [IEEE 754 Double precision float](https://en.wikipedia.org/wiki/Double-precision_floating-point_format)    |
|  `35`  |        10         |             [IEEE 754 Extended precision float](https://en.wikipedia.org/wiki/Extended_precision)             |
|  `36`  |        16         | [IEEE 754 Quadruple precision float](https://en.wikipedia.org/wiki/Quadruple-precision_floating-point_format) |
|  `37`  |        32         |   [IEEE 754 Octuple precision float](https://en.wikipedia.org/wiki/Octuple-precision_floating-point_format)   |
|  `3F`  |         2         |             [Brain Floating Point](https://en.wikipedia.org/wiki/Bfloat16_floating-point_format)              |

### Decimals

> [!CAUTION]
> Decimals are not yet supported, progress can be tracked [here](https://github.com/ziglang/zig/issues/4221).

| Marker | Data Size (bytes) |                                         Type                                          |
| :----: | :---------------: | :-----------------------------------------------------------------------------------: |
|  `3A`  |         4         |  [IEEE 754 Decimal32](https://en.wikipedia.org/wiki/Decimal32_floating-point_format)  |
|  `3B`  |         8         |  [IEEE 754 Decimal64](https://en.wikipedia.org/wiki/Decimal64_floating-point_format)  |
|  `3C`  |        16         | [IEEE 754 Decimal128](https://en.wikipedia.org/wiki/Decimal128_floating-point_format) |

# Meta Data Types

Meta data types are special types that acts as metadata for other types and they usually take up at least 2 bytes, the first byte being the meta type itself and the second one being the marker for the inner type.

HBP reserves all the `E0-FF` range for meta types.

## Optional

Marker: `E0`

This marker is used as an indicator that the following marker can either be [`null`](#null) or another type.

## Enum

Marker: `E1`

The enum marker must **always** be followed by an integer marker to indicate the maximum size of the enum, the data should follow the same encoding as the indicated type.

## Union

Marker: `E2`

The union marker is **always** followed by an integer marker indicating the active tag followed by the union data.

## Error

> [!WARNING]
> Error meta types are not yet supported by the zig implementation

Marker: `FF`

Example:

```txt
Original: Error("This failed")

Serialized: 01 FF 6B 54 68 69 73 20 46 61 69 6C 65 64
```

# Composite Data Types

## Strings

Strings are `UTF-8` encoded arrays of bytes.

> Why aren't strings a meta type on top of Vector? There was a long discussion about this that needs to be appended here. . .

Small strings:

| Marker | String size |
| :----: | :---------: |
|  `60`  |      0      |
|  `61`  |      1      |
|  `62`  |      2      |
|  `63`  |      3      |
|  `64`  |      4      |
|  `65`  |      5      |
|  `66`  |      6      |
|  `67`  |      7      |
|  `68`  |      8      |
|  `69`  |      9      |
|  `6A`  |     10      |
|  `6B`  |     11      |
|  `6C`  |     12      |
|  `6D`  |     13      |
|  `6E`  |     14      |
|  `6F`  |     15      |

Long Strings:

| Marker | Extra bytes | Maximum Size  |
| :----: | :---------: | :-----------: |
|  `C0`  |      1      |      255      |
|  `C1`  |      2      |    65_535     |
|  `C2`  |      4      | 4_294_967_295 |


## Tuple

Small tuples:

| Marker | Tuple size |
| :----: | :--------: |
|  `70`  |     0      |
|  `71`  |     1      |
|  `72`  |     2      |
|  `73`  |     3      |
|  `74`  |     4      |
|  `75`  |     5      |
|  `76`  |     6      |
|  `77`  |     7      |
|  `78`  |     8      |
|  `79`  |     9      |
|  `7A`  |     10     |
|  `7B`  |     11     |
|  `7C`  |     12     |
|  `7D`  |     13     |
|  `7E`  |     14     |
|  `7F`  |     15     |

Long tuples:

| Marker | Extra bytes | Maximum Size  |
| :----: | :---------: | :-----------: |
|  `DA`  |      1      |      255      |
|  `DB`  |      2      |    65_535     |
|  `DC`  |      4      | 4_294_967_295 |

A tuple is a list of values, each one serializing their own type alongside like a basic hbp payload. If its a long array, the length will come **after** the value type.

```txt
Original: [3, 6, 9]

Serialized: 01 73 10 03 10 06 10 09
```


## Vector

Small vectors:

| Marker | Vector Size |
| :----: | :---------: |
|  `80`  |      0      |
|  `81`  |      1      |
|  `82`  |      2      |
|  `83`  |      3      |
|  `84`  |      4      |
|  `85`  |      5      |
|  `86`  |      6      |
|  `87`  |      7      |
|  `88`  |      8      |
|  `89`  |      9      |
|  `8A`  |     10      |
|  `8B`  |     11      |
|  `8C`  |     12      |
|  `8D`  |     13      |
|  `8E`  |     14      |
|  `8F`  |     15      |

Long vectors:

| Marker | Extra bytes | Maximum Size  |
| :----: | :---------: | :-----------: |
|  `DD`  |      1      |      255      |
|  `DE`  |      2      |    65_535     |
|  `DF`  |      4      | 4_294_967_295 |

A vector is a known-type list of items. The vector marker is followed by [primitive data type](#primitive-data-types) and all elements will follow the encoding of that type.

```txt
Original: Vector(u8, [3, 6, 9])

Serialized: 01 83 20 03 06 09
```

## Dictionary

| Marker | Extra bytes | Maximum Size  |
| :----: | :---------: | :-----------: |
|  `D0`  |      1      |      255      |
|  `D1`  |      2      |    65_535     |
|  `D2`  |      4      | 4_294_967_295 |

A dictionary is a key-value store where all the keys are strings.

The encoding of a dictionary is as follows:

```txt
<marker> <size> (<string_marker> <string_data> <value_marker> <value_data>)*size
```

> [!NOTE]
> A dictionary's size is the amount of kv pairs not the sum of keys and values.

## Map

> [!CAUTION]
> Maps are not yet implemented.

| Marker | Extra bytes | Maximum Size  |
| :----: | :---------: | :-----------: |
|  `D3`  |      1      |      255      |
|  `D4`  |      2      |    65_535     |
|  `D5`  |      4      | 4_294_967_295 |

A map is just like a dictionary but instead, the keys can be of any type.
