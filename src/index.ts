/**
 * @apexdevlabs/contentstack
 *
 * A comprehensive toolkit for working with Contentstack content types and entries.
 *
 * Sub-exports:
 * - `/schema` - Convert content type schemas to Zod validation schemas
 * - `/markdown` - Convert entries to formatted Markdown
 *
 * @packageDocumentation
 */

// Re-export all types
export type {
  ContentstackEnumChoice,
  ContentstackEnum,
  ContentstackFieldMetadata,
  ContentstackTaxonomyConfig,
  ContentstackBlock,
  ContentstackField,
  ContentstackContentType,
  SchemaOptions,
  ContentstackAsset,
  ContentstackReference,
  ContentstackLink,
  ContentstackTaxonomyTerm,
  JsonRteNode,
  JsonRteDocument,
} from "./types";

// Re-export from schema for convenience
export {
  contentTypeToZod,
  contentTypeToDraftZod,
  fieldToZod,
  validateEntry,
  validateDraft,
  extractMissingFields,
  AssetSchema,
  ReferenceSchema,
  LinkSchema,
  IsoDateSchema,
  TaxonomySchema,
  JsonRteSchema,
  JsonRteNodeSchema,
} from "./schema";

export type { Asset, Reference, Link, TaxonomyEntry } from "./schema";

// Re-export from markdown for convenience
export {
  entryToMarkdown,
  jsonRteToMarkdown,
  formatDateHuman,
  formatNumberWithCommas,
} from "./markdown";

export type { MarkdownOptions } from "./markdown";
