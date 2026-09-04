from pathlib import Path

styles_path = Path('styles.css')
index_path = Path('index.html')
styles = styles_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')

old_css = '''.welcome-banner-copy p {
  max-width: 1000px;
  margin: 0 auto;'''
new_css = '''.welcome-banner-copy p {
  max-width: 880px;
  margin: 0 auto;'''
if styles.count(old_css) != 1:
    raise SystemExit(f'Expected one 1000px welcome paragraph rule, found {styles.count(old_css)}')
styles = styles.replace(old_css, new_css, 1)

old_link = '<link rel="stylesheet" href="./styles.css?v=20260904-welcome-copy-2-lines">'
new_link = '<link rel="stylesheet" href="./styles.css?v=20260904-welcome-copy-tight">'
if index.count(old_link) != 1:
    raise SystemExit(f'Expected one current stylesheet link, found {index.count(old_link)}')
index = index.replace(old_link, new_link, 1)

styles_path.write_text(styles, encoding='utf-8')
index_path.write_text(index, encoding='utf-8')
print('Tightened desktop welcome paragraph to 880px.')
