/**
 * Contentstack Content Type to Zod Schema Converter
 *
 * Converts Contentstack content type schemas into Zod validation schemas.
 *
 * Supports:
 * - All field types (text, number, boolean, date, json, markdown, RTE, select)
 * - References, assets, links
 * - Groups (nested + multiple)
 * - Modular blocks (including global fields)
 * - Taxonomy
 * - Extensions
 * - Mandatory / multiple handling
 *
 * Does NOT enforce:
 * - Uniqueness constraints
 * - Asset uploads
 * - Reference resolution
 * - Workflow / field rules
 *
 * @packageDocumentation
 */

import { z, ZodTypeAny, ZodError } from "zod";
import type {
  ContentstackContentType,
  ContentstackField,
  SchemaOptions,
} from "../types";

type ZodObjectShape = Record<string, ZodTypeAny>;

/**
 * Creates a loose object schema that allows additional properties.
 * Handles compatibility between Zod v3 and v4 APIs.
 *
 * @param shape - The object shape definition
 * @returns A Zod object schema with passthrough behavior
 * @internal
 */
function createLooseObject<T extends ZodObjectShape>(shape: T) {
  if (typeof (z as any).looseObject === "function") {
    return (z as any).looseObject(shape) as ReturnType<typeof z.object<T>> & {
      _input: z.infer<ReturnType<typeof z.object<T>>> & Record<string, unknown>;
      _output: z.infer<ReturnType<typeof z.object<T>>> & Record<string, unknown>;
    };
  }
  return z.object(shape).passthrough();
}

/**
 * Creates a datetime schema that accepts ISO date strings.
 * Supports both full datetime and date-only formats.
 *
 * @returns A Zod string schema with datetime validation
 * @internal
 */
function createDatetimeSchema() {
  return z.string().refine(
    (val) => {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(val)) return true;
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
      return false;
    },
    { message: "Invalid ISO date/datetime format" }
  );
}

/**
 * Generates a description string for a field.
 * Used by Zod's `.describe()` for JSON Schema generation.
 *
 * @param field - The Contentstack field definition
 * @returns A description string (priority: description > display_name > uid)
 * @internal
 */
function getFieldDescription(field: ContentstackField): string {
  return field.field_metadata?.description || field.display_name || field.uid;
}

/**
 * Recursive schema for JSON RTE nodes.
 * Supports nested children for complex rich text structures.
 */
export const JsonRteNodeSchema: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      type: z.string().optional(),
      text: z.string().optional(),
      children: z.array(JsonRteNodeSchema).optional(),
      attrs: z.record(z.string(), z.any()).optional(),
      uid: z.string().optional(),
    })
    .passthrough()
);

/**
 * Schema for JSON Rich Text Editor content.
 * Validates the root document structure with type "doc" and child nodes.
 */
export const JsonRteSchema = z
  .object({
    type: z.literal("doc"),
    uid: z.string().optional(),
    attrs: z.record(z.string(), z.any()).optional(),
    children: z.array(JsonRteNodeSchema),
  })
  .passthrough()
  .describe("JSON Rich Text Editor content");

const UID = z.string().min(1);

const AssetShape = {
  uid: UID,
  url: z.string().optional(),
} as const;

const ReferenceShape = {
  uid: UID,
  _content_type_uid: z.string().optional(),
} as const;

/** Schema for validating Contentstack asset objects */
export const AssetSchema = createLooseObject(AssetShape);

/** Schema for validating Contentstack reference objects */
export const ReferenceSchema = createLooseObject(ReferenceShape);

/** Schema for validating Contentstack link fields */
export const LinkSchema = z
  .object({
    title: z.string().optional(),
    href: z.string().optional(),
  })
  .passthrough();

/** Schema for validating ISO date strings */
export const IsoDateSchema = createDatetimeSchema();

/** Schema for validating taxonomy term arrays */
export const TaxonomySchema = z.array(
  z.object({
    taxonomy_uid: z.string(),
    term_uid: z.string(),
  })
);

/** Inferred type for a Contentstack asset object */
export type Asset = z.infer<typeof AssetSchema>;

/** Inferred type for a Contentstack reference object */
export type Reference = z.infer<typeof ReferenceSchema>;

/** Inferred type for a Contentstack link field */
export type Link = z.infer<typeof LinkSchema>;

/** Inferred type for a taxonomy term entry */
export type TaxonomyEntry = z.infer<typeof TaxonomySchema>[number];

