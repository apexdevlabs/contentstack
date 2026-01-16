# @apexdevlabs/contentstack

A comprehensive toolkit for working with Contentstack content types and entries.

## Features

- **Schema Validation** - Convert Contentstack content type schemas to Zod validation schemas
- **Entry to Markdown** - Convert entries to beautifully formatted Markdown
- **TypeScript First** - Full type safety with comprehensive type definitions
- **GFM Compatible** - Markdown output works with GitHub Flavored Markdown renderers

## Installation

```bash
npm install @apexdevlabs/contentstack zod
```

```bash
pnpm add @apexdevlabs/contentstack zod
```

```bash
yarn add @apexdevlabs/contentstack zod
```

## Usage

### Schema Validation (`/schema`)

Convert Contentstack content type schemas to Zod validation schemas.

```typescript
import { contentTypeToZod, validateEntry } from '@apexdevlabs/contentstack/schema';

// Your content type schema from Contentstack
const blogPostContentType = {
  uid: 'blog_post',
  schema: [
    { uid: 'title', data_type: 'text', mandatory: true },
    { uid: 'body', data_type: 'text', mandatory: true },
    { uid: 'author', data_type: 'reference', mandatory: false },
  ],
};

// Create a Zod schema
const schema = contentTypeToZod(blogPostContentType);

// Validate an entry
const result = schema.safeParse(entry);

if (result.success) {
  console.log('Valid entry:', result.data);
} else {
  console.error('Validation errors:', result.error.issues);
}

// Or use the helper function
const validationResult = validateEntry(blogPostContentType, entry);
```

#### Upsert Mode

When creating or updating entries, use `upsert` mode to accept asset UIDs as strings:

```typescript
import { contentTypeToZod } from '@apexdevlabs/contentstack/schema';

// Upsert mode: assets are UID strings
const upsertSchema = contentTypeToZod(contentType, { mode: 'upsert' });
upsertSchema.parse({
  title: 'My Post',
  featured_image: 'asset123', // Just the UID
});

// Read mode (default): assets are full objects
const readSchema = contentTypeToZod(contentType, { mode: 'read' });
readSchema.parse({
  title: 'My Post',
  featured_image: { uid: 'asset123', url: 'https://...' },
});
```

#### Draft Validation

Validate incomplete entries with partial validation:

```typescript
import { contentTypeToDraftZod, validateDraft } from '@apexdevlabs/contentstack/schema';

const draftSchema = contentTypeToDraftZod(contentType);

// Valid even with missing required fields
draftSchema.parse({ title: 'Work in progress' });
```

### Entry to Markdown (`/markdown`)

Convert Contentstack entries to formatted Markdown.

```typescript
import { entryToMarkdown } from '@apexdevlabs/contentstack/markdown';

const markdown = entryToMarkdown(entry, contentType, {
  titleField: 'title',
  descriptionField: 'meta_description',
});

console.log(markdown);
```

#### Example Output

```markdown
# Sachin Tendulkar

> Profile of Sachin Tendulkar, legendary Indian cricketer.

**URL:** /sachin-tendulkar

---

## Personal Information

| Field | Value |
|-------|-------|
| **Full Name** | Sachin Ramesh Tendulkar |
| **Date of Birth** | April 24, 1973 |
| **Nationality** | India |
| **Height** | 165 |
| **Role** | Batsman |

---

## Teams

| Team Name | Team Type | Current Team |
|-----------|-----------|:------------:|
| India | National | No |
| Mumbai Indians | Franchise | No |

---

**Keywords:** `Sachin Tendulkar` · `cricket` · `India`
```

#### Options

```typescript
interface MarkdownOptions {
  /** Starting heading level (default: 1) */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  
  /** Custom date formatter */
  formatDate?: (isoDate: string) => string;
  
  /** Custom number formatter */
  formatNumber?: (num: number) => string;
  
  /** Skip empty fields (default: true) */
  skipEmpty?: boolean;
  
  /** Include system fields (default: false) */
  includeSystemFields?: boolean;
  
  /** Use tables for groups (default: true) */
  useTables?: boolean;
  
  /** Field to use as H1 title (default: 'title') */
  titleField?: string;
  
  /** Field to use as description blockquote (default: 'meta_description') */
  descriptionField?: string;
}
```

#### JSON RTE to Markdown

Convert JSON Rich Text Editor content to Markdown:

```typescript
import { jsonRteToMarkdown } from '@apexdevlabs/contentstack/markdown';

const jsonRte = {
  type: 'doc',
  children: [
    { type: 'h1', children: [{ text: 'Hello World' }] },
    { type: 'p', children: [{ text: 'This is ', bold: true }, { text: 'formatted text.' }] },
  ],
};

const markdown = jsonRteToMarkdown(jsonRte);
// # Hello World
// 
// **This is **formatted text.
```

### Shared Types

Import shared type definitions:

```typescript
import type {
  ContentstackContentType,
  ContentstackField,
  ContentstackBlock,
  ContentstackAsset,
  JsonRteDocument,
} from '@apexdevlabs/contentstack';
```

## Data Type Conversions

### Schema (Zod)

| Contentstack Type | Zod Schema |
|-------------------|------------|
| `text` | `z.string()` |
| `text` (enum) | `z.enum([...])` |
| `number` | `z.number()` |
| `boolean` | `z.boolean()` |
| `isodate` | `z.string()` with ISO validation |
| `file` | Asset object or UID string (upsert mode) |
| `link` | `{ title?, href? }` |
| `reference` | `{ uid, _content_type_uid? }` |
| `group` | Nested object schema |
| `blocks` | Union of block schemas |
| `json` (RTE) | JSON RTE document schema |
| `taxonomy` | Array of term objects |

### Markdown

| Contentstack Type | Markdown Output |
|-------------------|-----------------|
| `text` | Plain text |
| `text` (multiple) | `` `val1` · `val2` `` |
| `number` | Formatted (1,000 or 40M) |
| `boolean` | **Yes** / **No** |
| `isodate` | Human-readable (March 16, 2012) |
| `link` | `[title](href)` |
| `file` (image) | `![title](url)` |
| `file` (other) | `[filename](url)` |
| `group` | Table or nested headings |
| `blocks` | Sections with block titles |

## Migration from @apexdevlabs/contentstack-zod

If you were using the previous package:

```typescript
// Before
import { contentTypeToZod } from '@apexdevlabs/contentstack-zod';

// After
import { contentTypeToZod } from '@apexdevlabs/contentstack/schema';
```

## License

MIT
