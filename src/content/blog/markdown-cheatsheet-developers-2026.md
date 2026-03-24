---
title: "Markdown Cheatsheet for Developers 2026"
description: "Complete Markdown cheatsheet for developers: syntax reference, GitHub Flavored Markdown, tables, code blocks, task lists, and tools to write and preview Markdown faster."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["markdown", "cheatsheet", "developer-tools", "documentation", "github", "writing"]
readingTime: "8 min read"
---

Markdown is everywhere in the developer stack: README files, pull request descriptions, GitHub issues, documentation sites, Notion, Slack, Discord, blog posts. Learning it properly—not just the basics—saves real time every day.

This cheatsheet covers the full syntax you'll encounter as a developer, including GitHub Flavored Markdown (GFM) extensions that most developers use without realizing they're non-standard.

For a live preview as you write, use the [Markdown preview tool](/tools/markdown-preview)—paste or type Markdown and see the rendered output instantly.

---

## Headings

```markdown
# H1 — Page title
## H2 — Major section
### H3 — Subsection
#### H4 — Minor subsection
##### H5
###### H6
```

A blank line before and after headings improves readability and avoids parser edge cases.

---

## Text Formatting

```markdown
**bold text**
*italic text*
***bold and italic***
~~strikethrough~~
`inline code`
```

Renders as: **bold**, *italic*, ***bold and italic***, ~~strikethrough~~, `inline code`.

For underline: Markdown doesn't have a native underline syntax. Use `<u>underlined</u>` if your renderer supports HTML.

---

## Links and Images

```markdown
[Link text](https://example.com)
[Link with title](https://example.com "Hover title")
[Reference link][ref-id]

[ref-id]: https://example.com

![Alt text](image.png)
![Alt text](image.png "Image title")
```

For links to headings within the same document:

```markdown
[Jump to section](#section-name)
```

Heading IDs are auto-generated: lowercase, spaces replaced with hyphens, special characters removed.

---

## Lists

```markdown
- Unordered item
- Another item
  - Nested item (2 spaces)
    - Deeper nesting (4 spaces)

1. Ordered item
2. Second item
   1. Nested ordered (3 spaces)
3. Third item
```

You can mix ordered and unordered lists by nesting them:

```markdown
1. Step one
   - Sub-task A
   - Sub-task B
2. Step two
```

---

## Task Lists (GitHub Flavored Markdown)

```markdown
- [x] Completed task
- [ ] Incomplete task
- [x] Another done item
- [ ] Pending item
```

Task lists render as checkboxes in GitHub issues, PRs, and README files. On GitHub, you can click them to toggle status.

---

## Code Blocks

Inline code uses single backticks: `` `code here` ``

Fenced code blocks use triple backticks with an optional language identifier:

````markdown
```javascript
const greet = (name) => `Hello, ${name}!`;
console.log(greet("World"));
```

```python
def greet(name):
    return f"Hello, {name}!"
```

```bash
npm install && npm run dev
```
````

Supported language identifiers: `javascript`, `typescript`, `python`, `bash`, `shell`, `sql`, `json`, `yaml`, `html`, `css`, `go`, `rust`, `java`, `csharp`, `php`, `ruby`, `swift`, `kotlin`, `diff`, `markdown`.

---

## Tables (GitHub Flavored Markdown)

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data     | More     |
| Row 2    | Data     | More     |
```

Column alignment:

```markdown
| Left    | Center  | Right   |
|:--------|:-------:|--------:|
| Left    | Center  | Right   |
| aligned | aligned | aligned |
```

- `:---` — Left aligned (default)
- `:---:` — Center aligned
- `---:` — Right aligned

---

## Blockquotes

```markdown
> This is a blockquote.
> It can span multiple lines.

> Blockquotes can be nested.
>> Like this.
>>> And deeper.
```

Useful for quoting documentation, error messages, or highlighting important notes.

---

## Horizontal Rule

```markdown
---
***
___
```

All three produce a horizontal divider. Three or more hyphens, asterisks, or underscores.

---

## Escaping

To render a literal Markdown character, escape it with a backslash:

```markdown
\*not italic\*
\# not a heading
\[not a link\]
\`not code\`
```

---

## HTML in Markdown

Most Markdown renderers support inline HTML:

```markdown
<details>
<summary>Click to expand</summary>

Hidden content goes here. Supports full Markdown inside.

</details>

<kbd>Ctrl</kbd> + <kbd>C</kbd>

<br> for line breaks
```

The `<details>` + `<summary>` pattern is especially useful in GitHub READMEs for collapsible sections.

---

## Footnotes (GitHub Flavored Markdown)

```markdown
Text with a footnote[^1].

[^1]: This is the footnote content.
```

---

## Emoji (GitHub Flavored Markdown)

```markdown
:rocket: :tada: :white_check_mark: :warning: :x:
```

GitHub converts these shortcodes to emoji. Full list: [github.com/ikatyang/emoji-cheat-sheet](https://github.com/ikatyang/emoji-cheat-sheet).

---

## Alerts / Callouts (GitHub Flavored Markdown, 2023+)

```markdown
> [!NOTE]
> This is a note callout.

> [!TIP]
> This is a tip.

> [!WARNING]
> This is a warning.

> [!IMPORTANT]
> This is important.

> [!CAUTION]
> This is a caution.
```

These render as styled callout boxes in GitHub. Supported: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`.

---

## Writing Better READMEs

A good README has:

1. **Project name and one-line description** — What is it?
2. **Quick start** — How do I run it in under 5 minutes?
3. **Usage examples** — What does it actually do?
4. **Configuration reference** — What can I change?
5. **Contributing guide** — How do I help?
6. **License** — Can I use this?

The [README generator](/tools/readme-generator) produces a structured README template for any project. Fill in your project details and get a well-organized README with all the standard sections.

---

## Tools for Faster Markdown Writing

- **[Markdown preview](/tools/markdown-preview)** — Live preview as you type. See rendering differences between CommonMark and GFM.
- **[README generator](/tools/readme-generator)** — Generate a complete README structure from project metadata.
- **[HTML to Markdown](/tools/html-to-markdown)** — Convert HTML content to Markdown. Useful when migrating documentation or pasting from web pages.
- **[Word counter](/tools/word-counter)** — Check length when writing documentation with word-count targets.

---

## Quick Reference Card

| Syntax | Output |
|--------|--------|
| `**text**` | **bold** |
| `*text*` | *italic* |
| `` `code` `` | `inline code` |
| `~~text~~` | ~~strikethrough~~ |
| `[text](url)` | link |
| `![alt](url)` | image |
| `# H1` through `###### H6` | headings |
| `---` | horizontal rule |
| `> text` | blockquote |
| `- item` | unordered list |
| `1. item` | ordered list |
| `- [x] item` | task (checked) |
| `- [ ] item` | task (unchecked) |

Markdown's strength is that it's readable even as raw text. Write it thinking about how it looks in both the source file and the rendered output—the best Markdown reads naturally in both.
