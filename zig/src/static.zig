const std = @import("std");
const Scanner = @import("Scanner.zig");

const assert = std.debug.assert;

pub const ParseOptions = struct {
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

fn ParseOutputType(comptime T: type) type {
    return switch (@typeInfo(T)) {
        .int => alignIntegerType(T),
        else => T,
    };
}

pub fn parseFromSlice(comptime T: type, slice: []const u8, gpa: std.mem.Allocator, comptime options: ParseOptions) !ParseOutputType(T) {
    var scanner: Scanner = .init(slice);
    defer scanner.deinit();

    return parseFromTokenSource(T, &scanner, gpa, options);
}

pub fn parseFromTokenSource(comptime T: type, scanner: *Scanner, gpa: std.mem.Allocator, comptime options: ParseOptions) !ParseOutputType(T) {
    assert(try scanner.next() == .identifier);
    const value = try innerParse(T, scanner, gpa, options);
    assert(try scanner.next() == .eos);
    return value;
}

/// Allocator is only used for dynamic slices and strings
pub fn innerParse(comptime T: type, scanner: *Scanner, gpa: std.mem.Allocator, comptime options: ParseOptions) !ParseOutputType(T) {
    switch (@typeInfo(T)) {
        .void => return,
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

                    return try innerParse(optional.child, scanner, gpa, options);
                },
                else => return if (comptime options.non_typed_optionals == .allow) try innerParse(optional.child, scanner, gpa, options) else error.UnexpectedToken,
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
            if (union_info.tag_type) |tag_type| {
                const token = try scanner.next();
                if (token != .@"union") return error.UnexpectedToken;
                const union_tag = try innerParse(@typeInfo(tag_type).@"enum".tag_type, scanner, gpa, options);
                inline for (union_info.fields) |field| {
                    if (std.mem.eql(u8, field.name, @tagName(@as(tag_type, @enumFromInt(union_tag))))) return @unionInit(T, field.name, try innerParse(field.type, scanner, gpa, options));
                }
            } else @compileError("Unable to parse into untagged union '" ++ @typeName(T) ++ "'");

            return error.InvalidUnion;
        },
        .pointer => |pointer_info| {
            switch (pointer_info.size) {
                .slice => {
                    if (pointer_info.is_const and pointer_info.child == u8) {
                        const token = try scanner.next();
                        if (token != .string) return error.UnexpectedToken;

                        const str = try gpa.dupe(u8, scanner.input[scanner.cursor .. scanner.cursor + token.string]);
                        scanner.cursor += token.string;
                        scanner.state = .post_value;
                        return str;
                    }

                    switch (@typeInfo(pointer_info.child)) {
                        .int => |int| {
                            const token = try scanner.next();
                            if (token != .vector) return error.UnexpectedToken;

                            const first = try scanner.next();
                            if (first != .int) return error.UnexpectedToken;

                            if (comptime !options.ignore_integer_signedness) {
                                if (first.int.signedness != int.signedness) return error.WrongIntegerType;
                            }

                            const element_byte_length = first.int.view.len;
                            const N = alignIntegerType(pointer_info.child);
                            var arr: std.ArrayList(N) = try .initCapacity(gpa, 1);

                            try arr.append(gpa, sliceToInt(N, first.int.view));

                            // The first element is already retrieved
                            for (1..token.vector) |_| {
                                const value_start = scanner.cursor;
                                scanner.cursor += element_byte_length;
                                try arr.append(gpa, sliceToInt(N, scanner.input[value_start..scanner.cursor]));
                            }

                            return try arr.toOwnedSlice(gpa);
                        },
                        .float => {
                            const token = try scanner.next();
                            if (token != .vector) return error.UnexpectedToken;
                            var arr: std.ArrayList(pointer_info.child) = .empty;
                            return try arr.toOwnedSlice(gpa);
                        },
                        .bool => {
                            const token = try scanner.next();
                            if (token != .vector) return error.UnexpectedToken;
                            var arr: std.ArrayList(bool) = .empty;

                            for (0..token.tuple) |_| {
                                const b = try scanner.next();
                                if (b != .bool) return error.UnexpectedToken;
                                try arr.append(gpa, switch (b.bool) {
                                    .false => false,
                                    .true => true,
                                });
                            }

                            return try arr.toOwnedSlice(gpa);
                        },
                        else => {
                            const token = try scanner.next();
                            if (token != .tuple) return error.UnexpectedToken;
                            var arr: std.ArrayList(pointer_info.child) = .empty;

                            for (0..token.tuple) |_| {
                                try arr.append(gpa, try innerParse(pointer_info.child, scanner, gpa, options));
                            }

                            return try arr.toOwnedSlice(gpa);
                        },
                    }
                },
                else => @compileError("Unsupported pointer type"),
            }
        },
        .@"struct" => |struct_info| {
            if (struct_info.layout == .@"packed") {
                const token = try scanner.peekNextTokenType();
                if (token != .int) return error.UnexpectedToken;
                return @bitCast(try innerParse(struct_info.backing_integer.?, scanner, gpa, options));
            }

            if (struct_info.is_tuple) {
                const token = try scanner.next();
                if (token != .tuple) return error.UnexpectedToken;
                assert(struct_info.fields.len == token.tuple);

                var r: T = undefined;

                inline for (struct_info.fields, 0..) |field, i| {
                    r[i] = try innerParse(field.type, scanner, gpa, options);
                }

                return r;
            }

            const token = try scanner.next();
            if (token != .@"struct") return error.UnexpectedToken;
            assert(struct_info.fields.len == token.@"struct");
            var r: T = undefined;

            for (0..token.@"struct") |_| {
                const field_name = try innerParse([]const u8, scanner, gpa, options);
                defer gpa.free(field_name);
                inline for (struct_info.fields) |field| {
                    if (std.mem.eql(u8, field.name, field_name)) {
                        @field(r, field.name) = try innerParse(field.type, scanner, gpa, options);
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
