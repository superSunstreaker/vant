/**
 * Vant 组件元数据提取脚本
 *
 * 参考 ls-components-plus/extract-components.js 模式，适配 vant 的 TSX 组件结构：
 * 1. 从 README.zh-CN.md 的 Markdown 表格提取完整的 Props / Events / Slots / Methods
 * 2. 从组件 TSX 源码的 JSDoc 注释（@summary / @attr / @slot / @event）提取补充信息
 * 3. 清理 Markdown 标记，输出纯净的 component-meta.json
 * 4. 生成 mcp-server.json（MCP Server 工具定义）
 *
 * 用法：node scripts/extract-meta.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const OUTPUT_DIR = path.join(__dirname, '..');

// ---------- 工具函数 ----------

/** 去除 Markdown 格式标记，返回纯文本 */
function cleanMarkdown(text = '') {
  return text
    .replace(/`([^`]+)`/g, '$1') // `code` -> code
    .replace(/_([^_]+)_/g, '$1') // _italic_ -> italic
    .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** -> bold
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .replace(/\\\|/g, '|') // escaped pipe -> pipe
    .trim();
}

/** 合并空白 */
function normalizeText(text = '') {
  return text.replace(/\s+/g, ' ').trim();
}

/** 按 | 分割表格行，正确处理被 _ 或 ` 包裹的管道符 */
function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const rawCells = trimmed.split('|');
  const cells = [];
  let temp = '';
  let inCode = false;
  let codeChar = '';

  for (const raw of rawCells) {
    if (!inCode) {
      const backtickCount = (raw.match(/`/g) || []).length;
      const underscoreCount = (raw.match(/_/g) || []).length;
      if (backtickCount % 2 === 1) {
        inCode = true;
        codeChar = '`';
        temp = raw;
      } else if (underscoreCount % 2 === 1) {
        inCode = true;
        codeChar = '_';
        temp = raw;
      } else {
        cells.push(raw.trim());
      }
    } else {
      temp += '|' + raw;
      const matches = (raw.match(new RegExp(codeChar, 'g')) || []).length;
      if (matches % 2 === 1) {
        cells.push(temp.trim());
        temp = '';
        inCode = false;
        codeChar = '';
      }
    }
  }
  if (temp) cells.push(temp.trim());
  return cells;
}

/**
 * 从 Markdown 内容中提取指定标题下的表格数据
 * 支持三种场景：
 *   1. ### Props          （标准格式）
 *   2. ### ActionBar Props （带组件名前缀）
 *   3. 标题和表格之间有说明文字（如 Dialog 组件的 "通过组件调用时，支持以下 Props："）
 * 同时支持将 "Options" 作为 "Props" 的别名（如 Lazyload 组件）
 * @param {string} mdContent - Markdown 全文
 * @param {string} sectionTitle - 节标题关键词（如 Props / Events / Slots / 方法）
 * @param {string} [prefix] - 组件 PascalCase 名（如 ActionBar），用于匹配带前缀标题
 */
function parseMarkdownTable(mdContent, sectionTitle, prefix) {
  // 别名映射：Lazyload 等组件用 Options 而非 Props
  const titleAliases =
    sectionTitle === 'Props' ? ['Props', 'Options'] : [sectionTitle];

  for (const title of titleAliases) {
    // 尝试标准格式 ### Props 和带前缀格式 ### ActionBar Props
    const patterns = [
      new RegExp(`###\\s+${title}\\s*\\n`, 'i'),
    ];
    if (prefix) {
      patterns.unshift(
        new RegExp(`###\\s+${prefix}\\s+${title}\\s*\\n`, 'i'),
      );
    }

    for (const pattern of patterns) {
      const headerMatch = mdContent.match(pattern);
      if (!headerMatch) continue;

      // 从标题位置之后开始，在下一个 ### 标题之前寻找表格
      const startPos = headerMatch.index + headerMatch[0].length;
      const nextSection = mdContent.indexOf('\n### ', startPos);
      const sectionContent =
        nextSection >= 0
          ? mdContent.substring(startPos, nextSection)
          : mdContent.substring(startPos);

      // 提取所有连续的表格行（以 | 开头）
      const lines = sectionContent
        .split('\n')
        .filter((line) => line.trim().startsWith('|'));

      if (lines.length < 2) continue;

      // 跳过表头行和分隔行
      const dataLines = lines.slice(2);
      const rows = dataLines
        .map((line) => splitTableRow(line))
        .filter((cells) => cells.length >= 2);

      if (rows.length > 0) return rows;
    }
  }

  return [];
}

