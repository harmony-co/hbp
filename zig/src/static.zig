const std = @import("std");
const Scanner = @import("Scanner.zig");

const assert = std.debug.assert;

pub const ParseOptions = struct {
    /// When set to `true` it will only allow parsing floats of the same size
    /// Setting to `false` allows float widening to happen, this can cause imprecisions
    float_behavior: enum(u1) {
        widen,
        preserve,
    } = .preserve,
};

pub fn parseFromSlice(comptime T: type, gpa: std.mem.Allocator, slice: []const u8, comptime options: ParseOptions) !T {
    var scanner: Scanner = .init(gpa, slice);
    defer scanner.deinit();

    return parseFromTokenSource(T, gpa, &scanner, options);
}

pub fn parseFromTokenSource(comptime T: type, gpa: std.mem.Allocator, scanner: *Scanner, comptime options: ParseOptions) !T {
    assert(try scanner.next() == .version);
    const value = try innerParse(T, gpa, scanner, options);
    assert(try scanner.next() == .eos);
    return value;
}

pub fn innerParse(comptime T: type, gpa: std.mem.Allocator, scanner: *Scanner, comptime options: ParseOptions) !T {
    _ = gpa;
    switch (@typeInfo(T)) {
        .bool => {
            return switch (try scanner.next()) {
                .false => false,
                .true => true,
                else => error.UnexpectedToken,
            };
        },
        .int => |int| {
            const token = try scanner.next();
            if (token != Scanner.Token.int) return error.UnexpectedToken;
            if (token.int.signedness != int.signedness) return error.WrongIntegerType;

            return sliceToInt(T, token.int.view);
        },
        .float => |float| {
            const token = try scanner.next();
            if (token != Scanner.Token.float) return error.UnexpectedToken;
            if (comptime options.float_behavior != .widen) {
                if (float.bits != token.float.bits) return error.CannotWidenFloat;
            }
            assert(float.bits >= token.float.bits);

            return @as(T, switch (token.float.bits) {
                16 => std.mem.bytesToValue(f16, token.float.view),
                32 => std.mem.bytesToValue(f32, token.float.view),
                64 => std.mem.bytesToValue(f64, token.float.view),
                80 => std.mem.bytesToValue(f80, token.float.view),
                128 => std.mem.bytesToValue(f128, token.float.view),
                else => unreachable,
            });
        },
        .comptime_int, .comptime_float => error.IncompatibleTypes,
        else => return error.TODO,
    }
}

fn sliceToInt(comptime T: type, slice: []const u8) T {
    const alignedType = std.math.ByteAlignedInt(T);
    const byte_length = @divExact(@typeInfo(alignedType).int.bits, 8);
    assert(slice.len <= byte_length);

    if (slice.len < byte_length) {
        var buf = std.mem.zeroes([byte_length]u8);
        @memcpy(buf[byte_length - slice.len ..], slice);
        return std.mem.readInt(alignedType, &buf, .big);
    }

    return std.mem.readInt(alignedType, slice[0..byte_length], .big);
}
