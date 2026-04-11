---
description: Create tasks from a PRD to guide a junior developer through implementation
---

# Rule: Generating a Task List from a PRD

## Goal

To guide an AI assistant in creating a detailed, step-by-step task list in Markdown format based on an existing Product Requirements Document (PRD). The task list should guide a developer through implementation.

## Output

- **Format:** Markdown (`.md`)
- **Location:** `/_tasks/`
- **Filename:** `tasks-[prd-file-name].md` (e.g., `tasks-prd-user-profile-editing.md`)

## Process

1.  **Receive PRD Reference:** The user points the AI to a specific PRD file
2.  **Analyze PRD:** The AI reads and analyzes the functional requirements, user stories, and other sections of the specified PRD.
3.  **Assess Current State:** Review the existing codebase to understand existing infrastructre, architectural patterns and conventions. Also, identify any existing components or features that already exist and could be relevant to the PRD requirements. Then, identify existing related files, components, and utilities that can be leveraged or need modification.
4.  **Phase 1: Generate Parent Tasks:** Based on the PRD analysis and current state assessment, create the file and generate the main, high-level tasks required to implement the feature. Use your judgement on how many high-level tasks to use. It's likely to be about 5. Present these tasks to the user in the specified format (without sub-tasks yet). Inform the user: "I have generated the high-level tasks based on the PRD. Ready to generate the sub-tasks? Respond with 'Go' to proceed."
5.  **Wait for Confirmation:** Pause and wait for the user to respond with "Go".
6.  **Phase 2: Generate Sub-Tasks with TDD Structure:** Once the user confirms, break down each parent task into smaller, actionable sub-tasks using the Red/Green/Refactor (TDD) pattern:
    - **Red Task**: Write failing test(s) that verify the acceptance criterion
    - **Green Task**: Implement minimal code to pass the test
    - **Refactor Task** (if needed): Improve code quality without breaking tests

    Ensure sub-tasks logically follow from the parent task, cover the implementation details implied by the PRD, and consider existing codebase patterns where relevant without being constrained by them.
7.  **Identify Relevant Files:** Based on the tasks and PRD, identify potential files that will need to be created or modified. List these under the `Relevant Files` section, including corresponding test files if applicable.
8.  **Generate Final Output:** Combine the parent tasks, sub-tasks, relevant files, and notes into the final Markdown structure.
9.  **Save Task List:** Save the generated document in the `/tasks/` directory with the filename `tasks-[prd-file-name].md`, where `[prd-file-name]` matches the base name of the input PRD file (e.g., if the input was `prd-user-profile-editing.md`, the output is `tasks-prd-user-profile-editing.md`).

## Output Format

The generated task list _must_ follow this structure:

```markdown
## Relevant Files

- `path/to/potential/file1.ts` - Brief description of why this file is relevant (e.g., Contains the main component for this feature).
- `path/to/file1.test.ts` - Unit tests for `file1.ts`.
- `path/to/another/file.tsx` - Brief description (e.g., API route handler for data submission).
- `path/to/another/file.test.tsx` - Unit tests for `another/file.tsx`.
- `lib/utils/helpers.ts` - Brief description (e.g., Utility functions needed for calculations).
- `lib/utils/helpers.test.ts` - Unit tests for `helpers.ts`.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [ ] 1.0 Parent Task Title
  - [ ] 1.1 [Sub-task description 1.1]
  - [ ] 1.2 [Sub-task description 1.2]
- [ ] 2.0 Parent Task Title
  - [ ] 2.1 [Sub-task description 2.1]
- [ ] 3.0 Parent Task Title (may not require sub-tasks if purely structural or configuration)
```

## Interaction Model

The process explicitly requires a pause after generating parent tasks to get user confirmation ("Go") before proceeding to generate the detailed sub-tasks. This ensures the high-level plan aligns with user expectations before diving into details.

## Test-Driven Development (TDD) Task Structuring

When generating sub-tasks, structure them following the Red/Green/Refactor pattern for Test-Driven Development:

**Example task hierarchy**:
```markdown
- [ ] 2.0 Implement Email Validation
  - [ ] 2.1 [RED] Write test: email format validation fails for invalid inputs (e.g., "user@", "example")
  - [ ] 2.2 [GREEN] Implement email regex validation + validation logic to pass 2.1 tests
  - [ ] 2.3 [RED] Write integration test: form rejects invalid email submission and shows error
  - [ ] 2.4 [GREEN] Wire validation into form submission, show error message
  - [ ] 2.5 [REFACTOR] Extract email validation into reusable `lib/validators/email.ts` utility
```

**Guidelines**:
- **RED tasks** write failing tests that verify specific acceptance criteria (from the PRD)
- **GREEN tasks** implement minimal code to pass the RED tests
- **REFACTOR tasks** improve code quality, readability, or reusability without breaking passing tests
- Tag sub-tasks with `[RED]`, `[GREEN]`, or `[REFACTOR]` for clarity
- Each test task should reference the specific acceptance criterion it validates

## Target Audience

Assume the primary reader of the task list is a **junior developer** who will implement the feature with awareness of the existing codebase context.