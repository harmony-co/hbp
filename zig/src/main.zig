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
    var allocator: std.heap.GeneralPurposeAllocator(.{}) = .init;
    const gpa = allocator.allocator();

    for (test_bool) |in| {
        print(bool, gpa, in);
    }
    for (test_int) |in| {
        print(i512, gpa, in);
    }
    for (test_uint) |in| {
        print(u512, gpa, in);
    }
    for (test_float) |in| {
        print(f128, gpa, in);
    }

    print(struct { u8, u16 }, gpa, comptime Serializer.serializeComptime(struct { u8, u16 }, .{ 36, 3204 }));
    print(?u8, gpa, comptime Serializer.serializeComptime(?u8, 250));
    print(?u8, gpa, comptime Serializer.serializeComptime(?u8, null));
    print(enum { TEST }, gpa, comptime Serializer.serializeComptime(enum { TEST }, .TEST));
    print([]const u8, gpa, comptime Serializer.serializeComptime([]const u8, "hello world"));
    print(struct { x: u32 }, gpa, comptime Serializer.serializeComptime(struct { x: u32 }, .{ .x = 43545 }));
    print(union(enum(u1)) { x: u32, y: []const u8 }, gpa, comptime Serializer.serializeComptime(union(enum(u1)) { x: u32, y: []const u8 }, .{ .x = 760589 }));
    print(union(enum(u1)) { x: u32, y: []const u8 }, gpa, comptime Serializer.serializeComptime(union(enum(u1)) { x: u32, y: []const u8 }, .{ .y = "yo world" }));
    print([]u8, gpa, comptime Serializer.serializeComptime([]u8, @constCast(@as([]const u8, &.{ 10, 60, 134 }))));
    const t = struct { x: u32 };
    print([]t, gpa, comptime Serializer.serializeComptime([]t, @constCast(@as([]const t, &.{ .{ .x = 10 }, .{ .x = 60 }, .{ .x = 134 } }))));
    print(packed struct(u64) { t: bool, z: bool, _: u62 }, gpa, comptime Serializer.serializeComptime(packed struct(u64) { t: bool, z: bool, _: u62 = 0 }, .{ .t = false, .z = true }));
}

fn print(comptime T: type, gpa: std.mem.Allocator, payload: []const u8) void {
    var buf: [512]u8 = undefined;
    std.debug.print("-------------------------------------------------\n", .{});
    std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf, payload)});
    std.debug.print("Parsed Payload: {any}\n", .{Deserializer.parseFromSlice(T, payload, gpa, .{})});
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
