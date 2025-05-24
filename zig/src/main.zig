const std = @import("std");
const Serializer = @import("./Serializer.zig");
const Deserializer = @import("./Deserializer.zig");

pub fn main() !void {
    const serialized, const length = Serializer.serializeString(15, "Hello World");
    const deserialized, const len = try Deserializer.deserializeStringAssumeLength(15, serialized[0..length]);

    var buf2: [64]u8 = undefined;
    std.debug.print("HBP payload: {s} ({s})\n", .{ readableOutput(&buf2, serialized[0..length]), deserialized[0..len] });
    // std.debug.print("HBP payload: {s}\n", .{readableOutput(&buf2, serialized[0..length])});
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
    std.testing.refAllDecls(@This());
}
