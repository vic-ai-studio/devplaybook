# Markdown Cheat Sheet

---

## Headings

```markdown
# H1 — Page title (use once per page)
## H2 — Major sections
### H3 — Subsections
#### H4 — Sub-subsections
```

---

## Text Formatting

```markdown
**bold text**
*italic text*
***bold and italic***
~~strikethrough~~
`inline code`
> blockquote

<kbd>Ctrl</kbd>+<kbd>S</kbd>    keyboard keys (HTML in Markdown)

Horizontal rule:
---
```

---

## Links

```markdown
[Link text](https://example.com)
[Link with title](https://example.com "Tooltip text")
[Relative link](./other-file.md)
[Anchor link](#section-heading)

Reference-style:
[text][ref-id]
[ref-id]: https://example.com "Optional title"

Auto-link:
<https://example.com>
<email@example.com>
```

---

## Images

```markdown
![Alt text](image.png)
![Alt text](image.png "Optional title")
![Alt text][img-ref]
[img-ref]: image.png

<!-- Resize (HTML in Markdown) -->
<img src="image.png" width="400" alt="Alt text">
```

---

## Lists

```markdown
- Unordered item
- Another item
  - Nested item (2 spaces)
    - Deeper nested (4 spaces)

1. Ordered item
2. Second item
   1. Nested ordered
3. Third item (numbers auto-renumber)

- [ ] Unchecked task
- [x] Checked task
```

---

## Code

````markdown
`inline code`

```python
def hello():
    print("Hello, world!")
```

```bash
npm install
npm run dev
```

```json
{
  "key": "value"
}
```

```
No language (plain text)
```
````

---

## Tables

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

Column alignment:
| Left     | Center   | Right    |
|:---------|:--------:|---------:|
| Text     | Text     | Text     |
```

---

## Footnotes (GitHub Flavored)

```markdown
Here is a footnote[^1].
Another footnote[^note].

[^1]: The footnote content.
[^note]: Footnotes can have any label.
```

---

## HTML in Markdown

```markdown
<!-- Comments are hidden in rendered output -->

<details>
<summary>Click to expand</summary>

Content inside collapsible section.
Can include **Markdown** here.

</details>

<br>     <!-- line break -->

<!-- Centered text (not always supported) -->
<div align="center">Centered content</div>
```

---

## GitHub Flavored Markdown (GFM) Extras

```markdown
- [x] Task list item
- [ ] Unchecked item

Mentions: @username
Issue refs: #123
PR refs: #456
SHA: a5c3785

Emoji: :tada: :rocket: :white_check_mark:

~~strikethrough~~ (GFM only)

> [!NOTE]
> GitHub callout: NOTE, TIP, IMPORTANT, WARNING, CAUTION
```

---

## Escaping

```markdown
\*   escaped asterisk
\_   escaped underscore
\`   escaped backtick
\#   escaped hash
\-   escaped dash
\[   escaped bracket
\(   escaped paren
\\   escaped backslash
```

---

## Document Structure Template

```markdown
# Project Name

> One-line description.

## Overview

Brief explanation of what this is and who it's for.

## Quick Start

```bash
npm install
npm run dev
```

## Features

- Feature one
- Feature two
- Feature three

## Usage

### Basic Example

```javascript
const example = require('./example');
example.doSomething();
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `port` | `3000` | Server port |
| `debug` | `false` | Enable debug mode |

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/name`
3. Commit your changes
4. Open a PR

## License

MIT — see [LICENSE](LICENSE) for details.
```

---

*Developer Cheat Sheet Bundle v1.0 — DevPlaybook*
