// modules/base.module.js
import { readFile } from "fs/promises";
import path from "path";
import { Eta } from "eta";
import chalk from "chalk";
import fs from "node:fs/promises";
const { createHash } = await import("node:crypto");
import sharp from "sharp";
import { fileURLToPath } from "url";
import { glob } from "glob";

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

// 工具函数：SHA256 哈希
async function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// 工具函数：递归查找 assetsPath 下是否有文件名匹配
async function findLocalFile(filename, assetsPaths) {
  for (const base of assetsPaths) {
    const matches = await glob(`**/${filename}`, {
      cwd: base,
      absolute: true,
    });
    if (matches.length > 0) return matches[0];
  }
  return null;
}

// 工具函数：生成处理后图片名
function generatePreprocessFilename(originalName, preprocess) {
  const sorted = JSON.stringify(preprocess, Object.keys(preprocess).sort());
  const base = `${originalName}@@${sorted}`;
  return createHash("md5").update(base).digest("hex");
}

export async function renderImage(context, options) {
  const {
    type = "md",
    size,
    isResponsive = false,
    href,
    hrefDark,
    alt = "",
    preprocess,
  } = options;

  const { cli, config } = context;
  const outputDir = cli.outputDir;
  const cacheDir = path.join(
    outputDir,
    config?.config?.cacheOptions?.dir ?? "assets",
  );
  const assetPaths = Array.isArray(config?.config?.refs?.assetsPath)
    ? config.config.refs.assetsPath
    : [config?.config?.refs?.assetsPath].filter(Boolean);

  let src = href;
  let darkSrc = hrefDark;

  const isRemoteUrl = (p) => /^https?:\/\//.test(p);

  if (isResponsive && !hrefDark) {
    const ext = path.extname(href);
    const base = href.slice(0, -ext.length);
    src = `${base}@light${ext}`;
    darkSrc = `${base}@dark${ext}`;
  }

  async function handleResource(url) {
    const isRemote = isRemoteUrl(url);
    const name = path.basename(url);
    const cachedPath = path.join(cacheDir, name);

    if (isRemote) {
      try {
        await fs.access(cachedPath);
      } catch {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        await fs.mkdir(path.dirname(cachedPath), { recursive: true });
        await fs.writeFile(cachedPath, Buffer.from(buf));
      }
      return cachedPath;
    } else {
      const matchedPath = await findLocalFile(name, assetPaths);
      if (!matchedPath)
        throw new Error(
          `[renderImage] 找不到本地资源：${name} in ${assetPaths.join(", ")}`,
        );
      const origBuf = await fs.readFile(matchedPath);
      try {
        const cachedBuf = await fs.readFile(cachedPath);
        const [h1, h2] = await Promise.all([
          sha256(origBuf),
          sha256(cachedBuf),
        ]);
        if (h1 !== h2) await fs.writeFile(cachedPath, origBuf);
      } catch {
        await fs.mkdir(path.dirname(cachedPath), { recursive: true });
        await fs.writeFile(cachedPath, origBuf);
      }
      return cachedPath;
    }
  }

  async function applyPreprocess(imgPath, preprocess, suffix = "") {
    if (!preprocess) return imgPath;

    const hashName =
      generatePreprocessFilename(path.basename(imgPath), preprocess) + suffix;
    const ext = path.extname(imgPath);
    const finalPath = path.join(cacheDir, `${hashName}${ext}`);
    try {
      await fs.access(finalPath);
      return finalPath;
    } catch {}

    const {
      width,
      height,
      devicePixelRatio = 1,
      fitMode = "cover",
      alignment = "center",
      mask,
      maskBackground,
      isSizeStretch = false,
      size,
      flip,
      flop,
    } = preprocess;

    const clampSize = (val) => Math.max(1, Math.min(Math.round(val), 30000)); // 限制最大尺寸，避免极端图像

    let pipeline = sharp(imgPath);
    if (flip) pipeline = pipeline.flip();
    if (flop) pipeline = pipeline.flop();

    const meta = await pipeline.metadata();
    let resizeWidth = width ?? null;
    let resizeHeight = height ?? null;

    if (!isSizeStretch) {
      if (width && !height && meta.width)
        resizeHeight = Math.round((width / meta.width) * meta.height);
      if (height && !width && meta.height)
        resizeWidth = Math.round((height / meta.height) * meta.width);
    }

    if (resizeWidth || resizeHeight) {
      pipeline = pipeline.resize({
        width: resizeWidth
          ? clampSize(resizeWidth * devicePixelRatio)
          : undefined,
        height: resizeHeight
          ? clampSize(resizeHeight * devicePixelRatio)
          : undefined,
        fit: isSizeStretch ? fitMode : "inside",
        position: alignment,
      });
    }

    // 缩放整体尺寸
    if (typeof size === "number" && !isNaN(size)) {
      const scale = Math.max(0.01, Math.min(size, 100));
      const resizedMeta = await pipeline.metadata();
      const scaledWidth = resizedMeta.width
        ? clampSize(resizedMeta.width * scale)
        : undefined;
      const scaledHeight = resizedMeta.height
        ? clampSize(resizedMeta.height * scale)
        : undefined;
      pipeline = pipeline.resize({
        width: scaledWidth,
        height: scaledHeight,
      });
    }

    const shapeSVG = (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2;
      const points = {
        circle: `<circle cx="${cx}" cy="${cy}" r="${r}" />`,
        ellipse: `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" />`,
        triangle: `<polygon points="${cx},0 ${w},${h} 0,${h}" />`,
        "triangle-180": `<polygon points="0,0 ${w},0 ${cx},${h}" />`,
        pentagon: `<polygon points="${cx},0 ${w},${h * 0.38} ${w * 0.81},${h} ${w * 0.19},${h} 0,${h * 0.38}" />`,
        "pentagon-180": `<polygon points="0,${h * 0.62} ${w * 0.19},0 ${w * 0.81},0 ${w},${h * 0.62} ${cx},${h}" />`,
        hexagon: `<polygon points="${w * 0.25},0 ${w * 0.75},0 ${w},${h / 2} ${w * 0.75},${h} ${w * 0.25},${h} 0,${h / 2}" />`,
        square: `<polygon points="${cx},0 ${w},${cy} ${cx},${h} 0,${cy}" />`,
        star: `<polygon points="${cx},0 ${cx + r * 0.2245},${cy - r * 0.309} ${cx + r},${cy - r * 0.309} ${cx + r * 0.3633},${cy + r * 0.118} ${cx + r * 0.5878},${cy + r * 0.809} ${cx},${cy + r * 0.382} ${cx - r * 0.5878},${cy + r * 0.809} ${cx - r * 0.3633},${cy + r * 0.118} ${cx - r},${cy - r * 0.309} ${cx - r * 0.2245},${cy - r * 0.309}" />`,
        heart: `<path d="M${cx},${cy + r / 2} C${cx - r},${cy - r / 2} ${cx - r},${cy + r} ${cx},${cy + r} C${cx + r},${cy + r} ${cx + r},${cy - r / 2} ${cx},${cy + r / 2} Z" />`,
      };
      const shape = points[mask] || points.circle;
      return `<svg width="${w}" height="${h}">${shape}</svg>`;
    };

    if (mask) {
      const finalMeta = await pipeline.metadata();
      const w = finalMeta.width ?? resizeWidth ?? 512;
      const h = finalMeta.height ?? resizeHeight ?? 512;
      const svg = shapeSVG(w, h);
      pipeline = pipeline
        .composite([{ input: Buffer.from(svg), blend: "dest-in" }])
        .flatten({ background: maskBackground || "#fff" });
    }

    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await pipeline.toFile(finalPath);
    return finalPath;
  }

  async function preparePath(url, mode) {
    const path = await handleResource(url);
    return await applyPreprocess(path, preprocess, mode);
  }

  // ✅ 强制缓存处理，只要有 preprocess 一定要 prepare
  if (preprocess || cli.useCache || isResponsive || size) {
    src = await preparePath(src, "light");
    if (isResponsive && darkSrc) {
      darkSrc = await preparePath(darkSrc, "dark");
    }
  }

  // ✅ 确保 src 一定是本地路径（remote url 会被转换掉）
  const relSrc = isRemoteUrl(src)
    ? src
    : path.relative(outputDir, src).replace(/\\/g, "/");

  const relDark =
    darkSrc && !isRemoteUrl(darkSrc)
      ? path.relative(outputDir, darkSrc).replace(/\\/g, "/")
      : darkSrc;

  // ✅ 计算 size 属性（如果是 "1.25x"）
  let widthAttr = "",
    heightAttr = "";
  if (Array.isArray(size) && size.length === 2) {
    widthAttr = ` width="${size[0]}" height="${size[1]}"`;
  } else if (typeof size === "number") {
    widthAttr = ` width="${size}"`;
  } else if (typeof size === "string" && size.endsWith("x")) {
    const factor = parseFloat(size);
    if (!isNaN(factor)) {
      if (isRemoteUrl(src)) {
        src = await preparePath(src, "light");
      }
      const buf = await fs.readFile(src);
      const { default: imageSizeOf } = await import("image-size");
      const { width: origW } = imageSizeOf(Buffer.from(buf));
      widthAttr = ` width="${Math.round(origW * factor)}"`;
    }
  }

  const forceHtml = type === "html" || isResponsive || size || preprocess;
  if (forceHtml) {
    if (isResponsive && relDark) {
      return `<picture>
  <source srcset="${relDark}" media="(prefers-color-scheme: dark)" />
  <img src="${relSrc}" alt="${alt}"${widthAttr}${heightAttr} />
</picture>`;
    } else {
      return `<img src="${relSrc}" alt="${alt}"${widthAttr}${heightAttr} />`;
    }
  } else {
    return `![${alt}](${relSrc})${
      widthAttr ? `<!-- width:${widthAttr.slice(8, -1)} -->` : ""
    }`;
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
    tags: ["<%", "%>"],
    useWith: true,
    autoEscape: false,
    autoTrim: false,
    rmWhitespace: false,
  });

  const rendered = await eta.renderStringAsync(template, etaData);

  if (!rendered) {
    throw new Error(`❌ 渲染失败：Eta 渲染结果为空`);
  }

  return rendered;
}
