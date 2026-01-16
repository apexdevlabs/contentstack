import { describe, it, expect } from "vitest";
import {
  entryToMarkdown,
  jsonRteToMarkdown,
  formatDateHuman,
  formatNumberWithCommas,
} from "./index";
import type { ContentstackContentType } from "../types";

describe("formatDateHuman", () => {
  it("should format ISO date to human-readable", () => {
    expect(formatDateHuman("2012-03-16")).toBe("March 16, 2012");
    expect(formatDateHuman("1973-04-24")).toBe("April 24, 1973");
  });

  it("should handle datetime format", () => {
    expect(formatDateHuman("2012-03-16T00:00:00.000Z")).toBe("March 16, 2012");
  });

  it("should return original string for invalid dates", () => {
    expect(formatDateHuman("invalid")).toBe("invalid");
  });
});

describe("formatNumberWithCommas", () => {
  it("should format numbers with commas", () => {
    expect(formatNumberWithCommas(1000)).toBe("1,000");
    expect(formatNumberWithCommas(15921)).toBe("15,921");
  });

  it("should abbreviate millions", () => {
    expect(formatNumberWithCommas(40000000)).toBe("40M");
    expect(formatNumberWithCommas(1500000)).toBe("1.5M");
  });

  it("should abbreviate billions", () => {
    expect(formatNumberWithCommas(1000000000)).toBe("1B");
  });
});

describe("jsonRteToMarkdown", () => {
  it("should convert simple paragraph", () => {
    const rte = {
      type: "doc" as const,
      children: [
        { type: "p", children: [{ text: "Hello world" }] },
      ],
    };

    expect(jsonRteToMarkdown(rte).trim()).toBe("Hello world");
  });

  it("should convert bold text", () => {
    const rte = {
      type: "doc" as const,
      children: [
        { type: "p", children: [{ text: "Hello ", bold: true }] },
      ],
    };

    expect(jsonRteToMarkdown(rte)).toContain("**Hello **");
  });

  it("should convert italic text", () => {
    const rte = {
      type: "doc" as const,
      children: [
        { type: "p", children: [{ text: "Hello", italic: true }] },
      ],
    };

    expect(jsonRteToMarkdown(rte)).toContain("*Hello*");
  });

  it("should convert headings", () => {
    const rte = {
      type: "doc" as const,
      children: [
        { type: "h1", children: [{ text: "Title" }] },
        { type: "h2", children: [{ text: "Subtitle" }] },
      ],
    };

    const md = jsonRteToMarkdown(rte);
    expect(md).toContain("# Title");
    expect(md).toContain("## Subtitle");
  });

  it("should convert blockquotes", () => {
    const rte = {
      type: "doc" as const,
      children: [
        { type: "blockquote", children: [{ text: "Quote text" }] },
      ],
    };

    expect(jsonRteToMarkdown(rte)).toContain("> Quote text");
  });

  it("should convert unordered lists", () => {
    const rte = {
      type: "doc" as const,
      children: [
        {
          type: "ul",
          children: [
            { type: "li", children: [{ text: "Item 1" }] },
            { type: "li", children: [{ text: "Item 2" }] },
          ],
        },
      ],
    };

    const md = jsonRteToMarkdown(rte);
    expect(md).toContain("- Item 1");
    expect(md).toContain("- Item 2");
  });

  it("should convert ordered lists", () => {
    const rte = {
      type: "doc" as const,
      children: [
        {
          type: "ol",
          children: [
            { type: "li", children: [{ text: "First" }] },
            { type: "li", children: [{ text: "Second" }] },
          ],
        },
      ],
    };

    const md = jsonRteToMarkdown(rte);
    expect(md).toContain("1. First");
    expect(md).toContain("2. Second");
  });

  it("should convert links", () => {
    const rte = {
      type: "doc" as const,
      children: [
        {
          type: "p",
          children: [
            {
              type: "a",
              attrs: { url: "https://example.com" },
              children: [{ text: "Click here" }],
            },
          ],
        },
      ],
    };

    expect(jsonRteToMarkdown(rte)).toContain("[Click here](https://example.com)");
  });

  it("should convert code blocks", () => {
    const rte = {
      type: "doc" as const,
      children: [
        {
          type: "code_block",
          attrs: { language: "javascript" },
          children: [{ text: "const x = 1;" }],
        },
      ],
    };

    const md = jsonRteToMarkdown(rte);
    expect(md).toContain("```javascript");
    expect(md).toContain("const x = 1;");
    expect(md).toContain("```");
  });

  it("should convert horizontal rules", () => {
    const rte = {
      type: "doc" as const,
      children: [{ type: "hr" }],
    };

    expect(jsonRteToMarkdown(rte)).toContain("---");
  });
});

