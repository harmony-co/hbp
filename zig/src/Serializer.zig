const std = @import("std");
const builtin = @import("builtin");
const HBP_VERSION = @import("config").HBP_VERSION;

const ByteAlignedInt = std.math.ByteAlignedInt;

const assert = std.debug.assert;
const expect = std.testing.expect;
const eql = std.mem.eql;

const native_endian = builtin.cpu.arch.endian();

const Serializer = @This();

pub fn calculateMarker(comptime T: type) []const u8 {
    comptime {
        const type_info = @typeInfo(T);

        switch (type_info) {
            .int => {
                const alignedType = ByteAlignedInt(T);
                const info = @typeInfo(alignedType).int;
                const base = if (info.signedness == .signed) 0x10 else 0x20;
                return switch (info.bits) {
                    8 => &.{base},
                    16 => &.{base + 1},
                    32 => &.{base + 2},
                    64 => &.{base + 3},
                    128 => &.{base + 4},
                    256 => &.{base + 5},
                    512 => &.{base + 6},
                    else => |bits| &[_]u8{base + 0x0F} ++ &@as([2]u8, @bitCast(if (native_endian == .big) bits else @byteSwap(bits))),
                };
            },
            .array => |arr| {
                const is_string = arr.sentinel() != null;
                const base = 0x80;
                const marker = blk: {
                    if (arr.len <= 15) break :blk [_]u8{base + arr.len} ++ calculateMarker(arr.child);
                    @compileError("Not yet implemented");
                };
                if (is_string) return [_]u8{0xE0} ++ marker;
                return marker;
            },
            else => unreachable,
        }
    }
}

pub fn calculateBufferLen(comptime T: type) comptime_int {
    comptime {
        const type_info = @typeInfo(T);

        switch (type_info) {
            .int => |i| {
                return @divExact(i.bits, 8);
            },
            .array => |arr| {
                return calculateBufferLen(arr.child) * arr.len;
            },
            else => unreachable,
        }
    }
}

pub fn Buffer(comptime T: type) type {
    comptime {
        const type_info = @typeInfo(T);

        return switch (type_info) {
            .null, .bool => [2]u8,
            .int => [1 + calculateMarker(T).len + calculateBufferLen(ByteAlignedInt(T))]u8,
            .array => [1 + calculateMarker(T).len + calculateBufferLen(T)]u8,
            else => unreachable,
        };
    }
}

pub fn serializeNull() Buffer(@TypeOf(null)) {
    var buffer: Buffer(@TypeOf(null)) = undefined;
    buffer[0] = HBP_VERSION;
    buffer[1] = 0x00;
    return buffer;
}

test serializeNull {
    try expect(eql(u8, &serializeNull(), &.{ 0x01, 0x00 }));
}

pub fn serializeBool(value: bool) Buffer(bool) {
    var buffer: Buffer(@TypeOf(null)) = undefined;
    buffer[0] = HBP_VERSION;
    buffer[1] = if (value) 0x02 else 0x01;
    return buffer;
}

test serializeBool {
    try expect(eql(u8, &serializeBool(false), &.{ 0x01, 0x01 }));
    try expect(eql(u8, &serializeBool(true), &.{ 0x01, 0x02 }));
}

pub fn serializeInt(comptime T: type, value: T) Buffer(T) {
    const aligned_type = ByteAlignedInt(T);
    const marker = comptime calculateMarker(T);

    var buffer: Buffer(T) = undefined;
    buffer[0] = HBP_VERSION;

    inline for (marker, 1..) |byte, i| {
        buffer[i] = byte;
    }

    buffer[1 + marker.len ..].* = @bitCast(std.mem.nativeToBig(aligned_type, value));

    return buffer;
}

