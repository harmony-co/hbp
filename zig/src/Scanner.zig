const std = @import("std");

pub const Scanner = @This();

state: State = .identifier,
value_start: usize = undefined,
input: []const u8 = undefined,
cursor: usize = 0,

/// Allocator used purely for the bitstack
pub fn init(input: []const u8) Scanner {
    return .{
        .input = input,
    };
}

pub fn deinit(self: *Scanner) void {
    self.* = undefined;
}

pub fn peekNextTokenType(self: *Scanner) !TokenType {
    switch (self.state) {
        .marker => {
            const m = std.enums.fromInt(MarkerType, self.input[self.cursor]) orelse return error.UnknownMarker;
            return switch (m) {
                .null => .null,
                .false => .false,
                .true => .true,
                .signed_int_8,
                .signed_int_16,
                .signed_int_32,
                .signed_int64,
                .signed_int_128,
                .signed_int_256,
                .signed_int_512,
                .arbitrary_signed_int,
                .unsigned_int_8,
                .unsigned_int_16,
                .unsigned_int_32,
                .unsigned_int64,
                .unsigned_int_128,
                .unsigned_int_256,
                .unsigned_int_512,
                .arbitrary_unsigned_int,
                => .int,
                .half_float,
                // .minifloat,
                .single_float,
                // .extended_float_40,
                .double_float,
                .extended_float_80,
                .quadruple_float,
                // .octuple_float,
                // .brain_float,
                => .float,
                .empty_tuple,
                .tuple_1,
                .tuple_2,
                .tuple_3,
                .tuple_4,
                .tuple_5,
                .tuple_6,
                .tuple_7,
                .tuple_8,
                .tuple_9,
                .tuple_10,
                .tuple_11,
                .tuple_12,
                .tuple_13,
                .tuple_14,
                .tuple_15,
                .arbitrary_tuple_1,
                .arbitrary_tuple_2,
                .arbitrary_tuple_4,
                => .tuple,
                .optional => .optional,
                else => error.NotImplemented,
            };
        },
        else => return error.UnsupportedLookup,
    }
}

