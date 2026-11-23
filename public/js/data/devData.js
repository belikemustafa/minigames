export const FALLBACK_GITHUB_REPOS = [
  { name: 'freeCodeCamp/freeCodeCamp', lang: 'TypeScript', stars: 408000, desc: 'Open-source full-stack web dev & math curriculum' },
  { name: 'torvalds/linux', lang: 'C', stars: 185000, desc: 'Linux kernel source tree' },
  { name: 'facebook/react', lang: 'JavaScript', stars: 231000, desc: 'Library for web and native user interfaces' },
  { name: 'microsoft/vscode', lang: 'TypeScript', stars: 166000, desc: 'Visual Studio Code editor' },
  { name: 'tensorflow/tensorflow', lang: 'C++', stars: 187000, desc: 'End-to-end machine learning framework' },
  { name: 'pytorch/pytorch', lang: 'Python', stars: 85500, desc: 'Tensors and dynamic neural networks in Python' },
  { name: 'vercel/next.js', lang: 'JavaScript', stars: 128000, desc: 'The React Framework for the Web' },
  { name: 'twbs/bootstrap', lang: 'JavaScript', stars: 171000, desc: 'Popular HTML, CSS, and JS UI framework' },
  { name: 'ohmyzsh/ohmyzsh', lang: 'Shell', stars: 175000, desc: 'Community-driven framework for managing Zsh' },
  { name: 'nodejs/node', lang: 'JavaScript', stars: 109000, desc: 'Node.js JavaScript runtime' },
  { name: 'rust-lang/rust', lang: 'Rust', stars: 100000, desc: 'Reliable and efficient systems language' },
  { name: 'golang/go', lang: 'Go', stars: 125000, desc: 'The Go programming language' },
  { name: 'kubernetes/kubernetes', lang: 'Go', stars: 112000, desc: 'Production-Grade Container Scheduling' },
  { name: 'neovim/neovim', lang: 'Vim Script', stars: 85000, desc: 'Vim-fork focused on extensibility and usability' },
  { name: 'tailwindlabs/tailwindcss', lang: 'TypeScript', stars: 84500, desc: 'Utility-first CSS framework' },
  { name: 'django/django', lang: 'Python', stars: 81500, desc: 'Web framework for perfectionists with deadlines' },
  { name: 'fastapi/fastapi', lang: 'Python', stars: 79500, desc: 'High performance Python API framework' },
  { name: 'docker/compose', lang: 'Go', stars: 34500, desc: 'Define and run multi-container Docker apps' },
  { name: 'sveltejs/svelte', lang: 'JavaScript', stars: 80500, desc: 'Cybernetically enhanced web apps' },
  { name: 'redis/redis', lang: 'C', stars: 67500, desc: 'In-memory database & cache' },
];

