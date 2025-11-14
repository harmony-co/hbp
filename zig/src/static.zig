const std = @import("std");
const Scanner = @import("Scanner.zig");

const assert = std.debug.assert;

pub const ParseOptions = struct {
    /// Allow parsing `i8` as `u8` and vice-versa
    ignore_integer_signedness: bool = false,
    float_behavior: enum(u1) {
        widen,
        preserve,
    } = .preserve,
    /// Wether to try parsing types that do not start with `0xF0` (optional marker)
    non_typed_optionals: enum(u1) {
        @"error",
        allow,
    } = .@"error",
};

pub fn parseFromSlice(comptime T: type, slice: []const u8, comptime options: ParseOptions) !T {
    var scanner: Scanner = .init(slice);
    defer scanner.deinit();

    return parseFromTokenSource(T, &scanner, options);
}

pub fn parseFromTokenSource(comptime T: type, scanner: *Scanner, comptime options: ParseOptions) !T {
    assert(try scanner.next() == .version);
    const value = try innerParse(T, scanner, options);
    assert(try scanner.next() == .eos);
    return value;
}

pub fn innerParse(comptime T: type, scanner: *Scanner, comptime options: ParseOptions) !T {
    switch (@typeInfo(T)) {
        .null => {
            return switch (try scanner.next()) {
                .null => null,
                else => error.UnexpectedToken,
            };
        },
        .bool => {
            return switch (try scanner.next()) {
                .false => false,
                .true => true,
                else => error.UnexpectedToken,
            };
        },
        .int => |int| {
            const token = try scanner.next();
            if (token != .int) return error.UnexpectedToken;
            if (comptime !options.ignore_integer_signedness) {
                if (token.int.signedness != int.signedness) return error.WrongIntegerType;
            }

            return sliceToInt(T, token.int.view);
        },
        .float => |float| {
            const token = try scanner.next();
            if (token != .float) return error.UnexpectedToken;
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
        .optional => |optional| {
            switch (try scanner.peekNextTokenType()) {
                .optional => {
                    _ = try scanner.next();
                    if (try scanner.peekNextTokenType() == .null) {
                        _ = try scanner.next();
                        return null;
                    }

                    return try innerParse(optional.child, scanner, options);
                },
                else => return if (comptime options.non_typed_optionals == .allow) try innerParse(optional.child, scanner, options) else error.UnexpectedToken,
            }
        },
        .@"struct" => |structInfo| {
            if (structInfo.is_tuple) {
                const token = try scanner.next();
                if (token != .tuple) return error.UnexpectedToken;
                assert(structInfo.fields.len == token.tuple);

                var r: T = undefined;

                inline for (structInfo.fields, 0..) |field, i| {
                    r[i] = try innerParse(field.type, scanner, options);
                }

                return r;
            }
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
