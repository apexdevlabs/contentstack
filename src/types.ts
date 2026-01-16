/**
 * Shared type definitions for Contentstack schema structures.
 * These types represent the structure of Contentstack content type schemas
 * as returned by the Contentstack Management API.
 *
 * @packageDocumentation
 */

/**
 * Represents a single choice in an enum/select field.
 */
export interface ContentstackEnumChoice {
  /** The value stored in the database */
  value: string;
  /** Optional display key for the choice */
  key?: string;
}

/**
 * Configuration for enum/select fields.
 */
export interface ContentstackEnum {
  /** Available choices for the select field */
  choices?: ContentstackEnumChoice[];
  /** Whether advanced enum features are enabled */
  advanced?: boolean;
}

/**
 * Metadata configuration for a field.
 * Contains display settings, validation hints, and editor configuration.
 */
export interface ContentstackFieldMetadata {
  /** Human-readable description of the field */
  description?: string;
  /** Instructions shown to content editors */
  instruction?: string;
  /** Whether the field accepts markdown content */
  markdown?: boolean;
  /** Whether HTML rich text editing is enabled */
  allow_rich_text?: boolean;
  /** Whether JSON rich text editing is enabled */
  allow_json_rte?: boolean;
  /** Whether the field supports multiple lines */
  multiline?: boolean;
  /** Type of rich text editor (basic, advanced, custom) */
  rich_text_type?: string;
  /** Default value for the field */
  default_value?: unknown;
  /** Whether this is a default/system field */
  _default?: boolean;
}

/**
 * Configuration for taxonomy fields.
 */
export interface ContentstackTaxonomyConfig {
  /** UID of the taxonomy this field references */
  taxonomy_uid: string;
  /** Maximum number of terms that can be selected */
  max_terms?: number;
  /** Whether at least one term must be selected */
  mandatory?: boolean;
  /** Whether the field is excluded from localization */
  non_localizable?: boolean;
}

/**
 * Represents a block definition within a modular blocks field.
 */
export interface ContentstackBlock {
  /** Unique identifier for the block type */
  uid: string;
  /** Human-readable title for the block */
  title?: string;
  /** Reference to a global field (if this block is a global field reference) */
  reference_to?: string;
  /** Field definitions within this block */
  schema?: ContentstackField[];
}

/**
 * Represents a field definition within a content type schema.
 * This is the core building block of Contentstack schemas.
 */
export interface ContentstackField {
  /** Unique identifier for the field */
  uid: string;
  /** Data type of the field (text, number, boolean, isodate, file, link, reference, group, blocks, json, taxonomy) */
  data_type: string;
  /** Human-readable name shown in the UI */
  display_name?: string;
  /** Whether the field is required */
  mandatory?: boolean;
  /** Whether the field accepts multiple values (array) */
  multiple?: boolean;
  /** Whether the field value must be unique across entries */
  unique?: boolean;
  /** Enum configuration for select fields */
  enum?: ContentstackEnum;
  /** Nested field definitions for group fields */
  schema?: ContentstackField[];
  /** Block definitions for modular blocks fields */
  blocks?: ContentstackBlock[];
  /** Additional field metadata and configuration */
  field_metadata?: ContentstackFieldMetadata;
  /** Regex format for text validation */
  format?: string;
  /** Content type UID(s) for reference fields */
  reference_to?: string | string[];
  /** Minimum allowed date for date fields */
  startDate?: string | null;
  /** Maximum allowed date for date fields */
  endDate?: string | null;
  /** Maximum number of items for repeatable fields */
  max_instance?: number;
  /** Extension UIDs for custom field extensions */
  extensions?: string[];
  /** Single extension UID */
  extension_uid?: string;
  /** Taxonomy configurations for taxonomy fields */
  taxonomies?: ContentstackTaxonomyConfig[];
}

/**
 * Represents a complete Contentstack content type definition.
 */
export interface ContentstackContentType {
  /** Unique identifier for the content type */
  uid?: string;
  /** Human-readable title */
  title?: string;
  /** Array of field definitions that make up the content structure */
  schema: ContentstackField[];
}

/**
 * Options for schema generation.
 */
export interface SchemaOptions {
  /**
   * Schema generation mode:
   * - `'read'`: For validating API responses (assets as objects) - default
   * - `'upsert'`: For validating create/update payloads (assets as UID strings)
   */
  mode?: "read" | "upsert";
}

/**
 * Represents a Contentstack asset object as returned by the API.
 */
export interface ContentstackAsset {
  /** Unique identifier for the asset */
  uid: string;
  /** URL to access the asset */
  url?: string;
  /** Original filename */
  filename?: string;
  /** Asset title */
  title?: string;
  /** MIME content type */
  content_type?: string;
  /** File size in bytes */
  file_size?: string | number;
  /** Image dimensions (for image assets) */
  dimension?: {
    height: number;
    width: number;
  };
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * Represents a reference to another entry.
 */
export interface ContentstackReference {
  /** UID of the referenced entry */
  uid: string;
  /** Content type UID of the referenced entry */
  _content_type_uid?: string;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * Represents a link field value.
 */
export interface ContentstackLink {
  /** Link title/text */
  title?: string;
  /** Link URL */
  href?: string;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * Represents a taxonomy term selection.
 */
export interface ContentstackTaxonomyTerm {
  /** UID of the taxonomy */
  taxonomy_uid: string;
  /** UID of the selected term */
  term_uid: string;
}

/**
 * Represents a node in JSON Rich Text Editor content.
 */
export interface JsonRteNode {
  /** Node type (doc, p, h1, h2, etc.) */
  type?: string;
  /** Text content for text nodes */
  text?: string;
  /** Child nodes */
  children?: JsonRteNode[];
  /** Node attributes */
  attrs?: Record<string, unknown>;
  /** Unique identifier */
  uid?: string;
  /** Bold formatting */
  bold?: boolean;
  /** Italic formatting */
  italic?: boolean;
  /** Underline formatting */
  underline?: boolean;
  /** Strikethrough formatting */
  strikethrough?: boolean;
  /** Code formatting */
  code?: boolean;
  /** Superscript formatting */
  superscript?: boolean;
  /** Subscript formatting */
  subscript?: boolean;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * Represents the root document of JSON Rich Text Editor content.
 */
export interface JsonRteDocument {
  /** Always "doc" for root document */
  type: "doc";
  /** Unique identifier */
  uid?: string;
  /** Document attributes */
  attrs?: Record<string, unknown>;
  /** Child nodes */
  children: JsonRteNode[];
}