export const BUG_SNIPPETS = [
  {
    lang: 'JavaScript',
    title: 'Sum of an Array',
    lines: [
      'function sumArray(nums) {',
      '  let total = 0;',
      '  for (let i = 0; i <= nums.length; i++) {',
      '    total += nums[i];',
      '  }',
      '  return total;',
      '}',
    ],
    bugLine: 2,
    explanation: 'Line 3 uses `<=` instead of `<`, reading `nums[nums.length]` (`undefined`), which turns `total` into `NaN`.',
  },
  {
    lang: 'Python',
    title: 'Append to User Cart',
    lines: [
      'def add_item(item, cart=[]):',
      '    cart.append(item)',
      '    return cart',
      '',
      'a = add_item("milk")',
      'b = add_item("bread")',
    ],
    bugLine: 0,
    explanation: 'Line 1 uses a mutable default list `cart=[]`, which is shared across calls so `b` contains `["milk", "bread"]`.',
  },
  {
    lang: 'JavaScript',
    title: 'Fetch User Profile',
    lines: [
      'async function getUser(id) {',
      '  const res = await fetch(`/api/users/${id}`);',
      '  const data = res.json();',
      '  return data.name;',
      '}',
    ],
    bugLine: 2,
    explanation: 'Line 3 is missing `await` before `res.json()`, so `data` is a Promise and `data.name` is `undefined`.',
  },
  {
    lang: 'C',
    title: 'Admin Access Check',
    lines: [
      'int checkAccess(int role) {',
      '  if (role = 1) {',
      '    return 1;',
      '  }',
      '  return 0;',
      '}',
    ],
    bugLine: 1,
    explanation: 'Line 2 uses assignment `=` instead of comparison `==`, always setting `role` to 1 and granting access!',
  },
  {
    lang: 'JavaScript',
    title: 'Sort Numbers Ascending',
    lines: [
      'function sortPrices(prices) {',
      '  const copy = [...prices];',
      '  copy.sort();',
      '  return copy;',
      '}',
    ],
    bugLine: 2,
    explanation: 'Line 3 calls `.sort()` without a comparator, sorting lexicographically so `[10, 2, 1]` becomes `[1, 10, 2]`.',
  },
  {
    lang: 'Python',
    title: 'Check Even Numbers',
    lines: [
      'def filter_even(nums):',
      '    out = []',
      '    for n in nums:',
      '        if n % 2 == 1:',
      '            out.append(n)',
      '    return out',
    ],
    bugLine: 3,
    explanation: 'Line 4 checks `n % 2 == 1` (odd numbers) instead of `n % 2 == 0` (even numbers).',
  },
  {
    lang: 'JavaScript',
    title: 'Avoid Reference Mutation',
    lines: [
      'function bumpScore(player) {',
      '  const next = player;',
      '  next.score += 10;',
      '  return next;',
      '}',
    ],
    bugLine: 1,
    explanation: 'Line 2 copies the object reference instead of cloning (`{ ...player }`), mutating the original `player` object.',
  },
  {
    lang: 'Python',
    title: 'Safe Division',
    lines: [
      'def safe_divide(a, b):',
      '    result = a / b',
      '    if b == 0:',
      '        return 0',
      '    return result',
    ],
    bugLine: 1,
    explanation: 'Line 2 divides by `b` *before* checking `if b == 0`, triggering `ZeroDivisionError`.',
  },
];

export const OUTPUT_QUIZZES = [
  {
    lang: 'JavaScript',
    code: 'console.log(typeof null);',
    answer: '"object"',
    options: ['"null"', '"object"', '"undefined"', '"boolean"'],
    note: 'A famous 1995 JavaScript quirk kept forever for backward compatibility.',
  },
  {
    lang: 'JavaScript',
    code: 'console.log("5" + 3, "5" - 3);',
    answer: '"53" 2',
    options: ['8 2', '"53" 2', '"53" "2"', 'NaN 2'],
    note: '`+` concatenates when either operand is a string; `-` coerces both to numbers.',
  },
  {
    lang: 'Python',
    code: 's = "abcdef"
print(s[::-2])',
    answer: 'fdb',
    options: ['ace', 'bdf', 'fdb', 'eca'],
    note: 'Step `-2` reverses the string starting from the last index (`f`, `d`, `b`).',
  },
  {
    lang: 'JavaScript',
    code: 'console.log([1, 2] == [1, 2]);',
    answer: 'false',
    options: ['true', 'false', 'TypeError', 'undefined'],
    note: 'Arrays are objects compared by memory reference, not by value.',
  },
  {
    lang: 'Python',
    code: 'print(bool("False"))',
    answer: 'True',
    options: ['False', 'True', 'None', 'ValueError'],
    note: 'Any non-empty string in Python is truthy — even the string `"False"`.',
  },
  {
    lang: 'JavaScript',
    code: 'const a = [1, 2, 3];
a[10] = 99;
console.log(a.length);',
    answer: '11',
    options: ['4', '10', '11', 'RangeError'],
    note: 'Assigning index 10 creates sparse empty slots and sets length to `highestIndex + 1`.',
  },
  {
    lang: 'Python',
    code: 'x = [1, 2, 3]
y = x
y.append(4)
print(len(x))',
    answer: '4',
    options: ['3', '4', '0', 'TypeError'],
    note: '`y = x` binds both names to the same list object in memory.',
  },
  {
    lang: 'JavaScript',
    code: 'console.log(0.1 + 0.2 === 0.3);',
    answer: 'false',
    options: ['true', 'false', 'NaN', '0.3'],
    note: 'IEEE 754 binary floating-point produces `0.30000000000000004`.',
  },
];

