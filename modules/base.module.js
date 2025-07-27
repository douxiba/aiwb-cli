// modules/base.module.js
import { readFile } from "fs/promises";
import path from "path";
import { Eta } from "eta";
import chalk from "chalk";

export const moduleInfo = {
  name: "base",
  description: "基础模块，提供通用工具函数",
  capabilities: [],
  contextRegisteredFunctions: [
    "renderTemplate",
    "renderTemplateByString",
    "~renderImage",
  ],
};

export async function renderImage(context, options) {
  const {
    type = "md",
    size,
    isResponsive = false,
    href,
    hrefDark,
    alt = "",
  } = options;

  const { cli, config } = context;
  const shouldCache = !!cli.cache;
  const outputDir = cli.outputDir;
  const cacheDir =
    path.join(outputDir, config?.config?.cacheOptions?.dir.toString()) ||
    path.join(outputDir, "assets");

  let src = href;
  let darkSrc = hrefDark;

  // 响应式图片处理（自动推导）
  if (isResponsive && !hrefDark) {
    const ext = path.extname(href);
    const base = href.slice(0, -ext.length);
    src = `${base}@light${ext}`;
    darkSrc = `${base}@dark${ext}`;
  }

  // 判断是否需要缓存
  async function maybeCache(url) {
    if (!url.startsWith("http")) return url;
    const name = path.basename(url);
    const localPath = path.join(cacheDir, name);
    const relPath = path.relative(outputDir, localPath);

    try {
      await fs.access(localPath); // exists
      if (cli.verbose) {
        console.log(`[renderImage] 使用缓存文件: ${chalk.gray(localPath)}`);
      }
    } catch {
      // 下载
      if (cli.verbose) console.log(`[renderImage] 下载 ${url} 到 ${localPath}`);
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, Buffer.from(buf));
    }

    return relPath.replace(/\\/g, "/");
  }

  if (shouldCache) {
    src = await maybeCache(src);
    if (isResponsive) {
      darkSrc = await maybeCache(darkSrc);
    }
  }

  // 处理尺寸
  let width, height;
  if (Array.isArray(size) && size.length === 2) {
    [width, height] = size;
  } else if (typeof size === "number") {
    width = size;
  } else if (typeof size === "string" && size.endsWith("x")) {
    const factor = parseFloat(size);
    if (!isNaN(factor)) {
      const probe = await fetch(href).then((r) => r.arrayBuffer());
      const imageSizeOf = (await import("image-size")).default;
      const { width: origW } = imageSizeOf(Buffer.from(probe));
      width = Math.round(origW * factor);
    }
  }

  const sizeAttr =
    width && height
      ? ` width="${width}" height="${height}"`
      : width
        ? ` width="${width}"`
        : "";

  const forceHtml = isResponsive || size !== undefined;
  if (type === "html" || forceHtml) {
    if (isResponsive) {
      return `<picture>
  <source srcset="${darkSrc}" media="(prefers-color-scheme: dark)" />
  <img src="${src}" alt="${alt}"${sizeAttr} />
</picture>`;
    } else {
      return `<img src="${src}" alt="${alt}"${sizeAttr} />`;
    }
  } else {
    // markdown 模式只支持宽度拉伸
    return `![${alt}](${src})${width ? `<!-- width:${width} -->` : ""}`;
  }
}

// 从路径读取模板并渲染（支持 await）
export async function renderTemplate(context, templatePath, extraData = {}) {
  const { cli } = context;

  console.log(context);

  const template = await readFile(templatePath, "utf-8");

  if (cli.verbose) {
    console.log(`[renderTemplate] 加载模板: ${chalk.gray(templatePath)}`);
  }

  return await renderTemplateByString(context, template, extraData);
}

// 从字符串内容渲染模板（支持 await）
export async function renderTemplateByString(
  context,
  template,
  extraData = {},
) {
  const { cli, config } = context;

  const etaData = {
    config: config.config,
    ...extraData,
  };

  for (const [key, value] of Object.entries(context)) {
    if (key.startsWith("module$") || key.startsWith("renderModule$")) {
      etaData[key] = value;
      if (cli.verbose) {
        const type = typeof value === "function" ? "函数" : "属性";
        console.log(
          `[renderTemplateByString] 注入${type}: ${chalk.green(key)}`,
        );
      }
    }
  }

  const eta = new Eta({
    tags: ["{{", "}}"],
    useWith: true,
    async: true,
  });

  const rendered = await eta.renderStringAsync(template, etaData);

  if (!rendered) {
    throw new Error(`❌ 渲染失败：Eta 渲染结果为空`);
  }

  return rendered;
}
