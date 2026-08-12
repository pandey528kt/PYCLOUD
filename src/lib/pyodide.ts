import { ExecutionResult, PythonTemplate } from '../types';

let pyodideInstance: any = null;
let isPyodideLoading = false;
let loadPromise: Promise<any> | null = null;

export const loadPyodideEngine = (): Promise<any> => {
  if (pyodideInstance) return Promise.resolve(pyodideInstance);
  if (loadPromise) return loadPromise;

  isPyodideLoading = true;

  loadPromise = new Promise((resolve, reject) => {
    // Check if script element already exists
    if ((window as any).loadPyodide) {
      (window as any)
        .loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
        })
        .then((pyodide: any) => {
          pyodideInstance = pyodide;
          isPyodideLoading = false;
          resolve(pyodide);
        })
        .catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).loadPyodide) {
        (window as any)
          .loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
          })
          .then((pyodide: any) => {
            pyodideInstance = pyodide;
            isPyodideLoading = false;
            resolve(pyodide);
          })
          .catch(reject);
      } else {
        reject(new Error('Failed to load Pyodide script'));
      }
    };
    script.onerror = () => {
      isPyodideLoading = false;
      reject(new Error('Failed to load Pyodide CDN script'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
};

export const executePythonCode = async (
  code: string,
  onInputRequired?: (promptText: string) => Promise<string>
): Promise<ExecutionResult> => {
  const startTime = performance.now();
  let stdoutLogs: string[] = [];

  try {
    const pyodide = await loadPyodideEngine();

    // Auto-load missing imported packages (e.g., numpy, pandas, matplotlib, scipy, requests, sympy)
    try {
      if (pyodide.loadPackagesFromImports) {
        await pyodide.loadPackagesFromImports(code);
      }
    } catch (pkgErr) {
      console.warn('Pyodide package auto-load note:', pkgErr);
    }

    // Prepare Python environment with standard output redirect
    const pySetup = `
import sys
import io

class JSStdout(io.TextIOBase):
    def __init__(self, callback):
        self.callback = callback
    def write(self, s):
        self.callback(s)
        return len(s)

def custom_input(prompt_text=""):
    import js
    res = js.handlePythonInput(str(prompt_text))
    print(f"{prompt_text}{res}")
    return res
`;
    await pyodide.runPythonAsync(pySetup);

    // Setup stdout capture callback
    pyodide.globals.set('js_stdout_callback', (text: string) => {
      stdoutLogs.push(text);
    });

    // Setup custom input callback if requested
    (window as any).handlePythonInput = (promptMsg: string) => {
      const userInput = window.prompt(promptMsg || 'Python Input:') || '';
      return userInput;
    };

    // Override sys.stdout & builtins.input in Pyodide
    const overrideCode = `
sys.stdout = JSStdout(js_stdout_callback)
sys.stderr = JSStdout(js_stdout_callback)
import builtins
builtins.input = custom_input
`;
    await pyodide.runPythonAsync(overrideCode);

    // Execute user code safely
    await pyodide.runPythonAsync(code);

    const endTime = performance.now();
    const finalOutput = stdoutLogs.join('');

    return {
      output: finalOutput || 'Program executed successfully with no output.',
      error: null,
      executionTimeMs: Math.round(endTime - startTime),
      status: 'success',
    };
  } catch (err: any) {
    const endTime = performance.now();
    let errorMsg = err?.message || String(err);
    const partialOutput = stdoutLogs.join('');

    // Format traceback for clean display
    if (errorMsg.includes('PythonError:')) {
      errorMsg = errorMsg.replace(/PythonError: Traceback \(most recent call last\):/g, 'Traceback (most recent call last):');
    }

    return {
      output: partialOutput,
      error: errorMsg,
      executionTimeMs: Math.round(endTime - startTime),
      status: 'error',
    };
  }
};

// --- PYTHON IDLE INTERACTIVE SHELL ENGINE ---

export interface IdleShellEntry {
  id: string;
  command: string;
  output: string;
  error: string | null;
  timestamp: string;
}

let idleNamespaceInitialized = false;

export const IDLE_WELCOME_BANNER = `Python 3.12.0 (pyodide/cpython, PyCloud IDLE Engine v1.0)
Type "help", "copyright", "credits" or "license" for more information.
Default libraries loaded: sys, math, os, json, datetime, random, re.
>>>`;

export const resetIdleEnvironment = async (): Promise<void> => {
  try {
    const pyodide = await loadPyodideEngine();
    await pyodide.runPythonAsync(`
import sys, io, math, os, json, datetime, random, re
__idle_globals__ = {
    'sys': sys,
    'math': math,
    'os': os,
    'json': json,
    'datetime': datetime,
    'random': random,
    're': re,
    '__name__': '__main__',
    '__doc__': None,
}
`);
    idleNamespaceInitialized = true;
  } catch (err) {
    console.warn('resetIdleEnvironment warning:', err);
  }
};

export const executeIdleCommand = async (
  inputCommand: string
): Promise<{ output: string; error: string | null }> => {
  if (!inputCommand.trim()) return { output: '', error: null };

  let stdoutLogs: string[] = [];

  try {
    const pyodide = await loadPyodideEngine();

    // Auto-load missing packages for IDLE command
    try {
      if (pyodide.loadPackagesFromImports) {
        await pyodide.loadPackagesFromImports(inputCommand);
      }
    } catch {
      // Ignore
    }

    if (!idleNamespaceInitialized) {
      await resetIdleEnvironment();
    }

    pyodide.globals.set('idle_stdout_cb', (text: string) => {
      stdoutLogs.push(text);
    });

    const runnerScript = `
import sys, io, ast

class IdleStdout(io.TextIOBase):
    def write(self, s):
        idle_stdout_cb(s)
        return len(s)

sys.stdout = IdleStdout()
sys.stderr = IdleStdout()

cmd_str = ${JSON.stringify(inputCommand)}

try:
    # Try evaluating as expression first to auto-print value (IDLE behavior)
    parsed = ast.parse(cmd_str, mode='single')
    compiled = compile(parsed, '<idle_input>', 'single')
    exec(compiled, __idle_globals__)
except SyntaxError:
    exec(cmd_str, __idle_globals__)
`;

    await pyodide.runPythonAsync(runnerScript);

    const outText = stdoutLogs.join('');
    return {
      output: outText,
      error: null,
    };
  } catch (err: any) {
    let errText = err?.message || String(err);
    if (errText.includes('PythonError:')) {
      errText = errText.replace(/PythonError: Traceback \(most recent call last\):/g, 'Traceback:');
    }
    const outText = stdoutLogs.join('');
    return {
      output: outText,
      error: errText,
    };
  }
};

// Python Sample Starter Templates
export const PYTHON_TEMPLATES: PythonTemplate[] = [
  {
    id: 'hello_world',
    title: 'Hello & Math Basics',
    description: 'Basic print statements, formatting, loops and calculations',
    category: 'Basics',
    code: `# PyCloud Workspace - Welcome to Python!
import math

name = "Developer"
print(f"🚀 Hello, {name}! Welcome to PyCloud Workspace.")
print("=" * 45)

# Perform quick math
numbers = [12, 45, 78, 23, 89, 34]
print(f"Numbers list: {numbers}")
print(f"Sum: {sum(numbers)}")
print(f"Average: {sum(numbers) / len(numbers):.2f}")
print(f"Max Value: {max(numbers)}")
print(f"Square Roots: {[round(math.sqrt(x), 2) for x in numbers]}")

print("\\n✨ Cloud execution powered by Pyodide WebAssembly!")
`,
  },
  {
    id: 'data_science',
    title: 'Data Analysis & Statistics',
    description: 'Calculate median, variance, std dev & summary statistics',
    category: 'Data Science',
    code: `# Python Data Statistics Suite
import statistics
import random

# Generate synthetic dataset
dataset = [random.randint(50, 100) for _ in range(20)]
print("📊 Dataset:", dataset)
print("-" * 40)

mean_val = statistics.mean(dataset)
median_val = statistics.median(dataset)
stdev_val = statistics.stdev(dataset)

print(f"Mean: {mean_val:.2f}")
print(f"Median: {median_val:.2f}")
print(f"Standard Deviation: {stdev_val:.2f}")

# Group into grades
grades = {'A (90+)': 0, 'B (80-89)': 0, 'C (70-79)': 0, 'Below 70': 0}
for score in dataset:
    if score >= 90: grades['A (90+)'] += 1
    elif score >= 80: grades['B (80-89)'] += 1
    elif score >= 70: grades['C (70-79)'] += 1
    else: grades['Below 70'] += 1

print("\\n📈 Grade Distribution:")
for grade, count in grades.items():
    bar = "█" * count
    print(f"{grade:10} | {bar} ({count})")
`,
  },
  {
    id: 'ascii_art',
    title: 'Interactive 3D Matrix & ASCII Art',
    description: 'Generate dynamic ASCII art patterns and animations',
    category: 'Game',
    code: `# 3D ASCII Donut & Pattern Engine
import math

print("🎨 Creating 3D Diamond & Starburst Pattern...")
print("-" * 50)

def draw_diamond(size):
    for i in range(size):
        spaces = " " * (size - i - 1)
        stars = "*" * (2 * i + 1)
        print(f"{spaces}{stars}")
    for i in range(size - 2, -1, -1):
        spaces = " " * (size - i - 1)
        stars = "*" * (2 * i + 1)
        print(f"{spaces}{stars}")

draw_diamond(8)
print("\\n✨ PyCloud Workspace Canvas Complete.")
`,
  },
  {
    id: 'algorithms',
    title: 'Algorithms: Binary Search & QuickSort',
    description: 'Divide and conquer sorting algorithm benchmark',
    category: 'Algorithms',
    code: `# Algorithms: QuickSort & Binary Search Implementation

def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    steps = 0
    while low <= high:
        steps += 1
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid, steps
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1, steps

# Execution
raw_data = [64, 34, 25, 12, 22, 11, 90, 88, 45, 3]
print("Unsorted:", raw_data)

sorted_data = quicksort(raw_data)
print("Sorted with QuickSort:", sorted_data)

target = 45
index, steps = binary_search(sorted_data, target)
print(f"Binary Search for {target}: Found at index {index} in {steps} steps!")
`,
  },
];
