const std = @import("std");
const Serializer = @import("./Serializer.zig");
const Deserializer = @import("./static.zig");
const Scanner = @import("./Scanner.zig");

const test_bool = [_][]const u8{
    &.{ 0x01, 0x01 },
    &.{ 0x01, 0x02 },
};

const test_int = [_][]const u8{
    &Serializer.serializeInt(i8, 45),
    &Serializer.serializeInt(i16, 6347),
    &Serializer.serializeInt(i32, 9123424),
    &Serializer.serializeInt(i64, 5294967295),
    &Serializer.serializeInt(i128, 28446744073709551615),
    &Serializer.serializeInt(i256, 340282366920938463463375607431768211456),
    &Serializer.serializeInt(i512, 115792089237316395423570985008687907853269984665640564039457584007913129639935),
    &Serializer.serializeInt(i6, 30),
    &Serializer.serializeInt(i38, 9123424),
    &Serializer.serializeInt(i80, 5294967295),
};
const test_uint = [_][]const u8{
    &Serializer.serializeInt(u8, 250),
    &Serializer.serializeInt(u16, 6347),
    &Serializer.serializeInt(u32, 9123424),
    &Serializer.serializeInt(u64, 5294967295),
    &Serializer.serializeInt(u128, 28446744073709551615),
    &Serializer.serializeInt(u256, 340282366920938463463375607431768211456),
    &Serializer.serializeInt(u512, 115792089237316395423570985008687907853269984665640564039457584007913129639935),
    &Serializer.serializeInt(u6, 30),
    &Serializer.serializeInt(u38, 9123424),
    &Serializer.serializeInt(u80, 5294967295),
};

const test_float = [_][]const u8{
    &Serializer.serializeFloat(f16, 20.11),
    &Serializer.serializeFloat(f32, 202.5456),
    &Serializer.serializeFloat(f64, 220.563564),
    &Serializer.serializeFloat(f80, 25460.565667657),
    &Serializer.serializeFloat(f128, 2024.5689076899345),
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
    const in = &.{ 0x01, 0x72, 0x20, 0xFF, 0x21, 0x00, 0x13 };
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, in)});
    std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(struct { u8, u16 }, in, .{ .float_behavior = .widen })});
    buf = undefined;

    // var s: Scanner = .init(allocator, &serialized);
    // while (true) {
    //     const token = try s.next();
    //     if (token == .eos) break;

    //     std.debug.print("Scanner: {any}\n", .{token});
    // }
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
