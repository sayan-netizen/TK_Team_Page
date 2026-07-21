import re

with open('shadow-dojo/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# The regex matches the entire <div class="temple-frame"> block and extracts the portrait-symbol
pattern = re.compile(
    r'<div class="temple-frame">.*?<span class="portrait-symbol">(.*?)</span>.*?</div>\s*</div>',
    re.DOTALL
)

replacement = r'''<div class="torii-frame">
            <img class="torii-image" src="torii-placeholder-clean.png" alt="Torii Gate Frame">
            <div class="portrait-symbol-container">
              <span class="portrait-symbol">\1</span>
            </div>
          </div>'''

new_content = pattern.sub(replacement, content)

with open('shadow-dojo/index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replaced all temple-frame elements with torii-frame.")
