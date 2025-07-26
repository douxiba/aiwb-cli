export const moduleInfo = {
  name: "badge",
  description: "生成 shields.io 的徽章",
};

function escapeShieldsText(text) {
  return encodeURIComponent(text).replace(/-/g, "--").replace(/_/g, "__");
}

export function generateBadge({
  type = "md",
  left = "",
  content = "",
  color,
  logo,
  logoColor,
  logoSize,
  label,
  labelColor,
  url,
  alt,
}) {
  const baseUrl = "https://img.shields.io/badge";

  const badgeLeft = escapeShieldsText(label || left || "");
  const badgeRight = escapeShieldsText(content || "");
  const badgeColor = isHexColor(color) ? "lightgrey" : color || "lightgrey";

  const query = [];

  if (logo) query.push(`logo=${encodeURIComponent(logo)}`);
  if (logoColor) query.push(`logoColor=${encodeURIComponent(logoColor)}`);
  if (logoSize) query.push(`logoWidth=${encodeURIComponent(logoSize)}`);
  if (labelColor) query.push(`labelColor=${encodeURIComponent(labelColor)}`);
  if (isHexColor(color)) query.push(`color=${encodeURIComponent(color)}`);

  const queryString = query.length > 0 ? `?${query.join("&")}` : "";
  const imgUrl = `${baseUrl}/${badgeLeft}-${badgeRight}-${badgeColor}${queryString}`;

  const imgAlt = (alt || `${left || label}: ${content || ""}`).replace(
    /\s+/g,
    "",
  );

  if (type === "html") {
    const imgTag = `<img src="${imgUrl}" alt="${imgAlt}">`;
    return url ? `<a href="${url}">${imgTag}</a>` : imgTag;
  }

  const mdTag = `![${imgAlt}](${imgUrl})`;
  return url ? `[${mdTag}](${url})` : mdTag;
}

function isHexColor(str) {
  return (
    typeof str === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(str)
  );
}

/**
 * 生成 QQ 群交流 Badge（Markdown 格式）
 * @param {Object} opts
 * @param {string} opts.number - QQ 群号
 * @param {string} opts.link - 点击后的跳转链接
 * @param {string} [opts.logo] - logo（默认为 qq）
 * @param {string} [opts.alt] - 图片 alt 文本（默认为 交流群）
 * @returns {string}
 */
export function generateQQGroupBadge({
  number,
  link,
  logo = "qq",
  alt = "交流群",
  isDark = false,
}) {
  const safeAlt = alt.replace(/\s+/g, ""); // 去除空格防止语法错误

  return generateBadge({
    type: "md",
    left: "交流群",
    content: number,
    color: isDark ? "#3f3f46" : "white",
    logo,
    labelColor: isDark ? "#3f3f46" : "white",
    url: link,
    alt: safeAlt,
  });
}
