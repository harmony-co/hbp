const std = @import("std");
const Scanner = @import("Scanner.zig");
const Serializer = @import("./serializer.zig");
const Token = Scanner.Token;

const expect = std.testing.expect;
const eql = std.mem.eql;

test "null" {
    var scanner: Scanner = .init(&.{ 0x01, 0x00 });
    defer scanner.deinit();

    try expectNext(&scanner, .{ .identifier = 1 });
    try expectNext(&scanner, .null);
    try expectNext(&scanner, .eos);
}

test "bool" {
    var scanner: Scanner = .init(&.{ 0x01, 0x01 });

    try expectNext(&scanner, .{ .identifier = 1 });
    try expectNext(&scanner, .false);
    try expectNext(&scanner, .eos);

    scanner.deinit();
    scanner = .init(&.{ 0x01, 0x02 });
    defer scanner.deinit();

    try expectNext(&scanner, .{ .identifier = 1 });
    try expectNext(&scanner, .true);
    try expectNext(&scanner, .eos);
}

test "int" {
    const test_input = [_][]const u8{
        Serializer.serializeComptime(i8, 45),
        Serializer.serializeComptime(i16, 6347),
        Serializer.serializeComptime(i32, 9123424),
        Serializer.serializeComptime(i64, 5294967295),
        Serializer.serializeComptime(i128, 28446744073709551615),
        Serializer.serializeComptime(i256, 340282366920938463463375607431768211456),
        Serializer.serializeComptime(i512, 115792089237316395423570985008687907853269984665640564039457584007913129639935),
        Serializer.serializeComptime(u8, 250),
        Serializer.serializeComptime(u16, 6347),
        Serializer.serializeComptime(u32, 9123424),
        Serializer.serializeComptime(u64, 5294967295),
        Serializer.serializeComptime(u128, 28446744073709551615),
        Serializer.serializeComptime(u256, 340282366920938463463375607431768211456),
        Serializer.serializeComptime(u512, 115792089237316395423570985008687907853269984665640564039457584007913129639935),
    };
    const test_output = [_]Token{
        Token{ .int = .{ .signedness = .signed, .view = &.{0x2D} } },
        Token{ .int = .{ .signedness = .signed, .view = &.{ 0x18, 0xCB } } },
        Token{ .int = .{ .signedness = .signed, .view = &.{ 0x00, 0x8B, 0x36, 0x60 } } },
        Token{ .int = .{ .signedness = .signed, .view = &.{ 0x00, 0x00, 0x00, 0x01, 0x3B, 0x9A, 0xC9, 0xFF } } },
        Token{ .int = .{ .signedness = .signed, .view = &.{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x8A, 0xC7, 0x23, 0x04, 0x89, 0xE7, 0xFF, 0xFF } } },
        Token{ .int = .{ .signedness = .signed, .view = &.{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x8D, 0x7E, 0xA4, 0xC6, 0x80, 0x00 } } },
        Token{ .int = .{ .signedness = .signed, .view = &.{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7C, 0x75, 0xD6, 0x95, 0xC2, 0x70, 0x6A, 0xC5, 0xE9, 0x70, 0x44, 0xC3, 0xB2, 0xD3, 0xEF, 0x59, 0x29, 0x94, 0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF } } },

        Token{ .int = .{ .signedness = .unsigned, .view = &.{0xFA} } },
        Token{ .int = .{ .signedness = .unsigned, .view = &.{ 0x18, 0xCB } } },
        Token{ .int = .{ .signedness = .unsigned, .view = &.{ 0x00, 0x8B, 0x36, 0x60 } } },
        Token{ .int = .{ .signedness = .unsigned, .view = &.{ 0x00, 0x00, 0x00, 0x01, 0x3B, 0x9A, 0xC9, 0xFF } } },
        Token{ .int = .{ .signedness = .unsigned, .view = &.{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x8A, 0xC7, 0x23, 0x04, 0x89, 0xE7, 0xFF, 0xFF } } },
        Token{ .int = .{ .signedness = .unsigned, .view = &.{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x8D, 0x7E, 0xA4, 0xC6, 0x80, 0x00 } } },
        Token{ .int = .{ .signedness = .unsigned, .view = &.{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7C, 0x75, 0xD6, 0x95, 0xC2, 0x70, 0x6A, 0xC5, 0xE9, 0x70, 0x44, 0xC3, 0xB2, 0xD3, 0xEF, 0x59, 0x29, 0x94, 0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF } } },
    };

    for (test_input, 0..) |in, i| {
        var scanner: Scanner = .init(in);
        defer scanner.deinit();

        const out = test_output[i];
        try expectNext(&scanner, .{ .identifier = 1 });
        try expectNext(&scanner, out);
        try expectNext(&scanner, .eos);
    }
}

fn expectNext(scanner: *Scanner, expected_token: Scanner.Token) !void {
    const token = try scanner.next();
    try std.testing.expectEqual(std.meta.activeTag(expected_token), std.meta.activeTag(token));

    switch (expected_token) {
        .int => |expected_value| {
            try expect(eql(u8, expected_value.view, token.int.view));
        },
        .float => |expected_value| {
            try expect(eql(u8, expected_value.view, token.int.view));
        },
        .identifier,
        .null,
        .false,
        .true,
        .tuple,
        .optional,
        .@"enum",
        .eos,
        => {},
    }
}
