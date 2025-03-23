// Generated by continue
import fs from "fs";
import path from "path";
import {
  walkDir,
  walkDirAsync,
  walkDirCache,
  walkDirs,
} from "../indexing/walkDir";
import { testIde } from "../test/fixtures";
import {
  addToTestDir,
  setUpTestDir,
  tearDownTestDir,
  TEST_DIR_PATH,
} from "../test/testDir";

describe("walkDir functions", () => {
  beforeEach(async () => {
    setUpTestDir();
  });

  afterEach(async () => {
    tearDownTestDir();
    walkDirCache.invalidate();
  });

  // describe.only("test speed", () => {
  //   it("should walk a simple directory structure", async () => {
  //     addToTestDir([
  //       "src/",
  //       ["src/file1.ts", "content1"],
  //       ["src/file2.ts", "content2"],
  //       "src/nested/",
  //       ["src/nested/file3.ts", "content3"],
  //     ]);

  //     const dir = await testIde.getWorkspaceDirs();

  //     const start = Date.now();
  //     for (let i = 0; i < 10000; i++) {
  //       await walkDir(dir[0], testIde);
  //     }
  //     const passed = Date.now() - start;
  //     console.log(`Test took ${passed} ms`);
  //   });
  // });

  describe("walkDir", () => {
    it("should walk a simple directory structure", async () => {
      addToTestDir([
        "src/",
        ["src/file1.ts", "content1"],
        ["src/file2.ts", "content2"],
        "src/nested/",
        ["src/nested/file3.ts", "content3"],
      ]);

      const files = await walkDir(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
      );

      expect(files.sort()).toEqual(
        [
          expect.stringContaining("src/file1.ts"),
          expect.stringContaining("src/file2.ts"),
          expect.stringContaining("src/nested/file3.ts"),
        ].sort(),
      );
    });

    it("should respect .gitignore", async () => {
      addToTestDir([
        ["src/file1.ts", "content1"],
        ["src/file2.ts", "content2"],
        "node_modules/",
        ["node_modules/pkg/file.js", "ignored"],
        [".gitignore", "node_modules/"],
      ]);

      const files = await walkDir(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
      );

      expect(files).toEqual(
        expect.not.arrayContaining([
          expect.stringContaining("node_modules/pkg/file.js"),
        ]),
      );
      expect(files.sort()).toEqual(
        [
          expect.stringContaining("src/file1.ts"),
          expect.stringContaining("src/file2.ts"),
        ].sort(),
      );
    });

    it("should handle onlyDirs option", async () => {
      addToTestDir([
        "src/",
        ["src/file1.ts", "content1"],
        "src/nested/",
        ["src/nested/file2.ts", "content2"],
      ]);

      const dirs = await walkDir(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
        {
          onlyDirs: true,
        },
      );

      expect(dirs.sort()).toEqual(
        [
          expect.stringContaining("src"),
          expect.stringContaining("src/nested"),
        ].sort(),
      );
    });
  });

  describe("walkDirAsync", () => {
    it("should yield files asynchronously", async () => {
      addToTestDir([
        "src/",
        ["src/file1.ts", "content1"],
        ["src/file2.ts", "content2"],
      ]);

      const files: string[] = [];
      for await (const file of walkDirAsync(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
      )) {
        files.push(file);
      }

      expect(files.sort()).toEqual(
        [
          expect.stringContaining("src/file1.ts"),
          expect.stringContaining("src/file2.ts"),
        ].sort(),
      );
    });

    it("should handle relative paths option", async () => {
      addToTestDir([
        "src/",
        ["src/file1.ts", "content1"],
        ["src/file2.ts", "content2"],
      ]);

      const files: string[] = [];
      for await (const file of walkDirAsync(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
        {
          returnRelativeUrisPaths: true,
        },
      )) {
        files.push(file);
      }

      expect(files.sort()).toEqual(["src/file1.ts", "src/file2.ts"].sort());
    });
  });

  describe("walkDirs", () => {
    it("should walk multiple workspace directories", async () => {
      addToTestDir([
        "workspace1/src/",
        ["workspace1/src/file1.ts", "content1"],
        "workspace2/src/",
        ["workspace2/src/file2.ts", "content2"],
      ]);

      const files = await walkDirs(testIde, undefined, [
        (await testIde.getWorkspaceDirs())[0] + "/workspace1",
        (await testIde.getWorkspaceDirs())[0] + "/workspace2", // Second workspace dir
      ]);

      expect(files).toContainEqual(expect.stringContaining("file1.ts"));
      expect(files).toContainEqual(expect.stringContaining("file2.ts"));
    });

    it("should handle empty directories", async () => {
      addToTestDir(["empty/"]);

      const files = await walkDirs(testIde);
      console.log("EMPTY DIR", files);

      expect(files).toEqual([]);
    });

    it("should skip symlinks", async () => {
      const filePath = path.join(TEST_DIR_PATH, "real.ts");
      addToTestDir([["real.ts", "content"]]);
      fs.symlinkSync(filePath, path.join(TEST_DIR_PATH, "symlink.ts"), "file");

      const files = await walkDirs(testIde);

      expect(files).not.toContainEqual(expect.stringContaining("symlink.ts"));
    });
  });

  describe("walkDir ignore patterns", () => {
    it("should handle negation patterns in gitignore", async () => {
      addToTestDir([
        [".gitignore", "**/*\n!*.py"],
        ["a.txt", "content"],
        ["b.py", "content"],
        ["c.ts", "content"],
      ]);

      const files = await walkDir(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
        {
          returnRelativeUrisPaths: true,
        },
      );

      expect(files).toContain("b.py");
      expect(files).not.toContain("a.txt");
      expect(files).not.toContain("c.ts");
    });

    it("should handle leading slash patterns", async () => {
      addToTestDir([
        [".gitignore", "/no.txt"],
        ["no.txt", "content"],
        "sub/",
        ["sub/no.txt", "content"],
        ["a.txt", "content"],
      ]);

      const files = await walkDir(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
        {
          returnRelativeUrisPaths: true,
        },
      );

      expect(files).not.toContain("no.txt");
      expect(files).toContain("sub/no.txt");
      expect(files).toContain("a.txt");
    });

    it("should handle multiple gitignore files in nested structure", async () => {
      addToTestDir([
        [".gitignore", "*.txt"],
        ["a.py", "content"],
        ["b.txt", "content"],
        "c/",
        ["c/.gitignore", "*.py"],
        ["c/d.txt", "content"],
        ["c/e.py", "content"],
      ]);

      const files = await walkDir(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
        {
          returnRelativeUrisPaths: true,
        },
      );

      expect(files).toContain("a.py");
      expect(files).not.toContain("b.txt");
      expect(files).not.toContain("c/d.txt");
      expect(files).not.toContain("c/e.py");
    });

    it("should handle both gitignore and continueignore", async () => {
      addToTestDir([
        [".gitignore", "*.py"],
        [".continueignore", "*.ts"],
        ["a.txt", "content"],
        ["b.py", "content"],
        ["c.ts", "content"],
        ["d.js", "content"],
      ]);

      const files = await walkDir(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
        {
          returnRelativeUrisPaths: true,
        },
      );

      expect(files).toContain("a.txt");
      expect(files).toContain("d.js");
      expect(files).not.toContain("b.py");
      expect(files).not.toContain("c.ts");
    });

    it("should handle complex wildcard patterns", async () => {
      addToTestDir([
        [".gitignore", "*.what\n!important.what\ntemp/\n/root_only.txt"],
        ["a.what", "content"],
        ["important.what", "content"],
        ["root_only.txt", "content"],
        "subdir/",
        ["subdir/root_only.txt", "content"],
        ["subdir/b.what", "content"],
        "temp/",
        ["temp/c.txt", "content"],
      ]);

      const files = await walkDir(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
        {
          returnRelativeUrisPaths: true,
        },
      );

      expect(files).toContain("important.what");
      expect(files).toContain("subdir/root_only.txt");
      expect(files).not.toContain("a.what");
      expect(files).not.toContain("root_only.txt");
      expect(files).not.toContain("subdir/b.what");
      expect(files).not.toContain("temp/c.txt");
    });

    it("should skip common system directories by default", async () => {
      addToTestDir([
        ["normal/file.txt", "content"],
        [".git/config", "content"],
        ["node_modules/package/index.js", "content"],
        ["dist/bundle.js", "content"],
        ["coverage/lcov.env", "content"],
        ["nested/node_modules/package/index.js", "content"],
        ["nested/dist/bundle.js", "content"],
        ["nested/coverage/lcov.env", "content"],
      ]);

      const files = await walkDir(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
        {
          returnRelativeUrisPaths: true,
        },
      );

      expect(files).toContain("normal/file.txt");
      expect(files).not.toContain(".git/config");
      expect(files).not.toContain("node_modules/package/index.js");
      expect(files).not.toContain("coverage/lcov.info");
      expect(files).not.toContain("nested/node_modules/package/index.js");
      expect(files).not.toContain("nested/dist/bundle.js");
      expect(files).not.toContain("nested/coverage/lcov.env");
    });

    it("should handle directory-specific ignore patterns correctly", async () => {
      addToTestDir([
        [".gitignore", "/abc"],
        ["abc", "content"],
        "xyz/",
        ["xyz/.gitignore", "xyz"],
        ["xyz/abc", "content"],
        ["xyz/xyz", "content"],
        ["xyz/normal.txt", "content"],
      ]);

      const files = await walkDir(
        (await testIde.getWorkspaceDirs())[0],
        testIde,
        {
          returnRelativeUrisPaths: true,
        },
      );

      expect(files).not.toContain("abc");
      expect(files).toContain("xyz/abc");
      expect(files).not.toContain("xyz/xyz");
      expect(files).toContain("xyz/normal.txt");
    });
  });
});