export const LANG_SNIPPETS = [
  {
    code: 'fn main() {
    let mut count: i32 = 0;
    println!("Count: {}", count);
}',
    answer: 'Rust',
    options: ['Rust', 'Go', 'Swift', 'Kotlin'],
    hint: 'First released in 2010 by Mozilla; famous for ownership & memory safety without a GC.',
  },
  {
    code: 'package main
import "fmt"
func main() {
    ch := make(chan int)
    fmt.Println(ch)
}',
    answer: 'Go',
    options: ['Go', 'Rust', 'C++', 'Dart'],
    hint: 'Created at Google in 2009; known for goroutines, channels, and cloud infrastructure.',
  },
  {
    code: 'SELECT dept, COUNT(*) AS total
FROM employees
GROUP BY dept
HAVING COUNT(*) > 5;',
    answer: 'SQL',
    options: ['SQL', 'GraphQL', 'Bash', 'MATLAB'],
    hint: 'Standardized in the 1970s/80s for querying relational databases.',
  },
  {
    code: 'interface User {
  readonly id: number;
  role: "admin" | "guest";
}',
    answer: 'TypeScript',
    options: ['TypeScript', 'Java', 'C#', 'Swift'],
    hint: 'Released by Microsoft in 2012 as a strongly typed superset of JavaScript.',
  },
  {
    code: '#!/bin/bash
for f in *.log; do
  grep -q "ERROR" "$f" && echo "$f"
done',
    answer: 'Bash / Shell',
    options: ['Bash / Shell', 'Perl', 'Ruby', 'Python'],
    hint: 'Default Unix/Linux command-line scripting shell introduced in 1989.',
  },
  {
    code: 'def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a',
    answer: 'Python',
    options: ['Python', 'Ruby', 'Lua', 'Julia'],
    hint: 'Created by Guido van Rossum in 1991; uses indentation for code blocks.',
  },
  {
    code: '#include <iostream>
#include <vector>
int main() {
    std::vector<int> v = {1, 2, 3};
    std::cout << v.size();
}',
    answer: 'C++',
    options: ['C++', 'C', 'C#', 'Rust'],
    hint: 'Created by Bjarne Stroustrup in 1985; powers game engines and high-frequency systems.',
  },
  {
    code: 'data class Point(val x: Int, val y: Int)
fun main() {
    val p = Point(3, 4)
    println("x=${p.x}")
}',
    answer: 'Kotlin',
    options: ['Kotlin', 'Swift', 'Scala', 'Java'],
    hint: 'Created by JetBrains in 2011; Google’s preferred language for Android apps.',
  },
];

export const BIGO_QUESTIONS = [
  { prompt: 'Accessing an element in an array by index: `arr[42]`', answer: 'O(1)', note: 'Direct memory offset lookup takes constant time regardless of array size.' },
  { prompt: 'Binary Search on a sorted array of N items', answer: 'O(log n)', note: 'Halves the search space on every step.' },
  { prompt: 'Finding the maximum value in an unsorted array', answer: 'O(n)', note: 'Must inspect every element at least once.' },
  { prompt: 'Merge Sort worst-case time complexity', answer: 'O(n log n)', note: 'Divides in log n levels, doing O(n) merge work per level.' },
  { prompt: 'Nested loops comparing every pair `(i, j)` in an array', answer: 'O(n²)', note: 'N iterations times N inner iterations scales quadratically.' },
  { prompt: 'Hash Table average-case key lookup (`map.get(key)`)', answer: 'O(1)', note: 'Hash function maps directly to a bucket in amortized constant time.' },
  { prompt: 'Breadth-First Search (BFS) on a tree with N nodes', answer: 'O(n)', note: 'Visits each node and edge once.' },
  { prompt: 'Bubble Sort average & worst-case time complexity', answer: 'O(n²)', note: 'Repeatedly swaps adjacent out-of-order pairs across N passes.' },
  { prompt: 'Inserting into a balanced Binary Search Tree (AVL / Red-Black)', answer: 'O(log n)', note: 'Height stays logarithmic relative to N nodes.' },
  { prompt: 'Quicksort average-case time complexity', answer: 'O(n log n)', note: 'Balanced partitions split work logarithmically across N elements.' },
];

