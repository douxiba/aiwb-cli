import { generateBadge } from "../modules/badge.module.js";

const sampleTexts = [
  "状态",
  "通过",
  "失败",
  "进行中",
  "加载中",
  "可用",
  "Beta",
  "Alpha",
  "Done",
  "Running",
];
const colors = ["green", "red", "blue", "orange", "purple", "gray"];
const logos = ["github", "vscode", "npm", "windows", "ubuntu"];
const urls = ["https://github.com", "https://example.com", "https://npmjs.com"];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomCases(count = 5) {
  const cases = [];
  for (let i = 0; i < count; i++) {
    const left = getRandom(sampleTexts);
    const content = getRandom(sampleTexts);
    const color = getRandom(colors);
    const logo = getRandom(logos);
    const logoColor = getRandom(colors);
    const logoSize = Math.floor(Math.random() * 20 + 10) + ""; // "10" ~ "30"
    const url = getRandom(urls);
    const alt = `${left}-${content}`;
    const label = getRandom(sampleTexts);
    const labelColor = getRandom(colors);

    cases.push({
      left,
      content,
      color,
      logo,
      logoColor,
      logoSize,
      url,
      alt,
      label,
      labelColor,
    });
  }
  return cases;
}

export default async function () {
  const badgeCases = generateRandomCases(6);

  console.log("🎯 Markdown 格式 Badge 测试：\n");
  badgeCases.forEach((config, i) => {
    const md = generateBadge({ ...config, type: "md" });
    console.log(`--- [Case ${i + 1}] ---`);
    console.log(md);
    console.log();
  });

  console.log("\n🎯 HTML 格式 Badge 测试：\n");
  badgeCases.forEach((config, i) => {
    const html = generateBadge({ ...config, type: "html" });
    console.log(`--- [Case ${i + 1}] ---`);
    console.log(html);
    console.log();
  });
}
