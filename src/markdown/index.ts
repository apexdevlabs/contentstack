/**
 * Contentstack Entry to Markdown Converter
 *
 * Converts Contentstack entry objects to formatted Markdown strings
 * using the content type schema for field type awareness and display names.
 *
 * Features:
 * - GFM (GitHub Flavored Markdown) compatible output
 * - Tables for groups and repeatable fields
 * - Nested headings for complex structures
 * - Human-readable date and number formatting
 * - JSON RTE to Markdown conversion
 *
 * @packageDocumentation
 */

import type {
  ContentstackContentType,
  ContentstackField,
  ContentstackBlock,
  ContentstackAsset,
  ContentstackLink,
  JsonRteNode,
  JsonRteDocument,
} from "../types";

/**
 * System fields that are automatically added by Contentstack
 * and should be excluded from markdown output by default.
 */
const SYSTEM_FIELDS = new Set([
  "uid",
  "locale",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "ACL",
  "_version",
  "_in_progress",
  "_embedded_items",
  "publish_details",
  "_metadata",
  "tags",
]);

/**
 * Options for markdown generation.
 */
export interface MarkdownOptions {
  /** Starting heading level (default: 1) */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Custom date formatter (default: human-readable format) */
  formatDate?: (isoDate: string) => string;
  /** Custom number formatter (default: locale with commas) */
  formatNumber?: (num: number) => string;
  /** Skip fields with null/undefined/empty values (default: true) */
  skipEmpty?: boolean;
  /** Include system fields in output (default: false) */
  includeSystemFields?: boolean;
  /** Use tables for simple groups (default: true) */
  useTables?: boolean;
  /** Field UID to use as main title/H1 (default: 'title') */
  titleField?: string;
  /** Field UID to use as description blockquote (default: 'meta_description') */
  descriptionField?: string;
}

const DEFAULT_OPTIONS: Required<MarkdownOptions> = {
  headingLevel: 1,
  formatDate: formatDateHuman,
  formatNumber: formatNumberWithCommas,
  skipEmpty: true,
  includeSystemFields: false,
  useTables: true,
  titleField: "title",
  descriptionField: "meta_description",
};

/**
 * Formats an ISO date string to human-readable format.
 *
 * @param isoDate - ISO date string (e.g., "2012-03-16" or "2012-03-16T00:00:00.000Z")
 * @returns Formatted date string (e.g., "March 16, 2012")
 */
