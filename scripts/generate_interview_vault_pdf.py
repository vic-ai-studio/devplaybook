#!/usr/bin/env python3
"""
Generate PDF versions of Interview Vault markdown files.
Supports both EN (Helvetica) and zh-TW (CJK STSong-Light) content.
"""

import re
import sys
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Preformatted,
    HRFlowable, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont

# Register CJK font for zh-TW
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))

BRAND_DARK = HexColor('#0f172a')
BRAND_ACCENT = HexColor('#6366f1')
BRAND_GRAY = HexColor('#64748b')
BRAND_LIGHT = HexColor('#f1f5f9')
CODE_BG = HexColor('#1e293b')
CODE_FG = HexColor('#e2e8f0')

PAGE_WIDTH, PAGE_HEIGHT = A4


def make_styles(is_cjk=False):
    base_font = 'STSong-Light' if is_cjk else 'Helvetica'
    base_font_bold = 'STSong-Light' if is_cjk else 'Helvetica-Bold'

    styles = {}

    styles['title'] = ParagraphStyle(
        'title', fontName=base_font_bold, fontSize=24,
        textColor=BRAND_DARK, spaceAfter=6, spaceBefore=0,
        leading=30
    )
    styles['subtitle'] = ParagraphStyle(
        'subtitle', fontName=base_font, fontSize=13,
        textColor=BRAND_GRAY, spaceAfter=20, leading=18
    )
    styles['h1'] = ParagraphStyle(
        'h1', fontName=base_font_bold, fontSize=18,
        textColor=BRAND_ACCENT, spaceBefore=20, spaceAfter=8, leading=24
    )
    styles['h2'] = ParagraphStyle(
        'h2', fontName=base_font_bold, fontSize=14,
        textColor=BRAND_DARK, spaceBefore=14, spaceAfter=6, leading=20
    )
    styles['h3'] = ParagraphStyle(
        'h3', fontName=base_font_bold, fontSize=12,
        textColor=BRAND_DARK, spaceBefore=10, spaceAfter=4, leading=16
    )
    styles['body'] = ParagraphStyle(
        'body', fontName=base_font, fontSize=10,
        textColor=black, spaceAfter=6, leading=15
    )
    styles['bullet'] = ParagraphStyle(
        'bullet', fontName=base_font, fontSize=10,
        textColor=black, spaceAfter=3, leading=15,
        leftIndent=20, bulletIndent=10
    )
    styles['code'] = ParagraphStyle(
        'code', fontName='Courier', fontSize=8,
        textColor=CODE_FG, backColor=CODE_BG,
        spaceAfter=8, spaceBefore=4, leading=12,
        leftIndent=10, rightIndent=10
    )
    styles['label'] = ParagraphStyle(
        'label', fontName=base_font_bold, fontSize=9,
        textColor=BRAND_ACCENT, spaceAfter=2, leading=12
    )

    return styles


def escape_xml(text):
    """Escape text for safe XML/reportlab use."""
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    return text


def clean_inline(text):
    """Convert inline markdown to reportlab XML markup."""
    # First extract inline code to protect its content from HTML tags
    # Replace `code` with a placeholder, escape its content, then restore
    code_spans = []

    def extract_code(m):
        idx = len(code_spans)
        # Escape the code content so HTML tags and markdown symbols inside are safe
        safe = escape_xml(m.group(1)).replace('*', '&#42;').replace('_', '&#95;')
        code_spans.append(f'<font name="Courier" size="9">{safe}</font>')
        return f'\x00CODE{idx}\x00'

    text = re.sub(r'`([^`]+)`', extract_code, text)

    # Now escape remaining text (outside code spans)
    parts = text.split('\x00')
    escaped_parts = []
    for part in parts:
        if part.startswith('CODE') and part[4:].isdigit():
            escaped_parts.append(code_spans[int(part[4:])])
        else:
            escaped_parts.append(escape_xml(part))
    text = ''.join(escaped_parts)

    # Bold **text** (on already-escaped text, so no HTML tags inside)
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    # Italic *text*
    text = re.sub(r'\*((?!\*)[^*]*)\*', r'<i>\1</i>', text)

    return text