pub fn next(self: *Scanner) !Token {
    state: switch (self.state) {
        .identifier => {
            self.cursor += 1;
            self.state = .marker;
            return .{ .identifier = self.input[0] };
        },
        .marker => {
            const m = std.enums.fromInt(MarkerType, self.input[self.cursor]) orelse return error.UnknownMarker;
            switch (m) {
                .optional => {
                    self.cursor += 1;
                    return .optional;
                },
                .null => {
                    self.cursor += 1;
                    self.state = .post_value;
                    return .null;
                },
                .false => {
                    self.cursor += 1;
                    self.state = .post_value;
                    return .false;
                },
                .true => {
                    self.cursor += 1;
                    self.state = .post_value;
                    return .true;
                },
                .signed_int_8,
                .signed_int_16,
                .signed_int_32,
                .signed_int64,
                .signed_int_128,
                .signed_int_256,
                .signed_int_512,
                => {
                    self.state = .int;
                    continue :state .int;
                },
                .arbitrary_signed_int => {
                    self.cursor += 1;
                    self.state = .arbitrary_int;
                    continue :state .arbitrary_int;
                },
                .unsigned_int_8,
                .unsigned_int_16,
                .unsigned_int_32,
                .unsigned_int64,
                .unsigned_int_128,
                .unsigned_int_256,
                .unsigned_int_512,
                => {
                    self.state = .uint;
                    continue :state .uint;
                },
                .arbitrary_unsigned_int => {
                    self.cursor += 1;
                    self.state = .arbitrary_uint;
                    continue :state .arbitrary_uint;
                },
                .half_float => {
                    self.cursor += 3;
                    self.state = .post_value;
                    return .{ .float = .{ .bits = 16, .view = self.input[self.cursor - 2 .. self.cursor] } };
                },
                // .minifloat,
                .single_float => {
                    self.cursor += 5;
                    self.state = .post_value;
                    return .{ .float = .{ .bits = 32, .view = self.input[self.cursor - 4 .. self.cursor] } };
                },
                // .extended_float_40,
                .double_float => {
                    self.cursor += 9;
                    self.state = .post_value;
                    return .{ .float = .{ .bits = 64, .view = self.input[self.cursor - 8 .. self.cursor] } };
                },
                .extended_float_80 => {
                    self.cursor += 11;
                    self.state = .post_value;
                    return .{ .float = .{ .bits = 80, .view = self.input[self.cursor - 10 .. self.cursor] } };
                },
                .quadruple_float => {
                    self.cursor += 17;
                    self.state = .post_value;
                    return .{ .float = .{ .bits = 128, .view = self.input[self.cursor - 16 .. self.cursor] } };
                },
                // .octuple_float,
                // .brain_float,
                .empty_string,
                .string_1,
                .string_2,
                .string_3,
                .string_4,
                .string_5,
                .string_6,
                .string_7,
                .string_8,
                .string_9,
                .string_10,
                .string_11,
                .string_12,
                .string_13,
                .string_14,
                .string_15,
                => {
                    const byte_length = self.input[self.cursor] - 0x60;
                    self.cursor += 1;
                    return self.parseStringState(byte_length);
                },
                // TODO: The spec for arbitrary strings is a bit more complex than this
                // But since its not yet documented we aren't implementing it fully
                .arbitrary_string_1 => {
                    self.cursor += 1;
                    const byte_length = std.mem.nativeToBig(u8, self.input[self.cursor]);
                    self.cursor += 1;
                    return self.parseStringState(byte_length);
                },
                .arbitrary_string_2 => {
                    self.cursor += 1;
                    const byte_length = std.mem.nativeToBig(u16, std.mem.bytesToValue(u16, self.input[self.cursor .. self.cursor + 2]));
                    self.cursor += 2;
                    return self.parseStringState(byte_length);
                },
                .arbitrary_string_4 => {
                    self.cursor += 1;
                    const byte_length = std.mem.nativeToBig(u32, std.mem.bytesToValue(u32, self.input[self.cursor .. self.cursor + 4]));
                    self.cursor += 4;
                    return self.parseStringState(byte_length);
                },
                .empty_tuple,
                .tuple_1,
                .tuple_2,
                .tuple_3,
                .tuple_4,
                .tuple_5,
                .tuple_6,
                .tuple_7,
                .tuple_8,
                .tuple_9,
                .tuple_10,
                .tuple_11,
                .tuple_12,
                .tuple_13,
                .tuple_14,
                .tuple_15,
                => {
                    const byte_length = self.input[self.cursor] - 0x70;
                    self.cursor += 1;
                    return self.parseTupleState(byte_length);
                },
                .arbitrary_tuple_1 => {
                    self.cursor += 1;
                    const byte_length = std.mem.nativeToBig(u8, self.input[self.cursor]);
                    self.cursor += 1;
                    return self.parseTupleState(byte_length);
                },
                .arbitrary_tuple_2 => {
                    self.cursor += 1;
                    const byte_length = std.mem.nativeToBig(u16, std.mem.bytesToValue(u16, self.input[self.cursor .. self.cursor + 2]));
                    self.cursor += 2;
                    return self.parseTupleState(byte_length);
                },
                .arbitrary_tuple_4 => {
                    self.cursor += 1;
                    const byte_length = std.mem.nativeToBig(u32, std.mem.bytesToValue(u32, self.input[self.cursor .. self.cursor + 4]));
                    self.cursor += 4;
                    return self.parseTupleState(byte_length);
                },
                .arbitrary_dict_1 => {
                    self.cursor += 1;
                    const byte_length = std.mem.nativeToBig(u8, self.input[self.cursor]);
                    self.cursor += 1;
                    return self.parseStructState(byte_length);
                },
                .arbitrary_dict_2 => {
                    self.cursor += 1;
                    const byte_length = std.mem.nativeToBig(u16, std.mem.bytesToValue(u16, self.input[self.cursor .. self.cursor + 2]));
                    self.cursor += 2;
                    return self.parseStructState(byte_length);
                },
                .arbitrary_dict_4 => {
                    self.cursor += 1;
                    const byte_length = std.mem.nativeToBig(u32, std.mem.bytesToValue(u32, self.input[self.cursor .. self.cursor + 4]));
                    self.cursor += 4;
                    return self.parseStructState(byte_length);
                },
                //? TODO?: Could be worth optimizing u1 enums in the sense of booleans, this has to be discussed further
                // NOTE: Maybe it could be worth to allow enums to omit the type marker for `u8` enums
                .@"enum" => {
                    self.cursor += 1;
                    if (self.input[self.cursor] == @intFromEnum(MarkerType.arbitrary_unsigned_int)) {
                        self.cursor += 1;
                        self.state = .arbitrary_uint;
                    } else {
                        self.state = .uint;
                    }

                    return .@"enum";
                },
                .@"union" => {
                    self.cursor += 1;
                    return .@"union";
                },
                else => return error.NotImplemented,
            }
        },
        .int, .uint => {
            const marker = self.input[self.cursor];
            self.cursor += 1;
            const byte_length = try calculateIntegerByteLength(marker);
            const value_start = self.cursor;
            self.cursor += byte_length;
            const state = self.state;
            self.state = .post_value;

            return .{
                .int = .{
                    .signedness = if (state == .int) .signed else .unsigned,
                    .view = self.input[value_start..self.cursor],
                },
            };
        },
        .arbitrary_int, .arbitrary_uint => {
            const byte_length = std.mem.nativeToBig(u16, std.mem.bytesToValue(u16, self.input[self.cursor .. self.cursor + 2]));
            self.cursor += 2;
            const value_start = self.cursor;
            self.cursor += byte_length;
            const state = self.state;
            self.state = .post_value;

            return .{
                .int = .{
                    .signedness = if (state == .arbitrary_int) .signed else .unsigned,
                    .view = self.input[value_start..self.cursor],
                },
            };
        },
        .post_value => {
            if (self.checkEnd()) return .eos;
            // NOTE: If no changes are necessary here after all types have been implemented
            // remove this and add a simple check to the beginning of `marker` instead.
            self.state = .marker;
            continue :state .marker;
        },
    }
}

