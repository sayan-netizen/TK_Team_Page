from rembg import remove
from PIL import Image

input_path = 'shadow-dojo/torii-placeholder.png'
output_path = 'shadow-dojo/torii-placeholder-clean.png'

print("Opening image...")
input_img = Image.open(input_path)
print("Removing background...")
output_img = remove(input_img)
print("Saving clean image...")
output_img.save(output_path)
print("Done!")