function extractPropsFromMd(mdContent, prefix) {
  return parseMarkdownTable(mdContent, 'Props', prefix).map((cells) => ({
    name: cleanMarkdown(cells[0] || ''),
    description: normalizeText(cleanMarkdown(cells[1] || '')),
    type: normalizeText(cleanMarkdown(cells[2] || '')),
    default: cleanMarkdown(cells[3] || ''),
    required: false,
  }));
}

function extractEventsFromMd(mdContent, prefix) {
  return parseMarkdownTable(mdContent, 'Events', prefix).map((cells) => ({
    name: cleanMarkdown(cells[0] || ''),
    description: normalizeText(cleanMarkdown(cells[1] || '')),
    parameters: normalizeText(cleanMarkdown(cells[2] || '')),
  }));
}

function extractSlotsFromMd(mdContent, prefix) {
  return parseMarkdownTable(mdContent, 'Slots', prefix).map((cells) => ({
    name: cleanMarkdown(cells[0] || ''),
    description: normalizeText(cleanMarkdown(cells[1] || '')),
    parameters: normalizeText(cleanMarkdown(cells[2] || '')),
  }));
}

function extractMethodsFromMd(mdContent, prefix) {
  return parseMarkdownTable(mdContent, '方法', prefix).map((cells) => ({
    name: cleanMarkdown(cells[0] || ''),
    description: normalizeText(cleanMarkdown(cells[1] || '')),
    parameters: cleanMarkdown(cells[2] || ''),
    returnType: cleanMarkdown(cells[3] || ''),
  }));
}

/** 从 README 提取组件介绍（### 介绍 段落第一行） */
function getDescriptionFromMd(mdContent) {
  const introMatch = mdContent.match(/###\s+介绍\s*\n\n([^\n]+)/);
  if (introMatch) return normalizeText(introMatch[1]);
  const titleMatch = mdContent.match(/^#\s+(.+)$/m);
  return titleMatch ? normalizeText(titleMatch[1]) : '';
}

// ---------- JSDoc 解析 ----------

const JSDOC_REGEX = /\/\*\*[\s\S]*?\*\//g;

function stripCommentDecorators(line) {
  return line
    .replace(/^\s*\/\*\*?/, '')
    .replace(/\*\/\s*$/, '')
    .replace(/^\s*\*\s?/, '')
    .trim();
}

function parseJSDocBlock(block) {
  const result = { summary: '', attrs: [], slots: [], events: [] };
  block.split('\n').forEach((rawLine) => {
    const line = stripCommentDecorators(rawLine);
    if (!line) return;

    if (line.startsWith('@summary')) {
      result.summary = normalizeText(line.replace('@summary', ''));
    } else if (/^@attr\b/.test(line)) {
      // @attr {type} name - description
      const m = line.match(/^@attr\s*\{([^}]+)\}\s*([^\s]+)\s*(?:-\s*)?(.*)$/);
      if (m) {
        result.attrs.push({
          name: m[2].trim().replace(/[?:]$/, ''),
          type: normalizeText(m[1]),
          description: normalizeText(m[3] || ''),
        });
      }
    } else if (line.startsWith('@slot')) {
      result.slots.push(normalizeText(line.replace('@slot', '')));
    } else if (line.startsWith('@event')) {
      result.events.push(normalizeText(line.replace('@event', '')));
    }
  });
  return result;
}

function extractJSDocBlocks(content) {
  return (content.match(JSDOC_REGEX) || []).map(parseJSDocBlock);
}

/** 从组件 TSX 源码中提取 JSDoc 元数据 */
function extractJSDocFromComponent(dir) {
  const tsxFiles = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.vue'));

  for (const file of tsxFiles) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const blocks = extractJSDocBlocks(content);
    const withSummary = blocks.find((b) => b.summary);
    if (withSummary) {
      return withSummary;
    }
  }
  return null;
}

// ---------- 组件名提取 ----------

function getComponentNameFromIndex(indexPath) {
  if (!fs.existsSync(indexPath)) return null;
  const content = fs.readFileSync(indexPath, 'utf-8');
  const match = content.match(/Van(\w+)\s*:\s*typeof\s+\w+/);
  if (match) return `Van${match[1]}`;
  return null;
}

