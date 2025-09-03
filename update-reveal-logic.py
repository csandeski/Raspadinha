#!/usr/bin/env python3
import re

# Read the routes.ts file
with open('server/routes.ts', 'r') as f:
    content = f.read()

# Update the comment in reveal endpoints
old_comment = "// Extract numeric value from prize value (multiplier affects chance, not prize)"
new_comment = "// Extract numeric value from prize value and apply multiplier"
content = content.replace(old_comment, new_comment)

# Find and replace the prize calculation logic in reveal endpoints
# Pattern for Me Mimei, Eletrônicos, and Super Prêmios
pattern = r'let numericPrize = 0;\s*if \(won && prizeValue\) \{\s*numericPrize = parseFloat\(prizeValue\) \|\| 0;\s*\}'
replacement = '''let numericPrize = 0;
        if (won && prizeValue) {
          const basePrize = parseFloat(prizeValue) || 0;
          numericPrize = basePrize * multiplier; // Multiply prize by multiplier
        }'''

# Replace all occurrences
content = re.sub(pattern, replacement, content)

# Write back the updated content
with open('server/routes.ts', 'w') as f:
    f.write(content)

print("Updated reveal logic in all premio games!")