const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const config_options = b.addOptions();
    config_options.addOption(u8, "HBP_VERSION", 1);

    const exe = b.addExecutable(.{
        .name = "hbp",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    exe.root_module.addOptions("config", config_options);
    run_cmd.step.dependOn(b.getInstallStep());

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);

    const check = b.step("check", "Check if it compiles");
    check.dependOn(&exe.step);

    const exe_test = b.addTest(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    exe_test.root_module.addOptions("config", config_options);

    const test_artifact = b.addRunArtifact(exe_test);
    const test_step = b.step("test", "Run unit tests on the exports");
    test_step.dependOn(&test_artifact.step);
}
