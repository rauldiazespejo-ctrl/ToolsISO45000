const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src', 'app', 'page.tsx');
const viewsDir = path.join(__dirname, 'src', 'components', 'pulso', 'views');

if (!fs.existsSync(viewsDir)) {
  fs.mkdirSync(viewsDir, { recursive: true });
}

const content = fs.readFileSync(pagePath, 'utf8');

// The shared imports at the top
const headerMatch = content.match(/^(.*?)(\/\/ ============== SETUP VIEW ==============)/s);
const baseHeader = headerMatch ? headerMatch[1] : '';

// The generic layout we will put in each view (we'll just copy base imports for now and let the linter guide, or just include what's needed).
// Actually, it's safer to just inject all the base imports to all views to ensure they work without undefined errors.
const viewImports = baseHeader.replace(/'use client';\r?\n/, '');

const sections = [
  { delimiter: '// ============== SETUP VIEW ==============', name: 'SetupView' },
  { delimiter: '// ============== DASHBOARD VIEW ==============', name: 'DashboardView' },
  { delimiter: '// ============== DOCUMENT DETAIL VIEW ==============', name: 'DocumentDetailView' },
  { delimiter: '// ============== FUF VIEW ==============', name: 'FufView' },
  { delimiter: '// ============== ADAPT DOCUMENT VIEW ==============', name: 'AdaptDocumentView' },
  { delimiter: '// ============== MAIN APP ==============', name: 'MainApp' }
];

const splitContent = {};
let remaining = content;

// Parse the file based on the delimiters
for (let i = 0; i < sections.length; i++) {
  const currentDelim = sections[i].delimiter;
  const nextDelim = i + 1 < sections.length ? sections[i+1].delimiter : null;
  
  const startIndex = remaining.indexOf(currentDelim);
  if (startIndex === -1) continue;
  
  const endIndex = nextDelim ? remaining.indexOf(nextDelim) : remaining.length;
  splitContent[sections[i].name] = remaining.slice(startIndex + currentDelim.length, endIndex).trim();
}

// Ensure the views export the function
Object.keys(splitContent).forEach(viewName => {
  if (viewName === 'MainApp') return; // Handled separately
  
  let viewCode = splitContent[viewName];
  // Add export default to the function definition if it doesn't have it
  viewCode = viewCode.replace(`function ${viewName}`, `export default function ${viewName}`);
  
  const fullContent = `"use client";\n\n${viewImports}\n\n${viewCode}`;
  fs.writeFileSync(path.join(viewsDir, `${viewName}.tsx`), fullContent);
  console.log(`Created ${viewName}.tsx`);
});

// Now rewrite page.tsx
const newPageCode = `"use client";\n\n${viewImports}
import SetupView from '@/components/pulso/views/SetupView';
import DashboardView from '@/components/pulso/views/DashboardView';
import DocumentDetailView from '@/components/pulso/views/DocumentDetailView';
import FufView from '@/components/pulso/views/FufView';
import AdaptDocumentView from '@/components/pulso/views/AdaptDocumentView';

${splitContent['MainApp']}
`;

fs.writeFileSync(pagePath, newPageCode);
console.log('Rewrote src/app/page.tsx');
