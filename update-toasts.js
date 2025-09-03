import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to process file content
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Skip admin files
  if (filePath.includes('/admin/') || filePath.includes('admin-')) {
    return;
  }

  // Pattern to match toast calls with title and description
  content = content.replace(/toast\(\s*\{\s*title:\s*["'`]([^"'`]*?)["'`]\s*,?\s*description:\s*["'`]([^"'`]*?)["'`]\s*,?\s*variant:\s*["'`]destructive["'`]\s*\}\s*\)/g, (match, title, description) => {
    modified = true;
    // Use description if available, otherwise use simplified title
    let message = description || title;
    // Remove error prefixes
    message = message.replace(/^(Erro ao |Error |Erro: |Error: |Failed to |Falha ao )/i, '');
    // Capitalize first letter
    message = message.charAt(0).toUpperCase() + message.slice(1);
    return `toast({ description: "${message}" })`;
  });

  // Pattern to match toast calls with only title and destructive variant
  content = content.replace(/toast\(\s*\{\s*title:\s*["'`]([^"'`]*?)["'`]\s*,?\s*variant:\s*["'`]destructive["'`]\s*\}\s*\)/g, (match, title) => {
    modified = true;
    // Remove error prefixes
    let message = title.replace(/^(Erro ao |Error |Erro: |Error: |Failed to |Falha ao )/i, '');
    // Capitalize first letter
    message = message.charAt(0).toUpperCase() + message.slice(1);
    return `toast({ description: "${message}" })`;
  });

  // Pattern to match toast calls with title containing "Erro" or "Error"
  content = content.replace(/toast\(\s*\{\s*title:\s*["'`]([^"'`]*(?:Erro|Error)[^"'`]*?)["'`]\s*,?\s*description:\s*["'`]([^"'`]*?)["'`]\s*\}\s*\)/g, (match, title, description) => {
    modified = true;
    // Use description if available, otherwise simplify title
    let message = description || title;
    // Remove error prefixes
    message = message.replace(/^(Erro ao |Error |Erro: |Error: |Failed to |Falha ao )/i, '');
    // Capitalize first letter
    message = message.charAt(0).toUpperCase() + message.slice(1);
    return `toast({ description: "${message}" })`;
  });

  // Pattern to match toast calls with only title containing "Erro" or "Error"
  content = content.replace(/toast\(\s*\{\s*title:\s*["'`]([^"'`]*(?:Erro|Error)[^"'`]*?)["'`]\s*\}\s*\)/g, (match, title) => {
    modified = true;
    // Remove error prefixes
    let message = title.replace(/^(Erro ao |Error |Erro: |Error: |Failed to |Falha ao )/i, '');
    // Capitalize first letter
    message = message.charAt(0).toUpperCase() + message.slice(1);
    return `toast({ description: "${message}" })`;
  });

  // Pattern to match toast calls with successful messages (keep as description)
  content = content.replace(/toast\(\s*\{\s*title:\s*["'`]([^"'`]*?)["'`]\s*\}\s*\)/g, (match, title) => {
    // Skip if it contains "Erro" or "Error"
    if (title.match(/Erro|Error/i)) return match;
    modified = true;
    return `toast({ description: "${title}" })`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

// Function to walk through directory
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and admin directories
      if (file !== 'node_modules' && file !== '.git' && !file.includes('admin')) {
        walkDir(filePath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      processFile(filePath);
    }
  });
}

// Run the script
console.log('Starting toast message standardization...');
walkDir('./client/src');
console.log('Toast message standardization complete!');