/**
 * Converts a single Contentstack field definition to a Zod schema.
 *
 * @param field - The Contentstack field definition
 * @param options - Schema generation options
 * @returns A Zod schema for validating the field value
 *
 * @example
 * ```typescript
 * const field = { uid: 'title', data_type: 'text', mandatory: true };
 * const schema = fieldToZod(field);
 * schema.parse('Hello World'); // Valid
 * ```
 */
export function fieldToZod(
  field: ContentstackField,
  options?: SchemaOptions
): ZodTypeAny {
  let schema: ZodTypeAny;
  const isUpsertMode = options?.mode === "upsert";

  switch (field.data_type) {
    case "text": {
      if (field.field_metadata?.allow_rich_text) {
        schema = z.string();
        break;
      }

      if (field.enum?.choices?.length) {
        const values = field.enum.choices.map((c) => c.value) as [
          string,
          ...string[]
        ];
        schema = z.enum(values);
      } else {
        schema = z.string();
        if (field.format) {
          try {
            schema = (schema as z.ZodString).regex(new RegExp(field.format));
          } catch {
            // Invalid regex, skip validation
          }
        }
      }
      break;
    }

    case "number":
      schema = z.number();
      break;

    case "boolean":
      schema = z.boolean();
      break;

    case "isodate": {
      schema = IsoDateSchema;
      if (field.startDate || field.endDate) {
        const startDate = field.startDate ? new Date(field.startDate) : null;
        const endDate = field.endDate ? new Date(field.endDate) : null;
        schema = z.string().datetime().refine(
          (val) => {
            const date = new Date(val);
            if (startDate && date < startDate) return false;
            if (endDate && date > endDate) return false;
            return true;
          },
          { message: "Date out of allowed range" }
        );
      }
      break;
    }

    case "json": {
      if (field.field_metadata?.allow_json_rte) {
        schema = JsonRteSchema;
      } else {
        schema = z.any();
      }
      break;
    }

    case "file":
      schema = isUpsertMode ? z.string() : AssetSchema;
      break;

    case "link":
      schema = LinkSchema;
      break;

    case "reference":
    case "global_field":
      schema = ReferenceSchema;
      break;

    case "taxonomy":
      schema = TaxonomySchema;
      break;

    case "group": {
      const groupShape: Record<string, ZodTypeAny> = {};

      for (const subField of field.schema || []) {
        groupShape[subField.uid] = fieldToZod(subField, options);
      }

      if (field.multiple) {
        groupShape["_metadata"] = z
          .object({
            uid: z.string().optional(),
          })
          .passthrough()
          .optional();
      }

      schema = z.object(groupShape).passthrough();

      if (field.multiple) {
        schema = z.array(schema);
        if (field.max_instance && field.max_instance > 0) {
          schema = (schema as z.ZodArray<any>).max(field.max_instance);
        }
      }
      break;
    }

    case "blocks": {
      const blockSchemas: ZodTypeAny[] = (field.blocks || []).map((block) => {
        if (block.reference_to) {
          return z
            .object({
              [block.uid]: ReferenceSchema,
            })
            .passthrough();
        }

        const blockShape: Record<string, ZodTypeAny> = {};
        for (const subField of block.schema || []) {
          blockShape[subField.uid] = fieldToZod(subField, options);
        }
        blockShape["_metadata"] = z
          .object({
            uid: z.string().optional(),
          })
          .passthrough()
          .optional();

        return z
          .object({
            [block.uid]: z.object(blockShape).passthrough(),
          })
          .passthrough();
      });

      if (blockSchemas.length === 0) {
        schema = z.array(z.any());
      } else if (blockSchemas.length === 1) {
        schema = z.array(blockSchemas[0]);
      } else {
        const [first, second, ...rest] = blockSchemas;
        schema = z.array(z.union([first, second, ...rest]));
      }
      break;
    }

    default:
      schema = z.any();
  }

  if (
    field.multiple &&
    field.data_type !== "group" &&
    field.data_type !== "blocks"
  ) {
    schema = z.array(schema);
  }

  if (!field.mandatory) {
    schema = schema.nullable().optional();
  }

  schema = schema.describe(getFieldDescription(field));

  return schema;
}

