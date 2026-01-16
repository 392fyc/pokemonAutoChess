---
description: Run tests and analyze failures
argument-hint: [file or directory]
allowed-tools: Bash(pnpm *), Bash(pytest *)
---

Run tests: $ARGUMENTS

1. If it's a Python file, run `pytest $ARGUMENTS -v`
2. If it's TypeScript/JavaScript, run `pnpm test $ARGUMENTS`
3. Analyze failed tests, explain the reasons
4. If there are failures, provide suggestions for fixing them
