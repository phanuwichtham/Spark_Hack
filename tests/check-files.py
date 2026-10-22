"""ตรวจ HTML และ Relative Path ไม่ต้องใช้แพ็กเกจเสริม"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import re,sys
root=Path(__file__).resolve().parents[1]
errors=[]
class Check(HTMLParser):
 def __init__(self,path):super().__init__();self.path=path;self.h1=0;self.ids=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='h1':self.h1+=1
  if tag=='html' and a.get('lang')!='th':errors.append(self.path.name+': lang')
  if 'id'in a:self.ids.append(a['id'])
  for key in ['src','href']:
   url=a.get(key,'');u=urlsplit(url)
   if not url or u.scheme or u.netloc or url.startswith('#'):continue
   if not(self.path.parent/unquote(u.path)).exists():errors.append(self.path.name+': ไม่พบ '+url)
   if url.startswith('/'):errors.append(self.path.name+': absolute path '+url)
for p in root.glob('*.html'):
 c=Check(p);c.feed(p.read_text())
 if not c.h1:errors.append(p.name+': no h1')
 if len(c.ids)!=len(set(c.ids)):errors.append(p.name+': duplicate id')
 if 'data-page='not in p.read_text():errors.append(p.name+': no data-page')
for p in (root/'assets/js').rglob('*.js'):
 for target in re.findall(r"['\"]([a-z-]+\.html)(?:[?'\"#])",p.read_text()):
  if not(root/target).exists():errors.append(p.name+': no '+target)
 if re.search(r'\b(TODO|Coming Soon)\b',p.read_text(),re.I):errors.append(p.name+': unfinished')
print('HTML pages:',len(list(root.glob('*.html'))))
print('Image files:',len(list((root/'assets/images').glob('*.webp'))))
print('Missing resources / markup errors:',len(errors))
for error in errors:print(error)
sys.exit(bool(errors))