fn calculateIntegerByteLength(marker: u8) !usize {
    return switch (marker) {
        0x10...0x16 => std.math.pow(usize, 2, (marker - 0x10)),
        0x20...0x26 => std.math.pow(usize, 2, (marker - 0x20)),
        else => error.InvalidMarker,
    };
}

fn checkEnd(self: *Scanner) bool {
    return self.cursor >= self.input.len;
}

fn parseStringState(self: *Scanner, byte_length: u32) Token {
    self.state = if (byte_length == 0) .post_value else .marker;
    return .{ .string = byte_length };
}

fn parseTupleState(self: *Scanner, byte_length: u32) Token {
    self.state = if (byte_length == 0) .post_value else .marker;
    return .{ .tuple = byte_length };
}

fn parseStructState(self: *Scanner, kv_pairs: u32) Token {
    self.state = if (kv_pairs == 0) .post_value else .marker;
    return .{ .@"struct" = kv_pairs };
}

pub const MarkerType = enum(u8) {
    null = 0x00,
    false = 0x01,
    true = 0x02,
    signed_int_8 = 0x10,
    signed_int_16 = 0x11,
    signed_int_32 = 0x12,
    signed_int64 = 0x13,
    signed_int_128 = 0x14,
    signed_int_256 = 0x15,
    signed_int_512 = 0x16,
    arbitrary_signed_int = 0x1F,
    unsigned_int_8 = 0x20,
    unsigned_int_16 = 0x21,
    unsigned_int_32 = 0x22,
    unsigned_int64 = 0x23,
    unsigned_int_128 = 0x24,
    unsigned_int_256 = 0x25,
    unsigned_int_512 = 0x26,
    arbitrary_unsigned_int = 0x2F,
    half_float = 0x30,
    minifloat = 0x31,
    single_float = 0x32,
    extended_float_40 = 0x33,
    double_float = 0x34,
    extended_float_80 = 0x35,
    quadruple_float = 0x36,
    octuple_float = 0x37,
    brain_float = 0x3F,
    decimal_32 = 0x3A,
    decimal_64 = 0x3B,
    decimal_128 = 0x3C,
    empty_string = 0x60,
    string_1 = 0x61,
    string_2 = 0x62,
    string_3 = 0x63,
    string_4 = 0x64,
    string_5 = 0x65,
    string_6 = 0x66,
    string_7 = 0x67,
    string_8 = 0x68,
    string_9 = 0x69,
    string_10 = 0x6A,
    string_11 = 0x6B,
    string_12 = 0x6C,
    string_13 = 0x6D,
    string_14 = 0x6E,
    string_15 = 0x6F,
    arbitrary_string_1 = 0xC0,
    arbitrary_string_2 = 0xC1,
    arbitrary_string_4 = 0xC2,
    empty_tuple = 0x70,
    tuple_1 = 0x71,
    tuple_2 = 0x72,
    tuple_3 = 0x73,
    tuple_4 = 0x74,
    tuple_5 = 0x75,
    tuple_6 = 0x76,
    tuple_7 = 0x77,
    tuple_8 = 0x78,
    tuple_9 = 0x79,
    tuple_10 = 0x7A,
    tuple_11 = 0x7B,
    tuple_12 = 0x7C,
    tuple_13 = 0x7D,
    tuple_14 = 0x7E,
    tuple_15 = 0x7F,
    arbitrary_tuple_1 = 0xDA,
    arbitrary_tuple_2 = 0xDB,
    arbitrary_tuple_4 = 0xDC,
    empty_vector = 0x80,
    vector_1 = 0x81,
    vector_2 = 0x82,
    vector_3 = 0x83,
    vector_4 = 0x84,
    vector_5 = 0x85,
    vector_6 = 0x86,
    vector_7 = 0x87,
    vector_8 = 0x88,
    vector_9 = 0x89,
    vector_10 = 0x8A,
    vector_11 = 0x8B,
    vector_12 = 0x8C,
    vector_13 = 0x8D,
    vector_14 = 0x8E,
    vector_15 = 0x8F,
    arbitrary_vector_1 = 0xDD,
    arbitrary_vector_2 = 0xDE,
    arbitrary_vector_4 = 0xDF,

    // TODO: Have optimized markers like lists
    arbitrary_dict_1 = 0xD0,
    arbitrary_dict_2 = 0xD1,
    arbitrary_dict_4 = 0xD2,
    optional = 0xE0,
    @"enum" = 0xE1,
    @"union" = 0xE2,
    @"error" = 0xFF,
};

pub const State = enum {
    identifier,
    marker,
    post_value,
    int,
    arbitrary_int,
    uint,
    arbitrary_uint,
};

pub const TokenType = enum {
    identifier,
    null,
    false,
    true,
    int,
    float,
    string,
    tuple,
    @"struct",
    optional,
    @"enum",
    @"union",
    eos,
};

pub const Token = union(TokenType) {
    identifier: u8,
    null,
    false,
    true,
    int: struct {
        signedness: std.builtin.Signedness,
        view: []const u8,
    },
    float: struct {
        bits: u16,
        view: []const u8,
    },
    string: u32,
    tuple: u32,
    @"struct": u32,
    optional,
    @"enum",
    @"union",
    eos,
};

test {
    _ = @import("./scanner_test.zig");
}
