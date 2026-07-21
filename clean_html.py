import re

with open('shadow-dojo/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to remove the leftover temple-pillar, temple-steps, and flame-halo
pattern = re.compile(
    r'\s*<div class="temple-pillar pillar-r"></div>\s*</div>\s*<div class="temple-steps"></div>\s*<div class="flame-halo">.*?</div>\s*</div>',
    re.DOTALL
)

new_content = pattern.sub('', content)

with open('shadow-dojo/index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Cleaned up leftover temple fragments in index.html.")
