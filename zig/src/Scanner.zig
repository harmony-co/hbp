const std = @import("std");

const BitStack = std.BitStack;

const Scanner = @This();

stack: BitStack,
state: State = .version,
value_start: usize = undefined,
input: []const u8 = undefined,
cursor: usize = 0,

/// Allocator used purely for the bitstack
pub fn init(gpa: std.mem.Allocator, input: []const u8) Scanner {
    return .{
        .stack = .init(gpa),
        .input = input,
    };
}

pub fn deinit(self: *Scanner) void {
    self.stack.deinit();
    self.* = undefined;
}

pub fn next(self: *Scanner) !Token {
    state: switch (self.state) {
        .version => {
            self.cursor += 1;
            self.state = .marker;
            return .{ .version = self.input[0] };
        },
        .marker => {
            const m = std.enums.fromInt(MarkerType, self.input[self.cursor]) orelse return error.UnknownMarker;
            switch (m) {
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
                    continue :state .int;
                },
                .unsigned_int_8,
                .unsigned_int_16,
                .unsigned_int_32,
                .unsigned_int64,
                .unsigned_int_128,
                .unsigned_int_256,
                .unsigned_int_512,
                => {
                    continue :state .uint;
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
                else => return error.NotImplemented,
            }
        },
        .int => {
            const marker = self.input[self.cursor];
            self.cursor += 1;

            const byte_length = try calculateIntegerByteLength(marker);
            const value_start = self.cursor;
            self.cursor += byte_length;
            self.state = .post_value;

            return .{ .int = .{
                .signedness = .signed,
                .view = self.input[value_start..self.cursor],
            } };
        },
        .uint => {
            const marker = self.input[self.cursor];
            self.cursor += 1;

            const byte_length = try calculateIntegerByteLength(marker);
            const value_start = self.cursor;
            self.cursor += byte_length;
            self.state = .post_value;

            return .{ .int = .{
                .signedness = .unsigned,
                .view = self.input[value_start..self.cursor],
            } };
        },
        .post_value => {
            if (try self.checkEnd()) return .eos;
            return error.NeedToImplement;
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

fn checkEnd(self: *Scanner) !bool {
    if (self.cursor >= self.input.len) {
        if (self.stack.bit_len == 0) return true;
        return error.BufferUnderrun;
    }
    return false;
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
    string = 0xE0,
    vector = 0xE3,
    optional = 0xF0,
    @"enum" = 0xF1,
    @"error" = 0xFF,
    empty_array = 0x70,
    array_1 = 0x71,
    array_2 = 0x72,
    array_3 = 0x73,
    array_4 = 0x74,
    array_5 = 0x75,
    array_6 = 0x76,
    array_7 = 0x77,
    array_8 = 0x78,
    array_9 = 0x79,
    array_10 = 0x7A,
    array_11 = 0x7B,
    array_12 = 0x7C,
    array_13 = 0x7D,
    array_14 = 0x7E,
    array_15 = 0x7F,
    dyn_array_1 = 0xDA,
    dyn_array_2 = 0xDB,
    dyn_array_4 = 0xDC,
    list_1 = 0x81,
    list_2 = 0x82,
    list_3 = 0x83,
    list_4 = 0x84,
    list_5 = 0x85,
    list_6 = 0x86,
    list_7 = 0x87,
    list_8 = 0x88,
    list_9 = 0x89,
    list_10 = 0x8A,
    list_11 = 0x8B,
    list_12 = 0x8C,
    list_13 = 0x8D,
    list_14 = 0x8E,
    list_15 = 0x8F,
    dyn_list_1 = 0xDD,
    dyn_list_2 = 0xDE,
    dyn_list_4 = 0xDF,

    // TODO: Have optimized markers like lists
    dyn_dict_1 = 0xD0,
    dyn_dict_2 = 0xD1,
    dyn_dict_4 = 0xD2,
};

pub const State = enum {
    version,
    marker,
    post_value,
    int,
    uint,
};

pub const Token = union(enum) {
    version: u8,
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
    eos,
};

test {
    _ = @import("./scanner_test.zig");
}
