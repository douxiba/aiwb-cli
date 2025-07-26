import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";
import { generateCommand } from "./commands/generate/index.js";
// import { makeCommand } from "./commands/make.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const program = new Command();

program
  .name("aiwb-cli")
  .description("生成 Awesome Iwb 仓库的 README 的工具")
  .version("0.1.0");

program
  .command("generate")
  .description("生成 README 文件")
  .requiredOption("-d, --dir <directory>", "输出文件夹")
  .requiredOption("--config <path>", "配置文件的路径")
  .option(
    "-s, --silent",
    "静默模式：默认同意所有 prompt。不推荐，建议在部署到 GitHub Actions 上时使用",
  )
  .option("-c, --cache", "下载所有网络资源（图片等）到本地")
  .option("-v, --verbose", "调试输出")
  .action(generateCommand);

// test 命令：运行 tests/xxx.js 测试文件
program
  .command("test <file>")
  .description("运行指定测试文件（位于 tests/ 目录）")
  .action(async (file) => {
    try {
      // 自动补全 .js 后缀（如果没有）
      const targetFile = file.endsWith(".js") ? file : `${file}.js`;
      const absPath = path.resolve(__dirname, "tests", targetFile);

      console.log(chalk.blue(`🧪 运行测试文件：${chalk.bold(targetFile)}\n`));

      const testModule = await import(absPath);
      if (typeof testModule.default === "function") {
        await testModule.default();
      } else {
        console.log(chalk.yellow("⚠️  该模块未导出默认函数（default）"));
      }
    } catch (err) {
      console.error(chalk.red(`❌  无法加载测试文件：${file}`));
      console.error(err);
    }
  });

// future:
// program.command("make")...
// program.command("check")...

program.parse();