export const HTTP_GIT_QUESTIONS = [
  { tag: 'HTTP', prompt: 'Status Code 429', answer: 'Too Many Requests (rate limit exceeded)', options: ['Too Many Requests (rate limit exceeded)', 'Unauthorized (missing login)', 'Bad Gateway from upstream', 'Not Modified (use cache)'] },
  { tag: 'HTTP', prompt: 'Status Code 304', answer: 'Not Modified (cached version is still fresh)', options: ['Not Modified (cached version is still fresh)', 'Permanent Redirect to new URL', 'Request Timeout', 'Service Unavailable'] },
  { tag: 'HTTP', prompt: 'Status Code 502', answer: 'Bad Gateway (invalid response from upstream server)', options: ['Bad Gateway (invalid response from upstream server)', 'Internal Syntax Error in client JS', 'Payload Too Large', 'Forbidden Resource'] },
  { tag: 'HTTP', prompt: 'Status Code 418', answer: 'I’m a teapot (RFC 2324 April Fools Easter egg)', options: ['I’m a teapot (RFC 2324 April Fools Easter egg)', 'Payment Required', 'Gateway Timeout', 'Precondition Failed'] },
  { tag: 'HTTP', prompt: 'Status Code 403', answer: 'Forbidden (authenticated, but lacks permission)', options: ['Forbidden (authenticated, but lacks permission)', 'Not Found', 'Unauthorized (not logged in)', 'Conflict with current state'] },
  { tag: 'Git', prompt: 'git cherry-pick <commit>', answer: 'Copies one specific commit onto your current branch', options: ['Copies one specific commit onto your current branch', 'Deletes the last commit permanently', 'Squashes all commits into one', 'Reverts the entire repository to main'] },
  { tag: 'Git', prompt: 'git reset --soft HEAD~1', answer: 'Undoes the last commit while keeping changes staged', options: ['Undoes the last commit while keeping changes staged', 'Wipes your working directory changes forever', 'Pushes a force update to origin', 'Deletes the current branch'] },
  { tag: 'Linux', prompt: 'chmod 600 id_rsa', answer: 'Owner can read & write; group and others have zero access', options: ['Owner can read & write; group and others have zero access', 'Everyone can execute the file', 'Makes the file read-only for everyone', 'Changes file owner to root'] },
  { tag: 'Git', prompt: 'git stash pop', answer: 'Re-applies your latest stashed edits and removes them from stash', options: ['Re-applies your latest stashed edits and removes them from stash', 'Deletes all stashes permanently', 'Creates a new tag from HEAD', 'Merges origin/main into your branch'] },
  { tag: 'HTTP', prompt: 'Status Code 504', answer: 'Gateway Timeout (upstream server didn’t respond in time)', options: ['Gateway Timeout (upstream server didn’t respond in time)', 'Bad Request syntax', 'Method Not Allowed', 'Too Many Redirects'] },
];

