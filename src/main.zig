const std = @import("std");
const Serializer = @import("./Serializer.zig");
const Deserializer = @import("./Deserializer.zig");

pub fn main() !void {
    var buf: [100]u8 = undefined;
    const serialized = Serializer.serializeInt(u8, &buf, 205);
    const deserialized = Deserializer.deserializeIntAssumeType(u8, serialized);

    var buf2: [10000]u8 = undefined;
    std.debug.print("HBP payload: {s} ({d})\n", .{ readableOutput(&buf2, serialized), deserialized });
}

inline fn readableOutput(buffer: []u8, input: []const u8) []const u8 {
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
    std.testing.refAllDecls(@This());
}
