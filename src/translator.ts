import * as ts from 'typescript';

export function translate(code: string): string {
  const sourceFile = ts.createSourceFile(
    'file.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visit: ts.Visitor = (node) => {
      // Convert require(...) to import statements
      if (ts.isVariableStatement(node)) {
        const decls = node.declarationList.declarations;
        if (decls.length === 1) {
          const decl = decls[0];
          if (
            ts.isIdentifier(decl.name) &&
            decl.initializer &&
            ts.isCallExpression(decl.initializer) &&
            ts.isIdentifier(decl.initializer.expression) &&
            decl.initializer.expression.text === 'require' &&
            decl.initializer.arguments.length === 1 &&
            ts.isStringLiteral(decl.initializer.arguments[0])
          ) {
            const importName = decl.name.text;
            const moduleName = (decl.initializer.arguments[0] as ts.StringLiteral).text;
            return ts.factory.createImportDeclaration(
              undefined,
              ts.factory.createImportClause(
                false,
                ts.factory.createIdentifier(importName),
                undefined
              ),
              ts.factory.createStringLiteral(moduleName),
              undefined
            );
          }
        }
      }

      // Convert module.exports = X to export default X
      if (
        ts.isExpressionStatement(node) &&
        ts.isBinaryExpression(node.expression) &&
        node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.expression.left) &&
        ts.isIdentifier(node.expression.left.expression) &&
        node.expression.left.expression.text === 'module' &&
        node.expression.left.name.text === 'exports'
      ) {
        return ts.factory.createExportAssignment(
          undefined,
          false,
          node.expression.right
        );
      }

      // Annotate function declarations with any types
      if (ts.isFunctionDeclaration(node) && node.name) {
        const newParams = node.parameters.map((param) =>
          param.type
            ? param
            : ts.factory.updateParameterDeclaration(
                param,
                param.modifiers,
                param.dotDotDotToken,
                param.name,
                param.questionToken,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                param.initializer
              )
        );
        return ts.factory.updateFunctionDeclaration(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          newParams,
          node.type ?? ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
          node.body
        );
      }

      // Annotate arrow functions' parameters and return type as any
      if (ts.isVariableStatement(node)) {
        const decls = node.declarationList.declarations;
        const updatedDecls = decls.map((decl) => {
          if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
            const arrow = decl.initializer;
            const newParams = arrow.parameters.map((param) =>
              param.type
                ? param
                : ts.factory.updateParameterDeclaration(
                    param,
                    param.modifiers,
                    param.dotDotDotToken,
                    param.name,
                    param.questionToken,
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                    param.initializer
                  )
            );
            const newArrow = ts.factory.updateArrowFunction(
              arrow,
              arrow.modifiers,
              arrow.typeParameters,
              newParams,
              arrow.type ?? ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
              arrow.equalsGreaterThanToken,
              arrow.body
            );
            return ts.factory.updateVariableDeclaration(
              decl,
              decl.name,
              decl.exclamationToken,
              decl.type,
              newArrow
            );
          }
          return decl;
        });
        if (updatedDecls.some((d, i) => d !== decls[i])) {
          const newList = ts.factory.updateVariableDeclarationList(node.declarationList, updatedDecls);
          return ts.factory.updateVariableStatement(node, node.modifiers, newList);
        }
      }

      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.SourceFile;
  };

  const result = ts.transform(sourceFile, [transformer]);
  const transformedSource = result.transformed[0];
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const output = printer.printFile(transformedSource as ts.SourceFile);
  result.dispose();
  return output;
}