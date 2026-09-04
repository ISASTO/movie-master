from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
old = 'The Movie Master has something for everyone. If you are an old person, a regular adult,\n                  or even a child, the Movie Master will know the best movies for you to watch.'
new = 'The Movie Master has something for everyone. If you are an old person, a regular person,\n                  or even a child, the Movie Master will know the best movies for you to watch.'
count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected one matching paragraph, found {count}')
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('Updated regular adult to regular person.')
