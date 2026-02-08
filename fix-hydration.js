const fs = require('fs');

const files = [
  'src/app/dashboard/admin/page.tsx',
  'src/app/dashboard/seller/page.tsx',
  'src/app/dashboard/admin/balance/page.tsx',
  'src/app/dashboard/admin/products/page.tsx',
  'src/app/dashboard/admin/moderation/page.tsx',
  'src/app/dashboard/customer-service/page.tsx'
];

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add isHydrated to destructuring
    content = content.replace(
      /const \{ user \} = useAuthStore\(\);/,
      'const { user, isHydrated } = useAuthStore();'
    );
    
    // Fix useEffect to check isHydrated first
    content = content.replace(
      /useEffect\(\) \{\s+if \(!user\)/m,
      'useEffect(() => {\n    if (!isHydrated) return;\n    \n    if (!user)'
    );
    
    // Update dependency array
    content = content.replace(
      /\}, \[user\]\);/,
      '}, [user, isHydrated]);'
    );
    
    // Add loading check before return JSX
    const returnIdx = content.indexOf('return (');
    if (returnIdx > 0 &amp;&amp; !content.substring(0, returnIdx).includes('if (!isHydrated) {')) {
      const before = content.substring(0, returnIdx);
      const after = content.substring(returnIdx);
      content = before + '\n  if (!isHydrated) {\n    return <div className="max-w-7xl mx-auto px-4 py-10">Loading...</div>;\n  }\n\n  ' + after;
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('✓ ' + file);
  } catch (e) {
    console.log('✗ ' + file + ': ' + e.message);
  }
});

console.log('✓ Done');
