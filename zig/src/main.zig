const std = @import("std");
const Serializer = @import("./serializer.zig");
const Deserializer = @import("./static.zig");
const Scanner = @import("./Scanner.zig");

const test_bool = [_][]const u8{
    Serializer.serializeComptime(bool, false),
    Serializer.serializeComptime(bool, true),
};

const test_int = [_][]const u8{
    Serializer.serializeComptime(i8, 45),
    Serializer.serializeComptime(i16, 6347),
    Serializer.serializeComptime(i32, 9123424),
    Serializer.serializeComptime(i64, 5294967295),
    Serializer.serializeComptime(i128, 28446744073709551615),
    Serializer.serializeComptime(i256, 340282366920938463463375607431768211456),
    Serializer.serializeComptime(i512, 115792089237316395423570985008687907853269984665640564039457584007913129639935),
    Serializer.serializeComptime(i6, 30),
    Serializer.serializeComptime(i38, 9123424),
    Serializer.serializeComptime(i80, 5294967295),
};
const test_uint = [_][]const u8{
    Serializer.serializeComptime(u8, 250),
    Serializer.serializeComptime(u16, 6347),
    Serializer.serializeComptime(u32, 9123424),
    Serializer.serializeComptime(u64, 5294967295),
    Serializer.serializeComptime(u128, 28446744073709551615),
    Serializer.serializeComptime(u256, 340282366920938463463375607431768211456),
    Serializer.serializeComptime(u512, 115792089237316395423570985008687907853269984665640564039457584007913129639935),
    Serializer.serializeComptime(u6, 30),
    Serializer.serializeComptime(u38, 9123424),
    Serializer.serializeComptime(u80, 5294967295),
};

const test_float = [_][]const u8{
    Serializer.serializeComptime(f16, 20.11),
    Serializer.serializeComptime(f32, 202.5456),
    Serializer.serializeComptime(f64, 220.563564),
    Serializer.serializeComptime(f80, 25460.565667657),
    Serializer.serializeComptime(f128, 2024.5689076899345),
};

pub fn main() !void {
    var buf: [512]u8 = undefined;
    for (test_bool) |in| {
        std.debug.print("-------------------------------------------------\n", .{});
        std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in)});
        std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(bool, in, .{})});
        buf = undefined;
    }
    for (test_int) |in| {
        std.debug.print("-------------------------------------------------\n", .{});
        std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in)});
        std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(i512, in, .{})});
        buf = undefined;
    }
    for (test_uint) |in| {
        std.debug.print("-------------------------------------------------\n", .{});
        std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in)});
        std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(u512, in, .{})});
        buf = undefined;
    }
    for (test_float) |in| {
        std.debug.print("-------------------------------------------------\n", .{});
        std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in)});
        std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(f128, in, .{ .float_behavior = .widen })});
        buf = undefined;
    }

    std.debug.print("-------------------------------------------------\n", .{});
    const in1 = comptime Serializer.serializeComptime(struct { u8, u16 }, .{ 36, 3204 });
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in1)});
    std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(struct { u8, u16 }, in1, .{})});
    buf = undefined;

    std.debug.print("-------------------------------------------------\n", .{});
    const in2 = comptime Serializer.serializeComptime(?u8, 250);
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in2)});
    std.debug.print("Parsed Payload: {any}\n", .{try Deserializer.parseFromSlice(?u8, in2, .{})});
    buf = undefined;

    std.debug.print("-------------------------------------------------\n", .{});
    const in3 = comptime Serializer.serializeComptime(?u8, null);
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in3)});
    std.debug.print("Parsed Payload: {any}\n", .{try Deserializer.parseFromSlice(?u8, in3, .{})});
    buf = undefined;

    std.debug.print("-------------------------------------------------\n", .{});
    const in4 = comptime Serializer.serializeComptime(u8, 246);
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in4)});
    std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(?u8, in4, .{})});
    buf = undefined;

    std.debug.print("-------------------------------------------------\n", .{});
    const in5 = comptime Serializer.serializeComptime(u8, 246);
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in5)});
    std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(?u8, in5, .{ .non_typed_optionals = .allow })});
    buf = undefined;

    std.debug.print("-------------------------------------------------\n", .{});
    const in6 = comptime Serializer.serializeComptime(enum { TEST }, .TEST);
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in6)});
    std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(enum { TEST }, in6, .{})});
    buf = undefined;

    std.debug.print("-------------------------------------------------\n", .{});
    const in7 = comptime Serializer.serializeComptime([]const u8, "hello world");
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in7)});
    std.debug.print("Parsed Payload: {s}\n", .{try Deserializer.parseFromSlice([]const u8, in7, .{})});
    buf = undefined;

    std.debug.print("-------------------------------------------------\n", .{});
    const in8 = comptime Serializer.serializeComptime(struct { x: u32 }, .{ .x = 43545 });
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in8)});
    std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(struct { x: u32 }, in8, .{})});
    buf = undefined;

    std.debug.print("-------------------------------------------------\n", .{});
    const in9 = comptime Serializer.serializeComptime(union(enum(u1)) { x: u32, y: []const u8 }, .{ .x = 760589 });
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in9)});
    std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(union(enum(u1)) { x: u32, y: []const u8 }, in9, .{})});
    buf = undefined;

    std.debug.print("-------------------------------------------------\n", .{});
    const in10 = comptime Serializer.serializeComptime(union(enum(u1)) { x: u32, y: []const u8 }, .{ .y = "yo world" });
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in10)});
    std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(union(enum(u1)) { x: u32, y: []const u8 }, in10, .{})});
    buf = undefined;
}

fn readableOutput(buffer: []u8, input: []const u8) []const u8 {
    const charset = "0123456789ABCDEF";

    var len: usize = 0;
    var i: usize = 0;
    while (len < input.len) : (len += 1) {
        const b = input[len];

        if (len != 0 and len * 2 % 2 == 0) {
            buffer[i] = ' ';
            i += 1;
        }

        buffer[i] = charset[b >> 4];
        i += 1;
        buffer[i] = charset[b & 15];
        i += 1;
    }

    return buffer[0..i];
}

test {
    std.testing.refAllDeclsRecursive(@This());
}