test serializeInt {
    try expect(eql(u8, &serializeInt(i8, 45), &.{ 0x01, 0x10, 0x2D }));
    try expect(eql(u8, &serializeInt(i16, 6347), &.{ 0x01, 0x11, 0x18, 0xCB }));
    try expect(eql(u8, &serializeInt(i32, 9123424), &.{ 0x01, 0x12, 0x00, 0x8B, 0x36, 0x60 }));
    try expect(eql(u8, &serializeInt(i64, 5294967295), &.{ 0x01, 0x13, 0x00, 0x00, 0x00, 0x01, 0x3B, 0x9A, 0xC9, 0xFF }));
    try expect(eql(u8, &serializeInt(i128, 28446744073709551615), &.{ 0x01, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x8A, 0xC7, 0x23, 0x04, 0x89, 0xE7, 0xFF, 0xFF }));
    try expect(eql(u8, &serializeInt(i256, 340282366920938463463375607431768211456), &.{ 0x01, 0x15, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x8D, 0x7E, 0xA4, 0xC6, 0x80, 0x00 }));
    try expect(eql(u8, &serializeInt(i512, 115792089237316395423570985008687907853269984665640564039457584007913129639935), &.{ 0x01, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7C, 0x75, 0xD6, 0x95, 0xC2, 0x70, 0x6A, 0xC5, 0xE9, 0x70, 0x44, 0xC3, 0xB2, 0xD3, 0xEF, 0x59, 0x29, 0x94, 0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF }));
    try expect(eql(u8, &serializeInt(i6, 30), &.{ 0x01, 0x10, 0x1E }));
    try expect(eql(u8, &serializeInt(i38, 9123424), &.{ 0x01, 0x1F, 0x00, 0x28, 0x00, 0x00, 0x8B, 0x36, 0x60 }));
    try expect(eql(u8, &serializeInt(i80, 5294967295), &.{ 0x01, 0x1F, 0x00, 0x50, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x3B, 0x9A, 0xC9, 0xFF }));

    try expect(eql(u8, &serializeInt(u8, 250), &.{ 0x01, 0x20, 0xFA }));
    try expect(eql(u8, &serializeInt(u16, 6347), &.{ 0x01, 0x21, 0x18, 0xCB }));
    try expect(eql(u8, &serializeInt(u32, 9123424), &.{ 0x01, 0x22, 0x00, 0x8B, 0x36, 0x60 }));
    try expect(eql(u8, &serializeInt(u64, 5294967295), &.{ 0x01, 0x23, 0x00, 0x00, 0x00, 0x01, 0x3B, 0x9A, 0xC9, 0xFF }));
    try expect(eql(u8, &serializeInt(u128, 28446744073709551615), &.{ 0x01, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x8A, 0xC7, 0x23, 0x04, 0x89, 0xE7, 0xFF, 0xFF }));
    try expect(eql(u8, &serializeInt(u256, 340282366920938463463375607431768211456), &.{ 0x01, 0x25, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x8D, 0x7E, 0xA4, 0xC6, 0x80, 0x00 }));
    try expect(eql(u8, &serializeInt(u512, 115792089237316395423570985008687907853269984665640564039457584007913129639935), &.{ 0x01, 0x26, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7C, 0x75, 0xD6, 0x95, 0xC2, 0x70, 0x6A, 0xC5, 0xE9, 0x70, 0x44, 0xC3, 0xB2, 0xD3, 0xEF, 0x59, 0x29, 0x94, 0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF }));
    try expect(eql(u8, &serializeInt(u6, 30), &.{ 0x01, 0x20, 0x1E }));
    try expect(eql(u8, &serializeInt(u38, 9123424), &.{ 0x01, 0x2F, 0x00, 0x28, 0x00, 0x00, 0x8B, 0x36, 0x60 }));
    try expect(eql(u8, &serializeInt(u80, 5294967295), &.{ 0x01, 0x2F, 0x00, 0x50, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x3B, 0x9A, 0xC9, 0xFF }));
}

pub fn serializeList(comptime T: type, comptime max_len: u32, value: []const T) struct { Buffer([max_len]T), u32 } {
    assert(value.len <= max_len);
    const type_info = @typeInfo(T);

    // TODO: Support more types
    if (type_info != .int) @compileError("Only integer lists are supported");

    var buffer: Buffer([max_len]T) = undefined;
    buffer[0] = HBP_VERSION;

    const marker = comptime calculateMarker([max_len]T);

    inline for (marker, 1..) |byte, i| {
        buffer[i] = byte;
    }

    const byte_size = calculateBufferLen(T);
    var real_length: u32 = 1 + marker.len;

    for (value) |el| {
        @memcpy(buffer[real_length .. real_length + byte_size], &@as([byte_size]u8, @bitCast(std.mem.nativeToBig(T, el))));
        real_length += byte_size;
    }

    return .{ buffer, real_length };
}

// TODO: Merge this properly with `serializeList`
pub fn serializeString(comptime max_len: u32, value: []const u8) struct { Buffer([max_len:0]u8), u32 } {
    assert(value.len <= max_len);
    var buffer: Buffer([max_len:0]u8) = undefined;
    buffer[0] = HBP_VERSION;

    const marker = comptime calculateMarker([max_len:0]u8);

    inline for (marker, 1..) |byte, i| {
        buffer[i] = byte;
    }

    const initial_len: usize = 1 + marker.len;

    @memcpy(buffer[initial_len .. initial_len + value.len], value);

    return .{ buffer, @intCast(initial_len + value.len) };
}
