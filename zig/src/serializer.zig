const std = @import("std");
const MarkerType = @import("./Scanner.zig").MarkerType;

const HBP_VERSION = 1;

pub fn serializeComptime(comptime T: type, value: T) []const u8 {
    comptime {
        var buf: [512]u8 = undefined;
        var w: std.Io.Writer = .fixed(&buf);

        serialize(T, value, &w) catch unreachable;

        const buffered = w.buffered();
        const x: [buffered.len]u8 = buffered[0..buffered.len].*;
        return &x;
    }
}

pub fn serialize(comptime T: type, value: T, writer: *std.Io.Writer) !void {
    // TODO: Use proper identifier
    try writer.writeByte(HBP_VERSION);
    try innerSerialize(T, value, writer);
}

fn innerSerialize(comptime T: type, value: T, writer: *std.Io.Writer) !void {
    const type_info = @typeInfo(T);

    switch (type_info) {
        .optional => |optional_info| {
            try writer.writeByte(@intFromEnum(MarkerType.optional));
            if (value) |opt| {
                try innerSerialize(optional_info.child, opt, writer);
            } else {
                try writer.writeByte(@intFromEnum(MarkerType.null));
            }
        },
        .null => {
            try writer.writeByte(@intFromEnum(MarkerType.null));
        },
        .bool => {
            try writer.writeByte(0x01 + @as(u8, @intFromBool(value)));
        },
        .int => {
            const aligned_type = std.math.ByteAlignedInt(T);
            const int = @typeInfo(aligned_type).int;

            const marker = blk: {
                const base = @intFromEnum(if (int.signedness == .unsigned) MarkerType.unsigned_int_8 else MarkerType.signed_int_8);

                break :blk switch (int.bits) {
                    8 => base,
                    16 => base + 1,
                    32 => base + 2,
                    64 => base + 3,
                    128 => base + 4,
                    256 => base + 5,
                    512 => base + 6,
                    else => base + 0x0F,
                };
            };

            try writer.writeByte(marker);
            if (marker & 0x0F == 0x0F) try writer.writeAll(&@as([2]u8, @bitCast(std.mem.nativeToLittle(u16, @divExact(int.bits, 8)))));
            try writeInt(aligned_type, value, writer);
        },
        // TODO: How are we supporting our other float types?
        .float => |float_info| {
            const marker = switch (float_info.bits) {
                16 => @intFromEnum(MarkerType.half_float),
                32 => @intFromEnum(MarkerType.single_float),
                64 => @intFromEnum(MarkerType.double_float),
                80 => @intFromEnum(MarkerType.extended_float_80),
                128 => @intFromEnum(MarkerType.quadruple_float),
                else => unreachable,
            };

            try writer.writeByte(marker);
            try writer.writeAll(&@as([@divExact(float_info.bits, 8)]u8, @bitCast(std.mem.nativeToLittle(T, value))));
        },
        .pointer => |pointer_info| {
            switch (pointer_info.size) {
                .slice => {
                    // ! This check is erroneous
                    // Right now we assume all slices ([]const u8) are strings
                    std.debug.assert(pointer_info.child == u8);
                    if (value.len <= 15) {
                        try writer.writeByte(@intFromEnum(MarkerType.empty_string) + value.len);
                    } else if (value.len <= std.math.maxInt(u8)) {
                        try writer.writeByte(@intFromEnum(MarkerType.arbitrary_string_1));
                        try writeInt(u8, @intCast(value.len), writer);
                    } else if (value.len <= std.math.maxInt(u16)) {
                        try writer.writeByte(@intFromEnum(MarkerType.arbitrary_string_2));
                        try writeInt(u16, @intCast(value.len), writer);
                    } else if (value.len <= std.math.maxInt(u32)) {
                        try writer.writeByte(@intFromEnum(MarkerType.arbitrary_string_4));
                        try writeInt(u32, @intCast(value.len), writer);
                    }

                    try writer.writeAll(value);
                },
                else => @compileError("Unsupported pointer type"),
            }
        },
        .@"enum" => |enum_info| {
            std.debug.assert(@typeInfo(enum_info.tag_type).int.signedness == .unsigned);
            try writer.writeByte(@intFromEnum(MarkerType.@"enum"));
            try innerSerialize(enum_info.tag_type, @intFromEnum(value), writer);
        },
        .@"union" => |union_info| {
            if (union_info.tag_type) |tag_type| {
                inline for (union_info.fields) |field| {
                    if (value == @field(tag_type, field.name)) {
                        try writer.writeByte(@intFromEnum(MarkerType.@"union"));
                        try innerSerialize([]const u8, @tagName(value), writer);
                        try innerSerialize(field.type, @field(value, field.name), writer);
                    }
                }
            } else @compileError("Unable to parse non tagged union '" ++ @typeName(T) ++ "'");
        },
        .@"struct" => |struct_info| {
            if (struct_info.is_tuple) {
                if (struct_info.fields.len <= 15) {
                    try writer.writeByte(@intFromEnum(MarkerType.empty_tuple) + struct_info.fields.len);
                } else if (struct_info.fields.len <= std.math.maxInt(u8)) {
                    try writer.writeByte(@intFromEnum(MarkerType.arbitrary_tuple_1));
                    try writeInt(u8, @intCast(struct_info.fields.len), writer);
                } else if (struct_info.fields.len <= std.math.maxInt(u16)) {
                    try writer.writeByte(@intFromEnum(MarkerType.arbitrary_tuple_2));
                    try writeInt(u16, @intCast(struct_info.fields.len), writer);
                } else if (struct_info.fields.len <= std.math.maxInt(u32)) {
                    try writer.writeByte(@intFromEnum(MarkerType.arbitrary_tuple_4));
                    try writeInt(u32, @intCast(struct_info.fields.len), writer);
                }

                inline for (struct_info.fields, 0..) |field, i| {
                    try innerSerialize(field.type, value[i], writer);
                }
            } else {
                if (struct_info.fields.len <= std.math.maxInt(u8)) {
                    try writer.writeByte(@intFromEnum(MarkerType.arbitrary_dict_1));
                    try writeInt(u8, @intCast(struct_info.fields.len), writer);
                } else if (struct_info.fields.len <= std.math.maxInt(u16)) {
                    try writer.writeByte(@intFromEnum(MarkerType.arbitrary_dict_2));
                    try writeInt(u16, @intCast(struct_info.fields.len), writer);
                } else if (struct_info.fields.len <= std.math.maxInt(u32)) {
                    try writer.writeByte(@intFromEnum(MarkerType.arbitrary_dict_4));
                    try writeInt(u32, @intCast(struct_info.fields.len), writer);
                }

                inline for (struct_info.fields) |field| {
                    try innerSerialize([]const u8, field.name, writer);
                    try innerSerialize(field.type, @field(value, field.name), writer);
                }
            }
        },
        else => @compileError("Unsupported type"),
    }
}

fn writeInt(comptime T: type, value: T, writer: *std.Io.Writer) !void {
    try writer.writeAll(&@as([@divExact(@typeInfo(T).int.bits, 8)]u8, @bitCast(std.mem.nativeToLittle(T, @intCast(value)))));
}
