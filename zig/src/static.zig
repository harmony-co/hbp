const std = @import("std");
const Scanner = @import("Scanner.zig");

const assert = std.debug.assert;

pub const ParseOptions = struct {
    string_behavior: union(enum(u1)) {
        reference: void,
        dupe: std.mem.Allocator,
    } = .{ .reference = {} },
    /// Allow parsing `i8` as `u8` and vice-versa
    ignore_integer_signedness: bool = false,
    /// Use `std.enums.fromInt` instead of attempting to cast
    safe_enum_parsing: bool = false,
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
    assert(try scanner.next() == .identifier);
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
        .@"enum" => |enum_info| {
            if (try scanner.next() != .@"enum") return error.UnexpectedToken;
            const token = try scanner.next();
            if (token != .int) return error.UnexpectedToken;

            if (comptime options.safe_enum_parsing) {
                return std.enums.fromInt(T, sliceToInt(enum_info.tag_type, token.int.view)) orelse error.InvalidEnumTag;
            } else {
                return @enumFromInt(sliceToInt(enum_info.tag_type, token.int.view));
            }
        },
        .@"union" => |union_info| {
            if (union_info.tag_type == null) @compileError("Unable to parse into untagged union '" ++ @typeName(T) ++ "'");
            const token = try scanner.next();
            if (token != .@"union") return error.UnexpectedToken;
            const union_key = try innerParse([]const u8, scanner, options);
            inline for (union_info.fields) |field| {
                if (std.mem.eql(u8, field.name, union_key)) return @unionInit(T, field.name, try innerParse(field.type, scanner, options));
            }

            return error.InvalidUnion;
        },
        .pointer => |pointer_info| {
            // TODO: Strings should probably be namespaced...
            // As of now we assume all `[]const u8` types are strings which is wrong (?)
            // We could force a unique sentinel to decide on this (DEL code point could work?)
            if (pointer_info.size != .slice or !pointer_info.is_const) @compileError("Unsupported pointer type");
            assert(pointer_info.child == u8);
            const token = try scanner.next();
            if (token != .string) return error.UnexpectedToken;

            const str = switch (options.string_behavior) {
                .reference => scanner.input[scanner.cursor .. scanner.cursor + token.string],
                .dupe => |gpa| try gpa.dupe(u8, scanner.input[scanner.cursor .. scanner.cursor + token.string]),
            };
            scanner.cursor += token.string;
            scanner.state = .post_value;
            return str;
        },
        .@"struct" => |struct_info| {
            if (struct_info.is_tuple) {
                const token = try scanner.next();
                if (token != .tuple) return error.UnexpectedToken;
                assert(struct_info.fields.len == token.tuple);

                var r: T = undefined;

                inline for (struct_info.fields, 0..) |field, i| {
                    r[i] = try innerParse(field.type, scanner, options);
                }

                return r;
            }

            const token = try scanner.next();
            if (token != .@"struct") return error.UnexpectedToken;
            assert(struct_info.fields.len == token.@"struct");
            var r: T = undefined;

            for (0..token.@"struct") |_| {
                const field_name = try innerParse([]const u8, scanner, options);
                inline for (struct_info.fields) |field| {
                    if (std.mem.eql(u8, field.name, field_name)) {
                        @field(r, field.name) = try innerParse(field.type, scanner, options);
                    }
                }
            }

            return r;
        },
        .comptime_int, .comptime_float => error.IncompatibleTypes,
        else => return error.TODO,
    }
}

inline fn alignIntegerType(comptime T: type) type {
    const int = @typeInfo(T).int;
    // 0 bit integers mostly happen when using enums with 1 single element
    // We require every type to be at least 1 byte long to be parsed
    if (int.bits == 0) return std.meta.Int(int.signedness, 8);
    return std.math.ByteAlignedInt(T);
}

fn sliceToInt(comptime T: type, slice: []const u8) alignIntegerType(T) {
    const N = alignIntegerType(T);
    const byte_length = @divExact(@typeInfo(N).int.bits, 8);

    if (slice.len < byte_length) {
        var buf = std.mem.zeroes([byte_length]u8);
        @memcpy(buf[0..slice.len], slice);
        return std.mem.readInt(N, &buf, .little);
    }

    assert(slice.len == byte_length);
    return std.mem.readInt(N, slice[0..byte_length], .little);
}
