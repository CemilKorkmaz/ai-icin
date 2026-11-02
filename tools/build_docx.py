#!/usr/bin/env python3
"""Tüm plan dokümanlarını tek bir Word (.docx) dosyasına dönüştürür.

Sohbetin sonundaki istek: "en son tüm işlevleri bi worde döküp yapay zekaya atıp
genel yazılım altyapı şemasını oluşturucaz". Bu script o Word dosyasını üretir.

Harici kütüphane YOKTUR — .docx (OOXML zip) doğrudan standart kütüphane ile yazılır.

Kullanım: python3 tools/build_docx.py
"""
from __future__ import annotations

import datetime as dt
import html
import os
import re
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')
OUT = os.path.join(DOCS, 'Dokumhane-ERP-Plan.docx')

FILES = [
    ('00-ham-gereksinimler.md', 'EK A — Ham Gereksinimler (Sohbet Kaydı)'),
    ('01-uctan-uca-surec-raporu.md', 'BÖLÜM 1 — Uçtan Uca Süreç Tanım Raporu'),
    ('02-faz1-plan.md', 'BÖLÜM 2 — Faz 1: Satın Alma & Hammadde / Stok'),
    ('03-ana-plan-dokumani.md', 'BÖLÜM 3 — Ana Plan Dokümanı'),
    ('04-teknik-mimari-kararlar.md', 'BÖLÜM 4 — Teknik Mimari Kararları'),
    ('05-veri-modeli-ve-ekranlar.md', 'BÖLÜM 5 — Veri Modeli ve Ekran Envanteri'),
]

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'


def esc(s: str) -> str:
    return html.escape(s, quote=False)


def runs(text: str, italic: bool = False) -> str:
    """Basit inline markdown: **kalın**, `kod`, [etiket](url)."""
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1 (\2)', text)
    parts = re.split(r'(\*\*[^*]+\*\*|`[^`]+`)', text)
    out = []
    for part in parts:
        if not part:
            continue
        bold = part.startswith('**') and part.endswith('**')
        code = part.startswith('`') and part.endswith('`')
        content = part[2:-1] if bold else part[1:-1] if code else part
        props = ''
        if bold:
            props += '<w:b/>'
        if italic:
            props += '<w:i/>'
        if code:
            props += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:color w:val="4338CA"/>'
        out.append(f'<w:r>{(f"<w:rPr>{props}</w:rPr>" if props else "")}'
                   f'<w:t xml:space="preserve">{esc(content)}</w:t></w:r>')
    return ''.join(out) or '<w:r><w:t xml:space="preserve"> </w:t></w:r>'


def para(text: str, style: str = 'Normal', indent: int = 0, italic: bool = False) -> str:
    ppr = f'<w:pStyle w:val="{style}"/>'
    if indent:
        ppr += f'<w:ind w:left="{indent}"/>'
    return f'<w:p><w:pPr>{ppr}</w:pPr>{runs(text, italic)}</w:p>'