export function formatDateHuman(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Formats a number with thousands separators and optional abbreviation.
 *
 * @param num - The number to format
 * @returns Formatted number string (e.g., "15,921" or "40M")
 */
export function formatNumberWithCommas(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  return num.toLocaleString("en-US");
}

/**
 * Checks if a value is empty (null, undefined, empty string, or empty array).
 *
 * @param value - The value to check
 * @returns True if the value is considered empty
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Checks if a file/asset is an image based on content_type.
 *
 * @param asset - The asset object
 * @returns True if the asset is an image
 */
function isImageAsset(asset: ContentstackAsset): boolean {
  if (!asset.content_type) return false;
  return asset.content_type.startsWith("image/");
}

/**
 * Checks if a group schema has nested groups (complex structure).
 *
 * @param schema - Array of field definitions
 * @returns True if any field is a group or blocks type
 */
function hasNestedGroups(schema: ContentstackField[]): boolean {
  return schema.some(
    (field) => field.data_type === "group" || field.data_type === "blocks"
  );
}

/**
 * Creates a markdown heading with the specified level.
 *
 * @param text - The heading text
 * @param level - The heading level (1-6)
 * @returns Markdown heading string
 */
function heading(text: string, level: number): string {
  const safeLevel = Math.min(Math.max(level, 1), 6);
  return `${"#".repeat(safeLevel)} ${text}`;
}

/**
 * Escapes special characters in text for use in markdown tables.
 *
 * @param text - The text to escape
 * @returns Escaped text safe for table cells
 */
function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/**
 * Converts JSON RTE content to markdown.
 *
 * @param node - The JSON RTE node to convert
 * @returns Markdown string representation
 *
 * @example
 * ```typescript
 * const markdown = jsonRteToMarkdown({
 *   type: 'doc',
 *   children: [
 *     { type: 'p', children: [{ text: 'Hello ' }, { text: 'world', bold: true }] }
 *   ]
 * });
 * // Returns: "Hello **world**"
 * ```
 */
export function jsonRteToMarkdown(node: JsonRteNode | JsonRteDocument): string {
  if (!node) return "";

  // Text node
  if ("text" in node && typeof node.text === "string") {
    let text = node.text;

    // Apply inline formatting
    if (node.bold) text = `**${text}**`;
    if (node.italic) text = `*${text}*`;
    if (node.underline) text = `<u>${text}</u>`;
    if (node.strikethrough) text = `~~${text}~~`;
    if (node.code) text = `\`${text}\``;
    if (node.superscript) text = `<sup>${text}</sup>`;
    if (node.subscript) text = `<sub>${text}</sub>`;

    return text;
  }

  // Process children
  const children = node.children || [];
  const childContent = children.map((child) => jsonRteToMarkdown(child)).join("");

  // Handle different node types
  switch (node.type) {
    case "doc":
      return childContent.trim();

    case "p":
      return `${childContent}\n\n`;

    case "h1":
      return `# ${childContent}\n\n`;

    case "h2":
      return `## ${childContent}\n\n`;

    case "h3":
      return `### ${childContent}\n\n`;

    case "h4":
      return `#### ${childContent}\n\n`;

    case "h5":
      return `##### ${childContent}\n\n`;

    case "h6":
      return `###### ${childContent}\n\n`;

    case "blockquote":
      return `> ${childContent.trim().split("\n").join("\n> ")}\n\n`;

    case "ul":
      return children
        .map((child) => {
          const content = jsonRteToMarkdown(child).trim();
          return `- ${content}`;
        })
        .join("\n") + "\n\n";

    case "ol":
      return children
        .map((child, i) => {
          const content = jsonRteToMarkdown(child).trim();
          return `${i + 1}. ${content}`;
        })
        .join("\n") + "\n\n";

    case "li":
      return childContent.trim();

    case "code_block":
    case "code": {
      const lang = (node.attrs?.language as string) || "";
      return `\`\`\`${lang}\n${childContent.trim()}\n\`\`\`\n\n`;
    }

    case "hr":
      return "---\n\n";

    case "a":
    case "link": {
      const href = (node.attrs?.url as string) || (node.attrs?.href as string) || "";
      return `[${childContent}](${href})`;
    }

    case "img":
    case "image": {
      const src = (node.attrs?.src as string) || (node.attrs?.url as string) || "";
      const alt = (node.attrs?.alt as string) || "Image";
      return `![${alt}](${src})\n\n`;
    }

    case "table": {
      const rows = children.filter((c) => c.type === "tr" || c.type === "row");
      if (rows.length === 0) return "";

      const tableRows = rows.map((row) => {
        const cells = (row.children || []).map((cell) =>
          escapeTableCell(jsonRteToMarkdown(cell).trim())
        );
        return `| ${cells.join(" | ")} |`;
      });

      if (tableRows.length > 0) {
        const headerCellCount = (rows[0].children || []).length;
        const separator = `| ${Array(headerCellCount).fill("---").join(" | ")} |`;
        tableRows.splice(1, 0, separator);
      }

      return tableRows.join("\n") + "\n\n";
    }

    case "tr":
    case "row":
    case "td":
    case "th":
    case "cell":
      return childContent;

    default:
      return childContent;
  }
}

/**
 * Converts a primitive field value to markdown.
 *
 * @param value - The field value
 * @param field - The field definition
 * @param options - Markdown options
 * @returns Markdown string representation
 */
function primitiveToMarkdown(
  value: unknown,
  field: ContentstackField,
  options: Required<MarkdownOptions>
): string {
  if (isEmpty(value)) return "";

  switch (field.data_type) {
    case "text": {
      if (Array.isArray(value)) {
        // Multiple text values
        return value.map((v) => `\`${String(v)}\``).join(" · ");
      }
      // HTML RTE - pass through
      if (field.field_metadata?.allow_rich_text) {
        return String(value);
      }
      return String(value);
    }

    case "number": {
      const num = Number(value);
      return options.formatNumber(num);
    }

    case "boolean": {
      return value ? "**Yes**" : "**No**";
    }

    case "isodate": {
      return options.formatDate(String(value));
    }

    case "link": {
      const link = value as ContentstackLink;
      if (link.href) {
        return `[${link.title || link.href}](${link.href})`;
      }
      return link.title || "";
    }

    case "file": {
      const asset = value as ContentstackAsset;
      if (!asset.url) return asset.title || asset.filename || "";

      if (isImageAsset(asset)) {
        return `![${asset.title || asset.filename || "Image"}](${asset.url})`;
      }
      return `[${asset.title || asset.filename || "File"}](${asset.url})`;
    }

    case "reference":
    case "global_field": {
      const ref = value as { uid: string; title?: string };
      return ref.title || `uid: ${ref.uid}`;
    }

    case "json": {
      if (field.field_metadata?.allow_json_rte) {
        return jsonRteToMarkdown(value as JsonRteDocument);
      }
      return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
    }

    case "taxonomy": {
      const terms = value as Array<{ taxonomy_uid: string; term_uid: string }>;
      return terms.map((t) => `- ${t.term_uid}`).join("\n");
    }

    default:
      return String(value);
  }
}

/**
 * Converts a simple group (no nested groups) to a markdown table.
 *
 * @param value - The group value object
 * @param schema - The group's field schema
 * @param options - Markdown options
 * @returns Markdown table string
 */
function groupToTable(
  value: Record<string, unknown>,
  schema: ContentstackField[],
  options: Required<MarkdownOptions>
): string {
  const lines: string[] = [];
  const imageLines: string[] = [];

  lines.push("| Field | Value |");
  lines.push("|-------|-------|");

  for (const field of schema) {
    if (SYSTEM_FIELDS.has(field.uid) && !options.includeSystemFields) continue;

    const fieldValue = value[field.uid];
    if (options.skipEmpty && isEmpty(fieldValue)) continue;

    const label = field.display_name || field.uid;

    // Extract images above the table
    if (field.data_type === "file" && fieldValue) {
      const asset = fieldValue as ContentstackAsset;
      if (asset.url && isImageAsset(asset)) {
        imageLines.push(`![${label}](${asset.url})`);
        continue;
      }
    }

    const rendered = primitiveToMarkdown(fieldValue, field, options);
    if (rendered) {
      lines.push(`| **${escapeTableCell(label)}** | ${escapeTableCell(rendered)} |`);
    }
  }

  const result: string[] = [];
  if (imageLines.length > 0) {
    result.push(imageLines.join("\n\n"));
    result.push("");
  }
  if (lines.length > 2) {
    result.push(lines.join("\n"));
  }

  return result.join("\n");
}

/**
 * Converts a complex group (with nested groups) to nested markdown headings.
 *
 * @param value - The group value object
 * @param schema - The group's field schema
 * @param level - Current heading level
 * @param options - Markdown options
 * @returns Markdown string with nested headings
 */
function groupToHeadings(
  value: Record<string, unknown>,
  schema: ContentstackField[],
  level: number,
  options: Required<MarkdownOptions>
): string {
  const lines: string[] = [];

  for (const field of schema) {
    if (SYSTEM_FIELDS.has(field.uid) && !options.includeSystemFields) continue;

    const fieldValue = value[field.uid];
    if (options.skipEmpty && isEmpty(fieldValue)) continue;

    const label = field.display_name || field.uid;

    if (field.data_type === "group" && !field.multiple) {
      // Nested non-repeatable group
      lines.push(heading(label, level));
      lines.push("");

      const groupValue = fieldValue as Record<string, unknown>;
      const groupSchema = field.schema || [];

      if (hasNestedGroups(groupSchema)) {
        lines.push(groupToHeadings(groupValue, groupSchema, level + 1, options));
      } else if (options.useTables) {
        lines.push(groupToTable(groupValue, groupSchema, options));
      } else {
        lines.push(groupToHeadings(groupValue, groupSchema, level + 1, options));
      }
      lines.push("");
    } else if (field.data_type === "group" && field.multiple) {
      // Repeatable group - render as table
      lines.push(heading(label, level));
      lines.push("");
      lines.push(repeatableGroupToTable(fieldValue as Record<string, unknown>[], field.schema || [], options));
      lines.push("");
    } else if (field.data_type === "blocks") {
      // Modular blocks
      lines.push(heading(label, level));
      lines.push("");
      lines.push(blocksToMarkdown(fieldValue as Record<string, unknown>[], field.blocks || [], level + 1, options));
    } else {
      // Primitive field
      const rendered = primitiveToMarkdown(fieldValue, field, options);
      if (rendered) {
        if (field.data_type === "file" && (fieldValue as ContentstackAsset)?.url) {
          // Images rendered directly
          lines.push(rendered);
        } else if (field.data_type === "json" && field.field_metadata?.allow_json_rte) {
          // JSON RTE rendered directly
          lines.push(`**${label}:**`);
          lines.push("");
          lines.push(rendered);
        } else {
          lines.push(`**${label}:** ${rendered}`);
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n").trim();
}

/**
 * Converts a repeatable group array to a markdown table.
 *
 * @param values - Array of group values
 * @param schema - The group's field schema
 * @param options - Markdown options
 * @returns Markdown table string
 */
function repeatableGroupToTable(
  values: Record<string, unknown>[],
  schema: ContentstackField[],
  options: Required<MarkdownOptions>
): string {
  if (!values || values.length === 0) return "";

  // Filter out system fields and empty columns
  const visibleFields = schema.filter(
    (f) =>
      !SYSTEM_FIELDS.has(f.uid) &&
      (options.includeSystemFields || !f.uid.startsWith("_"))
  );

  if (visibleFields.length === 0) return "";

  const headers = visibleFields.map((f) => f.display_name || f.uid);
  const lines: string[] = [];

  lines.push(`| ${headers.join(" | ")} |`);
  lines.push(`| ${headers.map(() => "---").join(" | ")} |`);

  for (const item of values) {
    const cells = visibleFields.map((field) => {
      const fieldValue = item[field.uid];
      if (isEmpty(fieldValue)) return "";

      const rendered = primitiveToMarkdown(fieldValue, field, options);
      return escapeTableCell(rendered);
    });
    lines.push(`| ${cells.join(" | ")} |`);
  }

  return lines.join("\n");
}

/**
 * Converts modular blocks to markdown sections.
 *
 * @param blocks - Array of block items
 * @param blockDefs - Block definitions from schema
 * @param level - Current heading level
 * @param options - Markdown options
 * @returns Markdown string with block sections
 */
function blocksToMarkdown(
  blocks: Record<string, unknown>[],
  blockDefs: ContentstackBlock[],
  level: number,
  options: Required<MarkdownOptions>
): string {
  if (!blocks || blocks.length === 0) return "";

  const lines: string[] = [];

  for (const blockItem of blocks) {
    // Find which block type this is
    const blockKey = Object.keys(blockItem).find((k) => !k.startsWith("_"));
    if (!blockKey) continue;

    const blockDef = blockDefs.find((b) => b.uid === blockKey);
    if (!blockDef) continue;

    const blockValue = blockItem[blockKey] as Record<string, unknown>;
    const blockSchema = blockDef.schema || [];

    // Get block title from schema and first text field value
    const blockTitle = blockDef.title || blockKey;
    const firstTextField = blockSchema.find((f) => f.data_type === "text" && f.mandatory);
    const titleValue = firstTextField
      ? (blockValue[firstTextField.uid] as string)
      : null;

    // Render block heading
    if (titleValue) {
      lines.push(heading(`${blockTitle}: ${titleValue}`, level));
    } else {
      lines.push(heading(blockTitle, level));
    }
    lines.push("");

    // Special handling for quote blocks
    if (blockKey === "quote") {
      const quoteText = blockValue.quote_text as string;
      const attribution = blockValue.attribution as string;

      if (quoteText) {
        lines.push(`> *"${quoteText}"*`);
        if (attribution) {
          lines.push(`>`);
          lines.push(`> — **${attribution}**`);
        }
        lines.push("");
      }
    } else {
      // Render other block fields
      for (const field of blockSchema) {
        if (SYSTEM_FIELDS.has(field.uid) && !options.includeSystemFields) continue;
        if (firstTextField && field.uid === firstTextField.uid) continue; // Skip title field

        const fieldValue = blockValue[field.uid];
        if (options.skipEmpty && isEmpty(fieldValue)) continue;

        const label = field.display_name || field.uid;
        const rendered = primitiveToMarkdown(fieldValue, field, options);

        if (rendered) {
          if (field.data_type === "file" && (fieldValue as ContentstackAsset)?.url) {
            lines.push(rendered);
          } else if (field.data_type === "json" && field.field_metadata?.allow_json_rte) {
            lines.push(`> ${rendered.trim().split("\n").join("\n> ")}`);
          } else if (field.field_metadata?.multiline || field.data_type === "text" && rendered.length > 100) {
            lines.push(`> ${rendered}`);
          } else {
            lines.push(`**${label}:** ${rendered}`);
          }
          lines.push("");
        }
      }
    }

    lines.push("---");
    lines.push("");
  }

  // Remove trailing separator
  if (lines.length >= 2 && lines[lines.length - 2] === "---") {
    lines.splice(lines.length - 2, 1);
  }

  return lines.join("\n").trim();
}

/**
 * Converts a Contentstack entry to a formatted Markdown string.
 *
 * @param entry - The Contentstack entry object
 * @param contentType - The content type schema definition
 * @param options - Markdown generation options
 * @returns Formatted markdown string
 *
 * @example
 * ```typescript
 * import { entryToMarkdown } from '@apexdevlabs/contentstack/markdown';
 *
 * const markdown = entryToMarkdown(blogPost, blogPostContentType, {
 *   titleField: 'title',
 *   descriptionField: 'meta_description'
 * });
 *
 * console.log(markdown);
 * // # My Blog Post
 * // > A great article about coding
 * // ...
 * ```
 */
export function entryToMarkdown(
  entry: Record<string, unknown>,
  contentType: ContentstackContentType,
  options?: MarkdownOptions
): string {
  const opts: Required<MarkdownOptions> = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];
  const schema = contentType.schema;

  // Process title field
  const titleValue = entry[opts.titleField];
  if (titleValue && typeof titleValue === "string") {
    lines.push(heading(titleValue, opts.headingLevel));
    lines.push("");
  }

  // Process description field
  const descValue = entry[opts.descriptionField];
  if (descValue && typeof descValue === "string") {
    lines.push(`> ${descValue}`);
    lines.push("");
  }

  // Process remaining fields
  for (const field of schema) {
    // Skip title and description fields (already processed)
    if (field.uid === opts.titleField || field.uid === opts.descriptionField) {
      continue;
    }

    // Skip system fields
    if (SYSTEM_FIELDS.has(field.uid) && !opts.includeSystemFields) {
      continue;
    }

    const fieldValue = entry[field.uid];

    // Skip empty values
    if (opts.skipEmpty && isEmpty(fieldValue)) {
      continue;
    }

    const label = field.display_name || field.uid;
    const fieldLevel = opts.headingLevel + 1;

    if (field.data_type === "group" && !field.multiple) {
      // Non-repeatable group
      lines.push("---");
      lines.push("");
      lines.push(heading(label, fieldLevel));
      lines.push("");

      const groupValue = fieldValue as Record<string, unknown>;
      const groupSchema = field.schema || [];

      if (hasNestedGroups(groupSchema)) {
        lines.push(groupToHeadings(groupValue, groupSchema, fieldLevel + 1, opts));
      } else if (opts.useTables) {
        lines.push(groupToTable(groupValue, groupSchema, opts));
      } else {
        lines.push(groupToHeadings(groupValue, groupSchema, fieldLevel + 1, opts));
      }
      lines.push("");
    } else if (field.data_type === "group" && field.multiple) {
      // Repeatable group
      lines.push("---");
      lines.push("");
      lines.push(heading(label, fieldLevel));
      lines.push("");
      lines.push(repeatableGroupToTable(fieldValue as Record<string, unknown>[], field.schema || [], opts));
      lines.push("");
    } else if (field.data_type === "blocks") {
      // Modular blocks
      lines.push("---");
      lines.push("");
      lines.push(heading(label, fieldLevel));
      lines.push("");
      lines.push(blocksToMarkdown(fieldValue as Record<string, unknown>[], field.blocks || [], fieldLevel + 1, opts));
      lines.push("");
    } else {
      // Primitive field
      const rendered = primitiveToMarkdown(fieldValue, field, opts);
      if (rendered) {
        if (field.data_type === "file" || (field.data_type === "json" && field.field_metadata?.allow_json_rte)) {
          lines.push("---");
          lines.push("");
          lines.push(heading(label, fieldLevel));
          lines.push("");
          lines.push(rendered);
          lines.push("");
        } else if (field.multiple && field.data_type === "text") {
          // Multiple text (keywords, tags)
          lines.push("---");
          lines.push("");
          lines.push(`**${label}:** ${rendered}`);
          lines.push("");
        } else {
          lines.push(`**${label}:** ${rendered}`);
          lines.push("");
        }
      }
    }
  }

  return lines.join("\n").trim();
}

export default {
  entryToMarkdown,
  jsonRteToMarkdown,
  formatDateHuman,
  formatNumberWithCommas,
};
