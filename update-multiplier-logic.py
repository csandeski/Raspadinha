#!/usr/bin/env python3
import re

# Read the routes.ts file
with open('server/routes.ts', 'r') as f:
    content = f.read()

# Pattern to find the multiplier logic for all premio games
pattern = r'const adjustedProbability = Math\.min\(totalProbability \* multiplier, 100\);'
replacement = 'const adjustedProbability = totalProbability; // Multiplier now affects prize value'

# Replace all occurrences
new_content = content.replace(pattern, replacement)

# Also update the console.log message
old_log = "console.log(`Total probability: ${totalProbability}%, Multiplier: ${multiplier}x, Adjusted: ${adjustedProbability}%`);"
new_log = "console.log(`Total probability: ${totalProbability}%, Multiplier: ${multiplier}x (affects prize value)`);"
new_content = new_content.replace(old_log, new_log)

# Update the comment
old_comment = "// Apply multiplier to chance of winning (capped at 100%)"
new_comment = "// Use only the base total probability (multiplier now affects prize value, not chance)"
new_content = new_content.replace(old_comment, new_comment)

# Update console log for roll
old_roll_log = "console.log(`Roll: ${roll}, Adjusted Probability: ${adjustedProbability}, Won: ${roll < adjustedProbability}`);"
new_roll_log = "console.log(`Roll: ${roll}, Win Probability: ${adjustedProbability}, Won: ${roll < adjustedProbability}`);"
new_content = new_content.replace(old_roll_log, new_roll_log)

# Write back the updated content
with open('server/routes.ts', 'w') as f:
    f.write(new_content)

print("Updated multiplier logic in all premio games!")