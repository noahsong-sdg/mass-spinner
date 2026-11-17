import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

/** Extract actual production nodes before erasing types; tests keep executing the
 * production callbacks without depending on annotation or printer whitespace. */
export function productionSource(file: string | URL): ts.SourceFile {
 return ts.createSourceFile(String(file),readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
}
function javascript(code: string): string {
 const result=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
 const errors=result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)??[];
 assert.equal(errors.length,0,ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:name=>name,getNewLine:()=> '\n'}));
 return result.outputText;
}
function one<T extends ts.Node>(source: ts.SourceFile,predicate: (node: ts.Node)=>node is T): T {
 const matches:T[]=[];
 function visit(node: ts.Node){if(predicate(node))matches.push(node);ts.forEachChild(node,visit);}
 visit(source);assert.equal(matches.length,1,'Expected one matching production node');return matches[0];
}
function declaration(source: ts.SourceFile,name: string): ts.FunctionDeclaration {
 return one(source,(node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
}
export function productionFunction(source: ts.SourceFile,name: string): string {
 return javascript(declaration(source,name).getText(source));
}
export function productionFunctions(source: ts.SourceFile,names: string[]): string {
 return names.map(name=>productionFunction(source,name)).join('\n');
}
/** The deferred renderer's helpers, resource owners and initializer share one closure. */
export function productionScopeTail(source: ts.SourceFile,firstFunction: string): string {
 const start=declaration(source,firstFunction),parent=start.parent;
 assert.ok(ts.isBlock(parent),'Expected a function-local production scope');
 const statements=parent.statements,startIndex=statements.indexOf(start);
 assert.ok(startIndex>=0);
 const last=statements.findIndex((node,i)=>i>startIndex&&ts.isReturnStatement(node));
 assert.ok(last>startIndex,'Expected the final controller return');
 return javascript(statements.slice(startIndex,last).map(node=>node.getText(source)).join('\n'));
}
function eventCall(source: ts.SourceFile,id: string,event: string): ts.CallExpression {
 return one(source,(node):node is ts.CallExpression=>{
  if(!ts.isCallExpression(node)||!ts.isPropertyAccessExpression(node.expression)||node.expression.name.text!=='addEventListener')return false;
  const owner=node.expression.expression,eventName=node.arguments[0];
  return ts.isCallExpression(owner)&&ts.isIdentifier(owner.expression)&&owner.expression.text==='$'&&
   !!owner.arguments[0]&&ts.isStringLiteral(owner.arguments[0])&&owner.arguments[0].text===id&&
   !!eventName&&ts.isStringLiteral(eventName)&&eventName.text===event;
 });
}
export function productionEvent(source: ts.SourceFile,id: string,event='click'): string {
 return javascript(eventCall(source,id,event).getText(source)+';');
}
export function productionEventBody(source: ts.SourceFile,id: string,event='click'): string {
 const callback=eventCall(source,id,event).arguments[1];
 assert.ok(callback&&(ts.isArrowFunction(callback)||ts.isFunctionExpression(callback))&&ts.isBlock(callback.body));
 return javascript(callback.body.statements.map(node=>node.getText(source)).join('\n'));
}
export function productionAssignment(source: ts.SourceFile,name: string): string {
 return javascript(one(source,(node):node is ts.BinaryExpression=>ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isIdentifier(node.left)&&node.left.text===name&&(ts.isArrowFunction(node.right)||ts.isNewExpression(node.right))).getText(source)+';');
}
export function productionMethodCall(source: ts.SourceFile,owner: string,method: string): string {
 return javascript(one(source,(node):node is ts.CallExpression=>ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text===owner&&node.expression.name.text===method).getText(source)+';');
}
function statementName(node: ts.Statement): string | undefined {
 if(ts.isVariableStatement(node))return node.declarationList.declarations.find(d=>ts.isIdentifier(d.name))?.name.getText();
 if(ts.isExpressionStatement(node)&&ts.isBinaryExpression(node.expression)&&ts.isIdentifier(node.expression.left))return node.expression.left.text;
 return undefined;
}
export function productionStatements(source: ts.SourceFile,first: string,until: string): string {
 const start=source.statements.findIndex(node=>statementName(node)===first);
 const end=source.statements.findIndex((node,i)=>i>start&&statementName(node)===until);
 assert.ok(start>=0&&end>start,'Expected the production wiring statement range');
 return javascript(source.statements.slice(start,end).map(node=>node.getText(source)).join('\n'));
}