/**
 * Converts a Contentstack content type schema to a Zod validation schema.
 *
 * @param contentType - The Contentstack content type definition
 * @param options - Schema generation options
 * @returns A Zod object schema for validating entries of this content type
 * @throws Error if the content type schema is invalid
 *
 * @example
 * ```typescript
 * import { contentTypeToZod } from '@apexdevlabs/contentstack/schema';
 *
 * const blogPostSchema = contentTypeToZod(blogPostContentType);
 * const result = blogPostSchema.safeParse(entry);
 *
 * if (result.success) {
 *   console.log('Valid entry:', result.data);
 * } else {
 *   console.error('Validation errors:', result.error);
 * }
 * ```
 */
export function contentTypeToZod(
  contentType: ContentstackContentType,
  options?: SchemaOptions
) {
  if (!contentType?.schema) {
    throw new Error("Invalid Contentstack content type schema");
  }

  const shape: Record<string, ZodTypeAny> = {};

  for (const field of contentType.schema) {
    shape[field.uid] = fieldToZod(field, options);
  }

  return z.object(shape);
}

/**
 * Creates a partial/draft schema where all fields are optional.
 * Useful for validating LLM-generated content or partial input.
 *
 * @param contentType - The Contentstack content type definition
 * @param options - Schema generation options
 * @returns A partial Zod schema where all fields are optional
 *
 * @example
 * ```typescript
 * const draftSchema = contentTypeToDraftZod(blogPostContentType);
 *
 * // Valid even with missing required fields
 * draftSchema.parse({ title: 'Draft Post' });
 * ```
 */
export function contentTypeToDraftZod(
  contentType: ContentstackContentType,
  options?: SchemaOptions
) {
  return contentTypeToZod(contentType, options).partial();
}

/**
 * Extracts missing required field paths from a Zod validation error.
 * Compatible with both Zod v3 and v4 error formats.
 *
 * @param zodError - The Zod validation error
 * @returns Array of dot-notation field paths for missing required fields
 *
 * @example
 * ```typescript
 * const result = schema.safeParse(incompleteEntry);
 * if (!result.success) {
 *   const missing = extractMissingFields(result.error);
 *   console.log('Missing fields:', missing);
 *   // ['title', 'author.name', 'content']
 * }
 * ```
 */
export function extractMissingFields(zodError: ZodError): string[] {
  return zodError.issues
    .filter((issue) => {
      if (issue.code !== "invalid_type") return false;
      if ("received" in issue && (issue as any).received === "undefined")
        return true;
      if (issue.message?.includes("received undefined")) return true;
      return false;
    })
    .map((issue) => issue.path.join("."));
}

/**
 * Validates an entry against a content type schema.
 *
 * @param contentType - The Contentstack content type definition
 * @param entry - The entry data to validate
 * @returns A result object with success status and validated data or error
 *
 * @example
 * ```typescript
 * const result = validateEntry<BlogPost>(blogPostContentType, entry);
 *
 * if (result.success) {
 *   // result.data is typed as BlogPost
 *   console.log(result.data.title);
 * } else {
 *   console.error(result.error.issues);
 * }
 * ```
 */
export function validateEntry<T>(
  contentType: ContentstackContentType,
  entry: unknown
): { success: true; data: T } | { success: false; error: ZodError } {
  const schema = contentTypeToZod(contentType);
  const result = schema.safeParse(entry);

  if (result.success) {
    return { success: true, data: result.data as T };
  }

  return { success: false, error: result.error };
}

/**
 * Validates a draft entry with partial validation (all fields optional).
 * Useful for validating incomplete entries during editing.
 *
 * @param contentType - The Contentstack content type definition
 * @param entry - The partial entry data to validate
 * @returns A result object with success status and validated data or error
 *
 * @example
 * ```typescript
 * // Validates successfully even with missing required fields
 * const result = validateDraft<Partial<BlogPost>>(blogPostContentType, {
 *   title: 'Work in progress'
 * });
 * ```
 */
export function validateDraft<T>(
  contentType: ContentstackContentType,
  entry: unknown
): { success: true; data: T } | { success: false; error: ZodError } {
  const schema = contentTypeToDraftZod(contentType);
  const result = schema.safeParse(entry);

  if (result.success) {
    return { success: true, data: result.data as T };
  }

  return { success: false, error: result.error };
}

export default {
  contentTypeToZod,
  contentTypeToDraftZod,
  fieldToZod,
  extractMissingFields,
  validateEntry,
  validateDraft,
  AssetSchema,
  ReferenceSchema,
  LinkSchema,
  IsoDateSchema,
  TaxonomySchema,
  JsonRteSchema,
  JsonRteNodeSchema,
};
