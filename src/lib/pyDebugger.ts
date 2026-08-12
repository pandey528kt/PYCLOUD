import { DebugVariable, ExecutionResult } from '../types';
import { loadPyodideEngine } from './pyodide';

export type DebugAction = 'continue' | 'step' | 'stop';

let currentDebugResolver: ((action: DebugAction) => void) | null = null;
let currentSteppingMode: DebugAction = 'step';
let activeBreakpoints = new Set<number>();

export const setDebugBreakpoints = (breakpoints: number[]) => {
  activeBreakpoints = new Set(breakpoints);
};

export const resolveDebugAction = (action: DebugAction) => {
  currentSteppingMode = action;
  if (currentDebugResolver) {
    const resolver = currentDebugResolver;
    currentDebugResolver = null;
    resolver(action);
  }
};

export const executeScriptWithDebugger = async (
  code: string,
  breakpoints: number[],
  onPause: (line: number, variables: DebugVariable[]) => void,
  fileName: string = 'main.py'
): Promise<ExecutionResult> => {
  const startTime = performance.now();
  let stdoutLogs: string[] = [];
  activeBreakpoints = new Set(breakpoints);
  currentSteppingMode = 'step'; // Pause on first breakpoint or step

  try {
    const pyodide = await loadPyodideEngine();

    // Auto-load missing packages for code
    try {
      if (pyodide.loadPackagesFromImports) {
        await pyodide.loadPackagesFromImports(code);
      }
    } catch {
      // Ignore
    }

    // Set stdout callback
    pyodide.globals.set('idle_stdout_cb', (text: string) => {
      stdoutLogs.push(text);
    });

    // Handle user input in debug mode
    (window as any).handlePythonInput = (promptMsg: string) => {
      const userInput = window.prompt(promptMsg || 'Python Input:') || '';
      return userInput;
    };

    // Register JS callback for Python debugger line hit
    (window as any).pyDebugOnLineHit = (lineno: number, varsJson: string): Promise<DebugAction> => {
      let vars: DebugVariable[] = [];
      try {
        vars = JSON.parse(varsJson);
      } catch {
        vars = [];
      }

      // Check if we should pause
      const isBreakpoint = activeBreakpoints.has(lineno);
      const shouldPause = currentSteppingMode === 'step' || isBreakpoint;

      if (!shouldPause) {
        return Promise.resolve('continue');
      }

      // Notify UI of pause
      onPause(lineno, vars);

      // Return a Promise that resolves when user clicks Step, Continue, or Stop
      return new Promise<DebugAction>((resolve) => {
        currentDebugResolver = resolve;
      });
    };

    // Python Debugger Engine script with AST instrumentation
    const debugRunnerScript = `
import sys, io, ast, json, asyncio, builtins

class DebuggerStoppedException(Exception):
    pass

class IdleStdout(io.TextIOBase):
    def write(self, s):
        idle_stdout_cb(s)
        return len(s)

sys.stdout = IdleStdout()
sys.stderr = IdleStdout()

def handle_python_input(prompt_msg=''):
    import js
    return js.window.handlePythonInput(prompt_msg)

builtins.input = handle_python_input

def __get_debug_vars__(locs, globs):
    res = []
    combined = {}
    combined.update(globs)
    combined.update(locs)
    
    ignore_keys = {'sys', 'io', 'ast', 'json', 'asyncio', 'builtins', 'IdleStdout', 'handle_python_input', '__get_debug_vars__', '__debug_hook__', 'DebuggerStoppedException', 'js', '__idle_globals__'}
    
    for k, v in combined.items():
        if k.startswith('__') or k in ignore_keys:
            continue
        try:
            val_str = repr(v)
            if len(val_str) > 120:
                val_str = val_str[:117] + '...'
            res.append({'name': str(k), 'type': type(v).__name__, 'value': val_str})
        except:
            pass
    return json.dumps(res)

async def __debug_hook__(lineno, vars_json_str):
    import js
    action = await js.window.pyDebugOnLineHit(lineno, vars_json_str)
    if action == 'stop':
        raise DebuggerStoppedException("Execution stopped by user.")

class DebugTransformer(ast.NodeTransformer):
    def __init__(self, user_funcs):
        self.user_funcs = user_funcs

    def _create_debug_hook(self, lineno):
        return ast.Expr(
            value=ast.Await(
                value=ast.Call(
                    func=ast.Name(id='__debug_hook__', ctx=ast.Load()),
                    args=[
                        ast.Constant(value=lineno),
                        ast.Call(
                            func=ast.Name(id='__get_debug_vars__', ctx=ast.Load()),
                            args=[
                                ast.Call(func=ast.Name(id='locals', ctx=ast.Load()), args=[], keywords=[]),
                                ast.Call(func=ast.Name(id='globals', ctx=ast.Load()), args=[], keywords=[])
                            ],
                            keywords=[]
                        )
                    ],
                    keywords=[]
                )
            )
        )

    def visit_statements(self, stmts):
        new_stmts = []
        for stmt in stmts:
            if hasattr(stmt, 'lineno') and not isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Import, ast.ImportFrom)):
                new_stmts.append(self._create_debug_hook(stmt.lineno))
            new_stmts.append(self.visit(stmt))
        return new_stmts

    def visit_Module(self, node):
        node.body = self.visit_statements(node.body)
        return node

    def visit_FunctionDef(self, node):
        node.body = self.visit_statements(node.body)
        async_node = ast.AsyncFunctionDef(
            name=node.name,
            args=node.args,
            body=node.body,
            decorator_list=node.decorator_list,
            returns=node.returns,
            lineno=node.lineno,
            col_offset=getattr(node, 'col_offset', 0)
        )
        return async_node

    def visit_AsyncFunctionDef(self, node):
        node.body = self.visit_statements(node.body)
        return node

    def visit_For(self, node):
        node.body = self.visit_statements(node.body)
        if node.orelse:
            node.orelse = self.visit_statements(node.orelse)
        return self.generic_visit(node)

    def visit_While(self, node):
        node.body = self.visit_statements(node.body)
        if node.orelse:
            node.orelse = self.visit_statements(node.orelse)
        return self.generic_visit(node)

    def visit_If(self, node):
        node.body = self.visit_statements(node.body)
        if node.orelse:
            node.orelse = self.visit_statements(node.orelse)
        return self.generic_visit(node)

    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id in self.user_funcs:
            return ast.Await(value=node)
        return node

code_str = ${JSON.stringify(code)}
file_name = ${JSON.stringify(fileName)}

tree = ast.parse(code_str, filename=file_name)
user_funcs = set()
for node in ast.walk(tree):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        user_funcs.add(node.name)

transformer = DebugTransformer(user_funcs)
transformed_tree = transformer.visit(tree)

main_func = ast.AsyncFunctionDef(
    name='__debug_main__',
    args=ast.arguments(posonlyargs=[], args=[], vararg=None, kwonlyargs=[], kw_defaults=[], kwarg=None, defaults=[]),
    body=transformed_tree.body,
    decorator_list=[],
    returns=None,
    lineno=1,
    col_offset=0
)

debug_module = ast.Module(body=[main_func], type_ignores=[])
ast.fix_missing_locations(debug_module)

exec_scope = {}
compiled = compile(debug_module, filename=file_name, mode='exec')
exec(compiled, exec_scope)

# Run debug main task
await exec_scope['__debug_main__']()
`;

    await pyodide.runPythonAsync(debugRunnerScript);

    const endTime = performance.now();
    return {
      output: stdoutLogs.join(''),
      error: null,
      executionTimeMs: Math.round(endTime - startTime),
      status: 'success',
    };
  } catch (err: any) {
    const endTime = performance.now();
    let errText = err?.message || String(err);

    if (errText.includes('DebuggerStoppedException') || errText.includes('Execution stopped by user.')) {
      return {
        output: stdoutLogs.join('') + '\n[Debugger session stopped by user]',
        error: null,
        executionTimeMs: Math.round(endTime - startTime),
        status: 'success',
      };
    }

    if (errText.includes('PythonError:')) {
      errText = errText.replace(/PythonError: Traceback \(most recent call last\):/g, 'Traceback (most recent call last):');
    }

    return {
      output: stdoutLogs.join(''),
      error: errText,
      executionTimeMs: Math.round(endTime - startTime),
      status: 'error',
    };
  } finally {
    currentDebugResolver = null;
  }
};