def page_break() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def table_xml(rows: list[list[str]]) -> str:
    if not rows:
        return ''
    cols = max(len(r) for r in rows)
    width = 9360 // cols
    grid = ''.join(f'<w:gridCol w:w="{width}"/>' for _ in range(cols))
    out = [f'<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders>'
           '<w:top w:val="single" w:sz="4" w:color="D8DFEB"/>'
           '<w:bottom w:val="single" w:sz="4" w:color="D8DFEB"/>'
           '<w:insideH w:val="single" w:sz="4" w:color="E6EAF2"/>'
           '<w:insideV w:val="single" w:sz="4" w:color="E6EAF2"/>'
           '</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/>'
           '<w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr>'
           f'<w:tblGrid>{grid}</w:tblGrid>']
    for ri, row in enumerate(rows):
        out.append('<w:tr>')
        for ci in range(cols):
            cell = row[ci] if ci < len(row) else ''
            shade = '<w:shd w:val="clear" w:fill="EEF2FF"/>' if ri == 0 else ''
            out.append(f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>{shade}</w:tcPr>')
            if ri == 0:
                out.append(f'<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{esc(cell)}</w:t></w:r></w:p>')
            else:
                out.append(f'<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>{runs(cell)}</w:p>')
            out.append('</w:tc>')
        out.append('</w:tr>')
    out.append('</w:tbl><w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>')
    return ''.join(out)


def is_separator(line: str) -> bool:
    return bool(re.fullmatch(r'\|[\s:\-|]+\|', line.strip()))


def md_to_xml(text: str, doc_title: str) -> str:
    lines = text.splitlines()
    out = [para(doc_title, 'Title'), page_break()]
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()

        # Kod bloğu
        if stripped.startswith('```'):
            i += 1
            buf = []
            while i < len(lines) and not lines[i].strip().startswith('```'):
                buf.append(lines[i])
                i += 1
            i += 1
            body = '<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="17"/></w:rPr>'
            body += '<w:t xml:space="preserve">' + esc('\n'.join(buf)).replace('\n', '</w:t><w:br/><w:t xml:space="preserve">') + '</w:t></w:r>'
            out.append(f'<w:p><w:pPr><w:pStyle w:val="Code"/><w:shd w:val="clear" w:fill="F1F5F9"/></w:pPr>{body}</w:p>')
            continue

        # Tablo
        if stripped.startswith('|') and i + 1 < len(lines) and is_separator(lines[i + 1]):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                if not is_separator(lines[i]):
                    rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')])
                i += 1
            out.append(table_xml(rows))
            continue

        if not stripped:
            i += 1
            continue
        if stripped == '---':
            out.append('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="D8DFEB"/></w:pBdr></w:pPr></w:p>')
            i += 1
            continue
        m = re.match(r'^(#{1,4})\s+(.*)$', stripped)
        if m:
            level = len(m.group(1))
            out.append(para(m.group(2), f'Heading{min(level, 4)}'))
            i += 1
            continue
        if stripped.startswith('> '):
            out.append(para(stripped[2:], 'Quote', indent=360, italic=True))
            i += 1
            continue
        if re.match(r'^[-*]\s+', stripped):
            item = re.sub(r'^[-*]\s+', '', stripped)
            item = re.sub(r'^\[[ xX]\]\s*', '', item)
            out.append(para('•  ' + item, 'ListBullet', indent=300))
            i += 1
            continue
        if re.match(r'^\d+[.)]\s+', stripped):
            out.append(para(re.sub(r'^(\d+)[.)]\s+', r'\1. ', stripped), 'ListBullet', indent=300))
            i += 1
            continue
        out.append(para(stripped, 'Normal'))
        i += 1
    return ''.join(out)


def build() -> None:
    parts = []
    parts.append(para('ALÜMİNYUM DÖKÜMHANE ERP SİSTEMİ', 'Title'))
    parts.append(para('Plan, Süreç Raporu ve Yazılım Altyapı Kararları', 'Subtitle'))
    parts.append(para(f'Hazırlanma tarihi: {dt.date.today().strftime("%d.%m.%Y")}', 'Normal'))
    parts.append(para('Bu belge, sohbetteki tüm gereksinimlerin temizlenmiş ve yapılandırılmış hâlidir. '
                      'Yazılım altyapı şemasının oluşturulması için yapay zekâya verilecek tek girdi olarak hazırlanmıştır.', 'Quote'))
    parts.append(para('İÇİNDEKİLER', 'Heading1'))
    for _f, title in FILES:
        parts.append(para('•  ' + title, 'ListBullet', indent=300))
    parts.append(page_break())

    for fname, title in FILES:
        path = os.path.join(DOCS, fname)
        if not os.path.exists(path):
            raise SystemExit(f'Eksik doküman: {path}')
        with open(path, encoding='utf-8') as fh:
            parts.append(md_to_xml(fh.read(), title))
        parts.append(page_break())

    document = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                f'<w:document xmlns:w="{W}"><w:body>{"".join(parts)}'
                '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
                '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" '
                'w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
                '</w:body></w:document>')

    styles = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{W}">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:color w:val="0F172A"/></w:rPr></w:rPrDefault>
  <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="4338CA"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:sz w:val="26"/><w:color w:val="475569"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="280" w:after="140"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="4338CA"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="220" w:after="110"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/><w:color w:val="4F46E5"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="180" w:after="90"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:pPr><w:spacing w:before="140" w:after="70"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:sz w:val="21"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:rPr><w:color w:val="475569"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:pPr><w:spacing w:after="60"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:pPr><w:spacing w:before="80" w:after="120"/><w:ind w:left="180"/></w:pPr></w:style>
</w:styles>'''

    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''

    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''

    doc_rels = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

    core = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Alüminyum Dökümhane ERP — Plan ve Altyapı Kararları</dc:title>
  <dc:creator>ERP Studio</dc:creator>
  <cp:lastModifiedBy>ERP Studio</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{dt.datetime.now().isoformat()}Z</dcterms:created>
</cp:coreProperties>'''

    app = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>ERP Studio Docs</Application></Properties>'''

    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', rels)
        z.writestr('word/document.xml', document)
        z.writestr('word/styles.xml', styles)
        z.writestr('word/_rels/document.xml.rels', doc_rels)
        z.writestr('docProps/core.xml', core)
        z.writestr('docProps/app.xml', app)

    print(f'✓ Word dokümanı üretildi: {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT):,} bayt)')


if __name__ == '__main__':
    build()