export const OUTAGE_SCENARIOS = [
  {
    title: 'Flash Sale DB Meltdown',
    situation: 'Primary PostgreSQL CPU just spiked to 100% during a flash sale. Checkout latency jumped from 120ms to 9.4s.',
    choices: [
      { text: 'Enable read-replica routing & cache hot product queries in Redis', uptimeDelta: +2, latencyDelta: -65, good: true, outcome: 'Read traffic drops 75% immediately and checkout stabilizes!' },
      { text: 'Restart the database server right away with zero drain', uptimeDelta: -12, latencyDelta: +80, good: false, outcome: 'Cold cache + dropped connections cause a retry storm and 4 minutes of downtime.' },
      { text: 'Run `ALTER TABLE` to rebuild all indexes live during peak traffic', uptimeDelta: -15, latencyDelta: +120, good: false, outcome: 'Table locks freeze every active checkout query.' },
    ],
  },
  {
    title: 'Memory Leak After v2.14 Deploy',
    situation: 'Ten minutes after deploying v2.14, API containers are OOM-killing every 3 minutes.',
    choices: [
      { text: 'Roll back immediately to v2.13, then capture a heap dump in staging', uptimeDelta: +2, latencyDelta: -40, good: true, outcome: 'Rollback restores stability in 45 seconds while preserving evidence to debug safely.' },
      { text: 'Triple RAM limits and keep v2.14 running until tomorrow', uptimeDelta: -6, latencyDelta: +30, good: false, outcome: 'The leak still fills the larger containers 20 minutes later — now with bigger crash blasts.' },
      { text: 'SSH into production containers and live-edit code', uptimeDelta: -10, latencyDelta: +45, good: false, outcome: 'Auto-scaler replaces the containers anyway, wiping your hotfix.' },
    ],
  },
  {
    title: 'CDN Cache Stampede',
    situation: 'A homepage JSON endpoint cache expired simultaneously across 50,000 mobile users, hammering your origin.',
    choices: [
      { text: 'Turn on stale-while-revalidate + request coalescing at the edge', uptimeDelta: +2, latencyDelta: -55, good: true, outcome: 'Edge collapses 50k concurrent requests into 1 origin fetch.' },
      { text: 'Disable caching completely so users get fresh data', uptimeDelta: -14, latencyDelta: +110, good: false, outcome: 'Origin servers melt under 100% uncached traffic.' },
      { text: 'Return HTTP 200 with an empty array `{}` for everyone', uptimeDelta: -8, latencyDelta: -10, good: false, outcome: 'Latency looks green, but every user sees a blank broken app!' },
    ],
  },
  {
    title: 'Expired TLS Certificate',
    situation: 'Alerts fire: browsers are showing "Your connection is not private" on your main API domain.',
    choices: [
      { text: 'Renew & deploy the cert via ACME/managed edge and verify the full chain', uptimeDelta: +3, latencyDelta: -20, good: true, outcome: 'HTTPS handshakes recover globally within minutes.' },
      { text: 'Redirect all API traffic from HTTPS down to plain HTTP', uptimeDelta: -15, latencyDelta: +20, good: false, outcome: 'HSTS blocks downgrade and exposes user auth tokens in plaintext!' },
      { text: 'Tell users to clear cookies and wait 24 hours', uptimeDelta: -12, latencyDelta: +40, good: false, outcome: 'Expired certificates don’t fix themselves — outage drags on.' },
    ],
  },
  {
    title: 'Third-Party Payment Gateway Hanging',
    situation: 'Your external payment API started taking 25 seconds to time out, exhausting all backend worker threads.',
    choices: [
      { text: 'Add strict 3s timeouts + a circuit breaker with graceful retry queue', uptimeDelta: +2, latencyDelta: -60, good: true, outcome: 'Rest of the site stays fast and checkout degrades cleanly.' },
      { text: 'Increase HTTP client timeout from 25s to 120s', uptimeDelta: -14, latencyDelta: +100, good: false, outcome: 'Threads pile up 5x faster, taking down login and browsing too.' },
      { text: 'Auto-retry failed requests 10 times in a tight loop', uptimeDelta: -12, latencyDelta: +90, good: false, outcome: 'Retry storm DDoSes both your own workers and the payment provider.' },
    ],
  },
];
