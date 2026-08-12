import React, { useState } from 'react';
import { Search, Code2, Copy, Check, ArrowRight, X, Sparkles, Layers } from 'lucide-react';
import { Card3D } from './3d/Card3D';

export interface Snippet {
  id: string;
  title: string;
  category: 'I/O & JSON' | 'Data Science' | 'Web & APIs' | 'OOP & Control' | 'Algorithms';
  description: string;
  code: string;
}

const SNIPPET_LIBRARY: Snippet[] = [
  {
    id: 'json-io',
    title: 'JSON Parsing & Serialization',
    category: 'I/O & JSON',
    description: 'Load and dump structured JSON data with indentation',
    code: `import json

# Python dictionary
data = {
    "name": "PyCloud Workspace",
    "version": "3.12",
    "features": ["3D UI", "Pyodide WASM", "Debugger"]
}

# Serialize to JSON string
json_str = json.dumps(data, indent=2)
print("Serialized JSON:")
print(json_str)

# Parse JSON string back
parsed = json.loads(json_str)
print(f"\\nLoaded App Name: {parsed['name']}")
`,
  },
  {
    id: 'http-request',
    title: 'HTTP API Fetching (urllib)',
    category: 'Web & APIs',
    description: 'Fetch JSON data from public REST APIs without external dependencies',
    code: `import urllib.request
import json

url = "https://api.github.com/zen"

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'PyCloud/3.0'})
    with urllib.request.urlopen(req) as response:
        quote = response.read().decode('utf-8')
        print("GitHub Developer Wisdom:")
        print(f"\\"{quote}\\"")
except Exception as e:
    print(f"HTTP Request failed: {e}")
`,
  },
  {
    id: 'pandas-basics',
    title: 'Pandas DataFrame Basics',
    category: 'Data Science',
    description: 'Create DataFrames, calculate summary statistics, and filter rows',
    code: `import pandas as pd

# Sample dataset
raw_data = {
    'Developer': ['Alice', 'Bob', 'Charlie', 'Diana'],
    'Language': ['Python', 'Python', 'Rust', 'TypeScript'],
    'Commits': [142, 98, 210, 175]
}

df = pd.DataFrame(raw_data)

print("--- DataFrame Summary ---")
print(df)

print("\\n--- Python Developers ---")
python_devs = df[df['Language'] == 'Python']
print(python_devs)

print(f"\\nTotal Commits: {df['Commits'].sum()}")
`,
  },
  {
    id: 'numpy-math',
    title: 'NumPy Vector Math & Matrices',
    category: 'Data Science',
    description: 'Perform fast array math, matrix multiplication, and statistics',
    code: `import numpy as np

# Generate matrix
matrix = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])

print("Original 3x3 Matrix:")
print(matrix)

print("\\nTransposed Matrix:")
print(matrix.T)

print(f"\\nMean: {np.mean(matrix):.2f}")
print(f"Standard Deviation: {np.std(matrix):.2f}")
`,
  },
  {
    id: 'class-oop',
    title: 'Object-Oriented Class & Decorators',
    category: 'OOP & Control',
    description: 'Class definition with encapsulation, @property, and dunder methods',
    code: `class Developer:
    def __init__(self, name: str, level: str):
        self.name = name
        self.level = level
        self._skills = []

    def add_skill(self, skill: str):
        self._skills.append(skill)

    @property
    def skill_count(self) -> int:
        return len(self._skills)

    def __str__(self):
        return f"Dev({self.name}, {self.level}, Skills={self._skills})"

# Instantiate
dev = Developer("Alex", "Senior")
dev.add_skill("Python")
dev.add_skill("Pyodide WASM")
print(dev)
print(f"Skill Count: {dev.skill_count}")
`,
  },
  {
    id: 'try-except',
    title: 'Robust Error Handling',
    category: 'OOP & Control',
    description: 'Structured try-except-else-finally blocks with custom exceptions',
    code: `class InvalidScoreError(Exception):
    pass

def validate_score(score: int):
    if not (0 <= score <= 100):
        raise InvalidScoreError(f"Score {score} out of bounds [0, 100]")
    return True

for test_val in [85, 105, 92]:
    try:
        validate_score(test_val)
        print(f"Score {test_val} is VALID")
    except InvalidScoreError as err:
        print(f"Validation Error: {err}")
    finally:
        print("--- Check Complete ---\\n")
`,
  },
  {
    id: 'binary-search',
    title: 'Binary Search Algorithm',
    category: 'Algorithms',
    description: 'Logarithmic search O(log N) in a sorted array',
    code: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

numbers = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
target = 23
result = binary_search(numbers, target)

print(f"Array: {numbers}")
print(f"Target {target} found at index: {result}")
`,
  },
  {
    id: 'decorators',
    title: 'Function Execution Timer Decorator',
    category: 'OOP & Control',
    description: 'Measure runtime performance of any Python function',
    code: `import time

def measure_time(func):
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"[{func.__name__}] Executed in {(end - start) * 1000:.3f} ms")
        return result
    return wrapper

@measure_time
def compute_sum(n):
    return sum(i * i for i in range(n))

res = compute_sum(1_000_000)
print(f"Result: {res}")
`,
  }
];

interface CodeSnippetsModalProps {
  onClose: () => void;
  onInsertCode: (snippetCode: string) => void;
}

export const CodeSnippetsModal: React.FC<CodeSnippetsModalProps> = ({
  onClose,
  onInsertCode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'I/O & JSON', 'Data Science', 'Web & APIs', 'OOP & Control', 'Algorithms'];

  const filteredSnippets = SNIPPET_LIBRARY.filter((s) => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e]/85 p-4 backdrop-blur-xs">
      <Card3D className="w-full max-w-3xl max-h-[85vh] flex flex-col p-6 space-y-4" hoverEffect={false}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#161a28] border border-amber-500/40 text-amber-400 shadow-md">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Python Snippet Library <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">Fast Insert</span>
              </h2>
              <p className="text-xs text-slate-400">
                Ready-to-use boilerplate code patterns for Python developers
              </p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Category Pills */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search snippets by keyword, package, or function..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full input-3d rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-bold rounded-lg shrink-0 transition-all ${
                  selectedCategory === cat
                    ? 'btn-3d-gold text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Snippets List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredSnippets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl space-y-2">
              <Layers className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">No snippets match your search criteria</p>
            </div>
          ) : (
            filteredSnippets.map((snippet) => (
              <div
                key={snippet.id}
                className="rounded-xl border border-slate-800 bg-[#0a0c12] p-4 space-y-3 shadow-inner hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-extrabold text-slate-100">{snippet.title}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-amber-300 font-bold">
                        {snippet.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{snippet.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(snippet.id, snippet.code)}
                      className="btn-3d-dark p-1.5 rounded-lg text-slate-300"
                      title="Copy snippet code"
                    >
                      {copiedId === snippet.id ? (
                        <Check className="h-3.5 w-3.5 text-amber-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        onInsertCode(snippet.code);
                        onClose();
                      }}
                      className="btn-3d-gold flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold text-white"
                      title="Insert code directly into editor"
                    >
                      <span>Insert</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Code Block Preview */}
                <pre className="p-3 rounded-lg bg-[#05060a] border border-slate-800/80 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-36">
                  <code>{snippet.code}</code>
                </pre>
              </div>
            ))
          )}
        </div>

      </Card3D>
    </div>
  );
};