function toPascalCase(kebab) {
  return kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

// ---------- 子组件处理 ----------

/** 部分子组件（如 cell-group）的文档在主组件 README 中，需从父 README 的带前缀表格提取 */
const SUB_COMPONENT_PATTERNS = [
  { dir: 'cell-group', parent: 'cell', name: 'VanCellGroup' },
  { dir: 'action-bar-button', parent: 'action-bar', name: 'VanActionBarButton' },
  { dir: 'action-bar-icon', parent: 'action-bar', name: 'VanActionBarIcon' },
  { dir: 'checkbox-group', parent: 'checkbox', name: 'VanCheckboxGroup' },
  { dir: 'collapse-item', parent: 'collapse', name: 'VanCollapseItem' },
  { dir: 'dropdown-item', parent: 'dropdown-menu', name: 'VanDropdownItem' },
  { dir: 'grid-item', parent: 'grid', name: 'VanGridItem' },
  { dir: 'index-anchor', parent: 'index-bar', name: 'VanIndexAnchor' },
  { dir: 'radio-group', parent: 'radio', name: 'VanRadioGroup' },
  { dir: 'sidebar-item', parent: 'sidebar', name: 'VanSidebarItem' },
  { dir: 'step', parent: 'steps', name: 'VanStep' },
  { dir: 'swipe-item', parent: 'swipe', name: 'VanSwipeItem' },
  { dir: 'tabbar-item', parent: 'tabbar', name: 'VanTabbarItem' },
  { dir: 'tabs', parent: 'tab', name: 'VanTabs' },
  { dir: 'row', parent: 'col', name: 'VanRow' },
  { dir: 'coupon', parent: 'coupon-list', name: 'VanCoupon' },
  { dir: 'coupon-cell', parent: 'coupon-list', name: 'VanCouponCell' },
];

/**
 * 处理子组件：从父组件 README 的带前缀表格（如 ### CellGroup Props）提取信息
 * @param {object} subConfig - SUB_COMPONENT_PATTERNS 中的配置项
 * @returns {object|null} 组件元数据
 */
function processSubComponent(subConfig) {
  const { dir, parent, name: componentName } = subConfig;
  const subDir = path.join(SRC_DIR, dir);
  const parentDir = path.join(SRC_DIR, parent);

  // 读父组件 README
  const parentReadmeZh = path.join(parentDir, 'README.zh-CN.md');
  const parentReadmeEn = path.join(parentDir, 'README.md');
  let mdContent = '';
  let mdFile = '';

  if (fs.existsSync(parentReadmeZh)) {
    mdContent = fs.readFileSync(parentReadmeZh, 'utf-8');
    mdFile = parentReadmeZh;
  } else if (fs.existsSync(parentReadmeEn)) {
    mdContent = fs.readFileSync(parentReadmeEn, 'utf-8');
    mdFile = parentReadmeEn;
  } else {
    return null;
  }

  // 子组件 PascalCase 名（去掉 Van 前缀），用于匹配 ### CellGroup Props
  const pascalName = componentName.replace(/^Van/, '');

  // 从父 README 用子组件名前缀提取表格
  let props = extractPropsFromMd(mdContent, pascalName);
  let events = extractEventsFromMd(mdContent, pascalName);
  let slots = extractSlotsFromMd(mdContent, pascalName);
  const methods = extractMethodsFromMd(mdContent, pascalName);

  // 从子组件 TSX JSDoc 补充
  const jsDoc = extractJSDocFromComponent(subDir);
  let description = '';
  if (jsDoc && jsDoc.summary) {
    description = jsDoc.summary;
  }

  // 如果 README 没有 props，用 JSDoc 的 attrs
  if (props.length === 0 && jsDoc && jsDoc.attrs.length > 0) {
    props = jsDoc.attrs.map((attr) => ({
      name: attr.name,
      type: attr.type,
      description: attr.description,
      default: '',
      required: false,
    }));
  }
  if (events.length === 0 && jsDoc && jsDoc.events.length > 0) {
    events = jsDoc.events.map((e) => {
      const parts = e.split(/\s*-\s*/);
      return {
        name: parts[0] || '',
        description: parts.slice(1).join(' - ') || '',
        parameters: '',
      };
    });
  }
  if (slots.length === 0 && jsDoc && jsDoc.slots.length > 0) {
    slots = jsDoc.slots.map((s) => {
      const parts = s.split(/\s*-\s*/);
      return {
        name: parts[0] || '',
        description: parts.slice(1).join(' - ') || '',
        parameters: '',
      };
    });
  }

  const relativePath = path
    .relative(OUTPUT_DIR, parentDir)
    .replace(/\\/g, '/');

  const meta = {
    name: componentName,
    file: `${relativePath}/README.zh-CN.md`,
    description,
    props,
    events,
    slots,
  };

  if (methods.length) {
    meta.methods = methods;
  }

  return meta;
}

// ---------- 主流程 ----------

function scanComponentDirs(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((item) => item.isDirectory() && !item.name.startsWith('.') && !item.name.startsWith('_'))
    .map((item) => ({
      name: item.name,
      fullPath: path.join(dir, item.name),
    }));
}

function processComponent({ name, fullPath }) {
  // 找 README
  const readmeZhPath = path.join(fullPath, 'README.zh-CN.md');
  const readmeEnPath = path.join(fullPath, 'README.md');
  let mdContent = '';
  let mdFile = '';

  if (fs.existsSync(readmeZhPath)) {
    mdContent = fs.readFileSync(readmeZhPath, 'utf-8');
    mdFile = readmeZhPath;
  } else if (fs.existsSync(readmeEnPath)) {
    mdContent = fs.readFileSync(readmeEnPath, 'utf-8');
    mdFile = readmeEnPath;
  } else {
    return null;
  }

  // 组件名
  const indexPath = path.join(fullPath, 'index.ts');
  const componentName =
    getComponentNameFromIndex(indexPath) || `Van${toPascalCase(name)}`;

  // PascalCase 名，用于匹配带前缀的 README 表格标题（如 ### ActionBar Props）
  const pascalName = toPascalCase(name);

  // 从 README 提取
  let description = getDescriptionFromMd(mdContent);
  let props = extractPropsFromMd(mdContent, pascalName);
  let events = extractEventsFromMd(mdContent, pascalName);
  let slots = extractSlotsFromMd(mdContent, pascalName);
  const methods = extractMethodsFromMd(mdContent, pascalName);

  // 从 TSX JSDoc 补充（如果 README 信息不完整）
  const jsDoc = extractJSDocFromComponent(fullPath);
  if (jsDoc) {
    if (!description && jsDoc.summary) {
      description = jsDoc.summary;
    }
    // 如果 README 没有 props，用 JSDoc 的 attrs
    if (props.length === 0 && jsDoc.attrs.length > 0) {
      props = jsDoc.attrs.map((attr) => ({
        name: attr.name,
        type: attr.type,
        description: attr.description,
        default: '',
        required: false,
      }));
    }
    // 如果 README 没有 events，用 JSDoc 的 events
    if (events.length === 0 && jsDoc.events.length > 0) {
      events = jsDoc.events.map((e) => {
        const parts = e.split(/\s*-\s*/);
        return {
          name: parts[0] || '',
          description: parts.slice(1).join(' - ') || '',
          parameters: '',
        };
      });
    }
    // 如果 README 没有 slots，用 JSDoc 的 slots
    if (slots.length === 0 && jsDoc.slots.length > 0) {
      slots = jsDoc.slots.map((s) => {
        const parts = s.split(/\s*-\s*/);
        return {
          name: parts[0] || '',
          description: parts.slice(1).join(' - ') || '',
          parameters: '',
        };
      });
    }
  }

  const relativePath = path
    .relative(OUTPUT_DIR, fullPath)
    .replace(/\\/g, '/');

  const meta = {
    name: componentName,
    file: `${relativePath}/README.zh-CN.md`,
    description,
    props,
    events,
    slots,
  };

  if (methods.length) {
    meta.methods = methods;
  }

  return meta;
}

function main() {
  console.log('🔍 扫描组件目录...');
  const dirs = scanComponentDirs(SRC_DIR);
  console.log(`✅ 找到 ${dirs.length} 个组件目录`);

  const components = [];

  for (const dir of dirs) {
    // 跳过非组件目录
    if (['composables', 'utils', 'locale', 'style'].includes(dir.name)) {
      continue;
    }

    const meta = processComponent(dir);
    if (meta) {
      components.push(meta);
      console.log(`✅ 解析: ${meta.name} (${dir.name})`);
    }
  }

  // 处理子组件（文档在父组件 README 中）
  console.log('\n🔍 处理子组件（文档在父组件 README 中）...');
  const processedDirs = new Set(dirs.map((d) => d.name));
  for (const subConfig of SUB_COMPONENT_PATTERNS) {
    // 如果子组件目录已被主流程处理（有自己的 README），则跳过
    if (processedDirs.has(subConfig.dir)) {
      const subDir = path.join(SRC_DIR, subConfig.dir);
      const hasReadme =
        fs.existsSync(path.join(subDir, 'README.zh-CN.md')) ||
        fs.existsSync(path.join(subDir, 'README.md'));
      if (hasReadme) continue;
    }

    const meta = processSubComponent(subConfig);
    if (meta && meta.props.length > 0) {
      components.push(meta);
      console.log(
        `✅ 解析子组件: ${meta.name} (${subConfig.dir} ← ${subConfig.parent})`,
      );
    } else if (meta) {
      // 即使没有 props 也加入（保留组件记录）
      components.push(meta);
      console.log(
        `⚠️ 子组件无表格数据: ${meta.name} (${subConfig.dir} ← ${subConfig.parent})`,
      );
    } else {
      console.log(`❌ 子组件解析失败: ${subConfig.name}`);
    }
  }

  // 生成 component-meta.json
  const componentMeta = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    library: 'vant',
    libraryVersion: '4.9.24',
    totalComponents: components.length,
    components,
  };

  // 生成 mcp-server.json
  const mcpServer = {
    name: 'vant',
    version: '4.9.24',
    description: 'Vant 移动端 Vue3 UI 组件库 - MCP Server 配置',
    components: {
      source: './component-meta.json',
      total: components.length,
      format: 'vue3',
    },
    tools: [
      {
        name: 'get_component_list',
        description: '获取所有可用 Vant 组件列表',
        input: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: '组件名称或描述关键词（可选，用于模糊搜索）',
            },
          },
        },
        output: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              file: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'get_component_detail',
        description: '获取指定 Vant 组件的详细属性、事件、插槽信息',
        input: {
          type: 'object',
          properties: {
            componentName: {
              type: 'string',
              description: '组件名称（如：VanButton、VanField）',
            },
          },
          required: ['componentName'],
        },
        output: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            props: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  description: { type: 'string' },
                  required: { type: 'boolean' },
                  default: { type: 'string' },
                },
              },
            },
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  parameters: { type: 'string' },
                },
              },
            },
            slots: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  parameters: { type: 'string' },
                },
              },
            },
            methods: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  parameters: { type: 'string' },
                  returnType: { type: 'string' },
                },
              },
            },
          },
        },
      },
      {
        name: 'generate_component_code',
        description: '根据组件名称和参数生成 Vant 组件使用代码示例',
        input: {
          type: 'object',
          properties: {
            componentName: {
              type: 'string',
              description: '组件名称（如：VanButton）',
            },
            props: {
              type: 'object',
              description: '组件属性键值对',
            },
            slots: {
              type: 'object',
              description: '插槽内容',
            },
          },
          required: ['componentName'],
        },
        output: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    ],
    examples: [
      {
        component: 'VanButton',
        template:
          '<van-button type="primary" @click="handleClick">点击我</van-button>',
        script: "const handleClick = () => { console.log('按钮被点击') }",
      },
      {
        component: 'VanField',
        template:
          '<van-field v-model="value" label="用户名" placeholder="请输入用户名" />',
        script: "import { ref } from 'vue'\nconst value = ref('')",
      },
      {
        component: 'VanPicker',
        template:
          '<van-picker v-model="selectedValues" :columns="columns" @confirm="onConfirm" />',
        script:
          "const columns = [{ text: '杭州', value: 'Hangzhou' }]\nconst selectedValues = ref([])\nconst onConfirm = ({ selectedValues }) => {}\n",
      },
    ],
  };

  const metaPath = path.join(OUTPUT_DIR, 'component-meta.json');
  const mcpPath = path.join(OUTPUT_DIR, 'mcp-server.json');

  fs.writeFileSync(metaPath, JSON.stringify(componentMeta, null, 2), 'utf-8');
  fs.writeFileSync(mcpPath, JSON.stringify(mcpServer, null, 2), 'utf-8');

  console.log(`\n✨ 完成！`);
  console.log(`📄 component-meta.json: ${components.length} 个组件 → ${metaPath}`);
  console.log(`📄 mcp-server.json: ${mcpServer.tools.length} 个工具 → ${mcpPath}`);
}

main();
