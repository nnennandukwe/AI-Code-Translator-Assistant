export function translate(code: string): string {
  let tsCode = code;
  tsCode = tsCode.replace(
    /const\s+(\w+)\s*=\s*require\(['"]([^'\"]+)['"]\);?/g,
    "import $1 from '$2';"
  );
  tsCode = tsCode.replace(
    /module\.exports\s*=\s*(\w+);?/g,
    'export default $1;'
  );
  tsCode = tsCode.replace(
    /function\s+(\w+)\s*\(([^)]*)\)/g,
    (_match, fnName, params) => {
      const annotated = params
        .split(',')
        .map((p: string) => {
          const name = p.trim();
          return name.includes(':') || !name ? name : `${name}: any`;
        })
        .filter(Boolean)
        .join(', ');
      return `function ${fnName}(${annotated}): any`;
    }
  );
  tsCode = tsCode.replace(
    /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g,
    (_match, constName, params) => {
      const annotated = params
        .split(',')
        .map((p: string) => {
          const name = p.trim();
          return name.includes(':') || !name ? name : `${name}: any`;
        })
        .filter(Boolean)
        .join(', ');
      return `const ${constName} = (${annotated}): any =>`;
    }
  );
  return tsCode;
}