def parse_md_to_story(md_text, styles, is_cjk=False):
    story = []
    lines = md_text.split('\n')
    i = 0
    in_code_block = False
    code_lines = []

    while i < len(lines):
        line = lines[i]

        # Code block detection
        if line.strip().startswith('```'):
            if not in_code_block:
                in_code_block = True
                code_lines = []
                i += 1
                continue
            else:
                in_code_block = False
                code_text = '\n'.join(code_lines)
                # Truncate very long code blocks
                if len(code_text) > 1500:
                    code_text = code_text[:1500] + '\n... (truncated)'
                story.append(Preformatted(code_text, styles['code']))
                story.append(Spacer(1, 4))
                i += 1
                continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # Skip empty lines
        if not line.strip():
            story.append(Spacer(1, 4))
            i += 1
            continue

        # H1
        if line.startswith('# '):
            text = clean_inline(line[2:].strip())
            story.append(Paragraph(text, styles['h1']))
            story.append(HRFlowable(width='100%', thickness=1,
                                     color=BRAND_ACCENT, spaceAfter=4))
            i += 1
            continue

        # H2
        if line.startswith('## '):
            text = clean_inline(line[3:].strip())
            story.append(Paragraph(text, styles['h2']))
            i += 1
            continue

        # H3
        if line.startswith('### '):
            text = clean_inline(line[4:].strip())
            story.append(Paragraph(text, styles['h3']))
            i += 1
            continue

        # H4+
        if line.startswith('#### ') or line.startswith('##### '):
            text = clean_inline(re.sub(r'^#{4,6}\s+', '', line).strip())
            story.append(Paragraph(f'<b>{text}</b>', styles['body']))
            i += 1
            continue

        # Bullet list
        if line.startswith('- ') or line.startswith('* '):
            text = clean_inline(line[2:].strip())
            story.append(Paragraph(f'• {text}', styles['bullet']))
            i += 1
            continue

        # Numbered list
        if re.match(r'^\d+\.\s', line):
            text = clean_inline(re.sub(r'^\d+\.\s+', '', line).strip())
            num = re.match(r'^(\d+)\.', line).group(1)
            story.append(Paragraph(f'{num}. {text}', styles['bullet']))
            i += 1
            continue

        # Horizontal rule
        if line.strip() in ('---', '***', '___'):
            story.append(HRFlowable(width='100%', thickness=0.5,
                                     color=BRAND_GRAY, spaceAfter=6, spaceBefore=6))
            i += 1
            continue

        # Regular paragraph
        text = clean_inline(line.strip())
        if text:
            story.append(Paragraph(text, styles['body']))
        i += 1

    return story


def add_cover_page(story, title, subtitle, styles):
    story.append(Spacer(1, 4 * cm))
    story.append(Paragraph('DevPlaybook', styles['subtitle']))
    story.append(Paragraph(title, styles['title']))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(subtitle, styles['subtitle']))
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width='100%', thickness=2, color=BRAND_ACCENT))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(
        'devplaybook.cc | Interview Vault 2026',
        styles['subtitle']
    ))
    story.append(PageBreak())


def generate_pdf(md_path: Path, output_path: Path, title: str, subtitle: str, is_cjk=False):
    print(f'Generating PDF: {output_path.name} ...')
    styles = make_styles(is_cjk=is_cjk)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=title,
        author='DevPlaybook',
        subject='Technical Interview Preparation',
    )

    story = []
    add_cover_page(story, title, subtitle, styles)

    md_text = md_path.read_text(encoding='utf-8')
    story.extend(parse_md_to_story(md_text, styles, is_cjk=is_cjk))

    doc.build(story)
    size_kb = output_path.stat().st_size // 1024
    print(f'  ✓ {output_path.name} ({size_kb} KB)')


def main():
    base = Path('C:/OpenClaw_Pro/devplaybook/products/interview-vault')
    pdf_dir = base / 'pdf'
    pdf_dir.mkdir(exist_ok=True)

    topics = [
        ('frontend', 'Frontend Interview Questions', '55 Questions — HTML/CSS, JavaScript, React, TypeScript'),
        ('backend', 'Backend Interview Questions', '55 Questions — REST API, Node.js, Databases, Authentication'),
        ('system-design', 'System Design Interview Questions', '50 Questions — URL Shortener, Twitter, YouTube, Uber & More'),
        ('dsa', 'Data Structures & Algorithms', '50 Questions — Arrays, Trees, Graphs, Dynamic Programming'),
    ]

    # EN PDFs
    for slug, title, subtitle in topics:
        md_path = base / 'en' / f'{slug}.md'
        if md_path.exists():
            out = pdf_dir / f'en_{slug}.pdf'
            generate_pdf(md_path, out, title, subtitle, is_cjk=False)

    # ZH-TW PDFs
    subtitles_tw = {
        'frontend': '55 題 — HTML/CSS、JavaScript、React、TypeScript',
        'backend': '55 題 — REST API、Node.js、資料庫、認證機制',
        'system-design': '50 題 — URL 縮短器、Twitter、YouTube、Uber 等系統設計',
        'dsa': '50 題 — 陣列、樹、圖、動態規劃',
    }
    titles_tw = {
        'frontend': '前端面試題目',
        'backend': '後端面試題目',
        'system-design': '系統設計面試題目',
        'dsa': '演算法與資料結構',
    }
    for slug, _, _ in topics:
        md_path = base / 'zh-TW' / f'{slug}.md'
        if md_path.exists():
            out = pdf_dir / f'zh-TW_{slug}.pdf'
            generate_pdf(md_path, out, titles_tw[slug], subtitles_tw[slug], is_cjk=True)

    print('\nAll PDFs generated in:', pdf_dir)
    return pdf_dir


if __name__ == '__main__':
    main()
