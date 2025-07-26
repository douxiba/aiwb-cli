import { generateQQGroupBadge } from "../modules/badge.module.js";

export default async function () {
  const testData = [
    {
      number: "1004548404",
      link: "https://qm.qq.com/q/im8ZtJpkZy",
      alt: "加入交流群", // 含有空格，测试处理
    },
    {
      number: "12345678",
      link: "https://qm.qq.com/q/test123",
      alt: "开发 组",
    },
    {
      number: "987654321",
      link: "https://qm.qq.com/q/helloqq",
      // 不传 alt，使用默认值“交流群”
    },
    {
      number: "1004548404",
      link: "https://qm.qq.com/q/im8ZtJpkZy",
      alt: "加入交流群", // 含有空格，测试处理
      isDark: true,
    },
    {
      number: "12345678",
      link: "https://qm.qq.com/q/test123",
      alt: "开发 组",
      isDark: true,
    },
    {
      number: "987654321",
      link: "https://qm.qq.com/q/helloqq",
      isDark: true,
      // 不传 alt，使用默认值“交流群”
    },
  ];

  console.log("📦 测试 generateQQGroupBadge 输出：\n");

  for (const data of testData) {
    const badge = generateQQGroupBadge(data);
    console.log(badge);
    console.log();
  }
}