describe("entryToMarkdown", () => {
  it("should convert simple entry with title", () => {
    const contentType: ContentstackContentType = {
      uid: "article",
      schema: [
        { uid: "title", data_type: "text", display_name: "Title", mandatory: true },
        { uid: "body", data_type: "text", display_name: "Body", mandatory: true },
      ],
    };

    const entry = {
      title: "Hello World",
      body: "This is the content.",
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain("# Hello World");
    expect(md).toContain("**Body:** This is the content.");
  });

  it("should use meta_description as blockquote", () => {
    const contentType: ContentstackContentType = {
      uid: "article",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        { uid: "meta_description", data_type: "text", mandatory: false },
      ],
    };

    const entry = {
      title: "My Post",
      meta_description: "A great article about coding.",
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain("# My Post");
    expect(md).toContain("> A great article about coding.");
  });

  it("should format dates as human-readable", () => {
    const contentType: ContentstackContentType = {
      uid: "event",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        { uid: "event_date", data_type: "isodate", display_name: "Event Date", mandatory: true },
      ],
    };

    const entry = {
      title: "Conference",
      event_date: "2024-03-15",
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain("March 15, 2024");
  });

  it("should format numbers with commas", () => {
    const contentType: ContentstackContentType = {
      uid: "stats",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        { uid: "followers", data_type: "number", display_name: "Followers", mandatory: true },
      ],
    };

    const entry = {
      title: "Profile",
      followers: 40000000,
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain("40M");
  });

  it("should render booleans as Yes/No", () => {
    const contentType: ContentstackContentType = {
      uid: "item",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        { uid: "active", data_type: "boolean", display_name: "Active", mandatory: true },
      ],
    };

    const entry = {
      title: "Item",
      active: true,
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain("**Yes**");
  });

  it("should render links properly", () => {
    const contentType: ContentstackContentType = {
      uid: "profile",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        { uid: "website", data_type: "link", display_name: "Website", mandatory: false },
      ],
    };

    const entry = {
      title: "Company",
      website: { title: "Visit Us", href: "https://example.com" },
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain("[Visit Us](https://example.com)");
  });

  it("should render images from file fields", () => {
    const contentType: ContentstackContentType = {
      uid: "article",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        { uid: "image", data_type: "file", display_name: "Image", mandatory: false },
      ],
    };

    const entry = {
      title: "Post",
      image: {
        uid: "asset123",
        url: "https://example.com/image.png",
        title: "Cover Image",
        content_type: "image/png",
      },
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain("![Cover Image](https://example.com/image.png)");
  });

  it("should render groups as tables when useTables is true", () => {
    const contentType: ContentstackContentType = {
      uid: "profile",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        {
          uid: "info",
          data_type: "group",
          display_name: "Info",
          mandatory: false,
          schema: [
            { uid: "name", data_type: "text", display_name: "Name", mandatory: true },
            { uid: "age", data_type: "number", display_name: "Age", mandatory: false },
          ],
        },
      ],
    };

    const entry = {
      title: "Person",
      info: {
        name: "John Doe",
        age: 30,
      },
    };

    const md = entryToMarkdown(entry, contentType, { useTables: true });
    expect(md).toContain("## Info");
    expect(md).toContain("| Field | Value |");
    expect(md).toContain("**Name**");
    expect(md).toContain("John Doe");
  });

  it("should render repeatable groups as tables", () => {
    const contentType: ContentstackContentType = {
      uid: "team",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        {
          uid: "members",
          data_type: "group",
          display_name: "Members",
          mandatory: false,
          multiple: true,
          schema: [
            { uid: "name", data_type: "text", display_name: "Name", mandatory: true },
            { uid: "role", data_type: "text", display_name: "Role", mandatory: false },
          ],
        },
      ],
    };

    const entry = {
      title: "Team",
      members: [
        { name: "Alice", role: "Developer" },
        { name: "Bob", role: "Designer" },
      ],
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain("## Members");
    expect(md).toContain("| Name | Role |");
    expect(md).toContain("Alice");
    expect(md).toContain("Developer");
  });

  it("should render modular blocks", () => {
    const contentType: ContentstackContentType = {
      uid: "page",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        {
          uid: "blocks",
          data_type: "blocks",
          display_name: "Content Blocks",
          mandatory: false,
          blocks: [
            {
              uid: "text_block",
              title: "Text Block",
              schema: [
                { uid: "heading", data_type: "text", display_name: "Heading", mandatory: true },
                { uid: "content", data_type: "text", display_name: "Content", mandatory: false },
              ],
            },
          ],
        },
      ],
    };

    const entry = {
      title: "My Page",
      blocks: [
        {
          text_block: {
            heading: "Welcome",
            content: "This is the welcome section.",
          },
        },
      ],
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain("## Content Blocks");
    expect(md).toContain("Text Block: Welcome");
    expect(md).toContain("This is the welcome section.");
  });

  it("should render quote blocks specially", () => {
    const contentType: ContentstackContentType = {
      uid: "page",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        {
          uid: "content",
          data_type: "blocks",
          display_name: "Content",
          mandatory: false,
          blocks: [
            {
              uid: "quote",
              title: "Quote",
              schema: [
                { uid: "quote_text", data_type: "text", display_name: "Quote", mandatory: true },
                { uid: "attribution", data_type: "text", display_name: "Attribution", mandatory: false },
              ],
            },
          ],
        },
      ],
    };

    const entry = {
      title: "Quotes",
      content: [
        {
          quote: {
            quote_text: "The only way to do great work is to love what you do.",
            attribution: "Steve Jobs",
          },
        },
      ],
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain('> *"The only way to do great work is to love what you do."*');
    expect(md).toContain("— **Steve Jobs**");
  });

  it("should skip empty fields when skipEmpty is true", () => {
    const contentType: ContentstackContentType = {
      uid: "article",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        { uid: "subtitle", data_type: "text", display_name: "Subtitle", mandatory: false },
        { uid: "body", data_type: "text", display_name: "Body", mandatory: true },
      ],
    };

    const entry = {
      title: "Post",
      subtitle: null,
      body: "Content here",
    };

    const md = entryToMarkdown(entry, contentType, { skipEmpty: true });
    expect(md).not.toContain("Subtitle");
    expect(md).toContain("**Body:** Content here");
  });

  it("should skip system fields by default", () => {
    const contentType: ContentstackContentType = {
      uid: "article",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
      ],
    };

    const entry = {
      title: "Post",
      uid: "entry123",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      _version: 1,
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).not.toContain("entry123");
    expect(md).not.toContain("_version");
  });

  it("should render multiple text as inline with separator", () => {
    const contentType: ContentstackContentType = {
      uid: "article",
      schema: [
        { uid: "title", data_type: "text", mandatory: true },
        { uid: "keywords", data_type: "text", display_name: "Keywords", mandatory: false, multiple: true },
      ],
    };

    const entry = {
      title: "Post",
      keywords: ["react", "typescript", "coding"],
    };

    const md = entryToMarkdown(entry, contentType);
    expect(md).toContain("`react`");
    expect(md).toContain("`typescript`");
    expect(md).toContain("·");
  });
});

