"""
Run this in your project root:
  python fix_index_html.py

It adds Google Fonts <link> tags to public/index.html
which is more reliable than @import in CSS.
"""
import os

html_path = None
for p in ['public/index.html', 'index.html']:
    if os.path.exists(p):
        html_path = p
        break

if not html_path:
    print("index.html not found — create it or check path")
    exit()

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

font_links = """
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Nunito:wght@400;600;700;800&family=Josefin+Sans:wght@300;400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">"""

if 'fonts.googleapis.com' not in html:
    html = html.replace('</head>', font_links + '\n</head>')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"✓ Font links added to {html_path}")
else:
    print("Font links already present")
