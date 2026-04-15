import re, glob

NEWLINE_EXPR = '{"\\n"}'
OPEN_BRACE_EXPR = '{"{"}'
CLOSE_BRACE_EXPR = '{"}"}'

files = glob.glob('src/pages/tools/*.astro')
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()

    original = content

    def fix_pre(match):
        full = match.group(0)
        m = re.match(r'(<pre[^>]*>)(.*?)(</pre>)', full, re.DOTALL)
        if not m:
            return full
        tag_open, inner, tag_close = m.group(1), m.group(2), m.group(3)

        has_expr = NEWLINE_EXPR in inner or OPEN_BRACE_EXPR in inner or CLOSE_BRACE_EXPR in inner

        if not has_expr:
            return full

        # Already fixed
        if inner.strip().startswith('{`'):
            return full

        new_inner = inner
        new_inner = new_inner.replace(NEWLINE_EXPR, '\\n')
        new_inner = new_inner.replace(OPEN_BRACE_EXPR, '{')
        new_inner = new_inner.replace(CLOSE_BRACE_EXPR, '}')

        # Escape backticks
        new_inner = new_inner.replace('`', '\\`')
        # Escape dollar-brace (template literal expressions)
        new_inner = new_inner.replace('${', '\\${')

        return tag_open + '{`' + new_inner + '`}' + tag_close

    content = re.sub(r'<pre[^>]*>.*?</pre>', fix_pre, content, flags=re.DOTALL)

    if content != original:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(content)
        print(f'Fixed: {f}')

print('Done')