describe("entryToMarkdown - Cricketer Profile", () => {
  const cricketerContentType: ContentstackContentType = {
    uid: "cricketer_profile",
    schema: [
      { uid: "title", data_type: "text", display_name: "Title", mandatory: true },
      { uid: "url", data_type: "text", display_name: "URL", mandatory: true },
      { uid: "meta_description", data_type: "text", display_name: "Meta Description", mandatory: false },
      {
        uid: "personal_information",
        data_type: "group",
        display_name: "Personal Information",
        mandatory: false,
        schema: [
          { uid: "full_name", data_type: "text", display_name: "Full Name", mandatory: true },
          { uid: "date_of_birth", data_type: "isodate", display_name: "Date of Birth", mandatory: false },
          { uid: "nationality", data_type: "text", display_name: "Nationality", mandatory: false },
          { uid: "height", data_type: "number", display_name: "Height", mandatory: false },
          { uid: "role", data_type: "text", display_name: "Role", mandatory: false },
        ],
      },
      {
        uid: "teams",
        data_type: "group",
        display_name: "Teams",
        mandatory: false,
        multiple: true,
        schema: [
          { uid: "team_name", data_type: "text", display_name: "Team Name", mandatory: true },
          { uid: "team_type", data_type: "text", display_name: "Team Type", mandatory: false },
          { uid: "current_team", data_type: "boolean", display_name: "Current Team", mandatory: false },
        ],
      },
      {
        uid: "social_media",
        data_type: "group",
        display_name: "Social Media",
        mandatory: false,
        multiple: true,
        schema: [
          { uid: "platform", data_type: "text", display_name: "Platform", mandatory: false },
          { uid: "handle", data_type: "text", display_name: "Handle", mandatory: false },
          { uid: "profile_url", data_type: "link", display_name: "Profile URL", mandatory: false },
          { uid: "followers_count", data_type: "number", display_name: "Followers Count", mandatory: false },
        ],
      },
      { uid: "keywords", data_type: "text", display_name: "Keywords", mandatory: false, multiple: true },
    ],
  };

  const cricketerEntry = {
    title: "Sachin Tendulkar",
    url: "/sachin-tendulkar",
    meta_description: "Profile of Sachin Tendulkar, legendary Indian cricketer.",
    personal_information: {
      full_name: "Sachin Ramesh Tendulkar",
      date_of_birth: "1973-04-24",
      nationality: "India",
      height: 165,
      role: "Batsman",
    },
    teams: [
      { team_name: "India", team_type: "National", current_team: false },
      { team_name: "Mumbai Indians", team_type: "Franchise", current_team: false },
    ],
    social_media: [
      {
        platform: "Twitter",
        handle: "sachin_rt",
        profile_url: { title: "Twitter", href: "https://twitter.com/sachin_rt" },
        followers_count: 40000000,
      },
    ],
    keywords: ["Sachin Tendulkar", "cricket", "India"],
  };

  it("should render title as H1", () => {
    const md = entryToMarkdown(cricketerEntry, cricketerContentType);
    expect(md).toContain("# Sachin Tendulkar");
  });

  it("should render meta_description as blockquote", () => {
    const md = entryToMarkdown(cricketerEntry, cricketerContentType);
    expect(md).toContain("> Profile of Sachin Tendulkar, legendary Indian cricketer.");
  });

  it("should render personal_information as table", () => {
    const md = entryToMarkdown(cricketerEntry, cricketerContentType);
    expect(md).toContain("## Personal Information");
    expect(md).toContain("| Field | Value |");
    expect(md).toContain("Sachin Ramesh Tendulkar");
    expect(md).toContain("April 24, 1973");
  });

  it("should render teams as table", () => {
    const md = entryToMarkdown(cricketerEntry, cricketerContentType);
    expect(md).toContain("## Teams");
    expect(md).toContain("| Team Name | Team Type | Current Team |");
    expect(md).toContain("India");
    expect(md).toContain("Mumbai Indians");
  });

  it("should render social_media with links", () => {
    const md = entryToMarkdown(cricketerEntry, cricketerContentType);
    expect(md).toContain("## Social Media");
    expect(md).toContain("Twitter");
    expect(md).toContain("[Twitter](https://twitter.com/sachin_rt)");
    expect(md).toContain("40M");
  });

  it("should render keywords inline", () => {
    const md = entryToMarkdown(cricketerEntry, cricketerContentType);
    expect(md).toContain("**Keywords:**");
    expect(md).toContain("`Sachin Tendulkar`");
    expect(md).toContain("`cricket`");
  });
});
