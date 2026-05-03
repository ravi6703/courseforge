// src/lib/ai/prompts/toc-fewshot.ts
//
// Few-shot examples for the /api/generate-toc Claude prompt. Each example
// is a real Board Infinity course TOC, normalised to the JSON shape the
// route expects back from Claude. Used both for prompt injection AND as
// regression fixtures when we add tests.
//
// To add more examples: structure them as ExampleTOC and append. Keep the
// total bytes under ~12KB so the prompt stays under Claude's context budget.

export interface ExampleTOC {
  inputSummary: string;     // one-line description of the input that produced this TOC
  modules: ExampleModule[];
}
export interface ExampleModule {
  title: string;
  description: string;
  duration_hours: number;
  lessons: ExampleLesson[];
}
export interface ExampleLesson {
  title: string;
  videos: { title: string; duration_minutes: number }[];
  content_items: { type: string; title: string }[];
}

export const TOC_EXAMPLES: ExampleTOC[] = [
  {
    inputSummary: "Spring Boot + MVC, 6 weeks × 6 h/wk, intermediate Java devs, project-based",
    modules: [
      {
        title: "Getting Started with Spring Boot",
        description: "Intro to Spring Boot, MVC architecture, REST controllers, project setup, and auto-configuration. Ends with a small REST API as a project milestone.",
        duration_hours: 7,
        lessons: [
          {
            title: "Introduction to Spring Boot and MVC",
            videos: [
              { title: "What is Spring Boot and Why Use It", duration_minutes: 8 },
              { title: "Setting up a Spring Boot Project", duration_minutes: 10 },
              { title: "Spring Boot Auto-Configuration Explained", duration_minutes: 9 },
            ],
            content_items: [
              { type: "reading", title: "Spring Boot vs Traditional Spring: when each shines" },
              { type: "practice_quiz", title: "Practice Quiz: Spring Boot Basics" },
            ],
          },
          {
            title: "Building REST Controllers",
            videos: [
              { title: "REST API Design Principles", duration_minutes: 9 },
              { title: "Implementing GET / POST / PUT / DELETE", duration_minutes: 14 },
              { title: "Hands-on: Build a Books API in 20 minutes", duration_minutes: 18 },
            ],
            content_items: [
              { type: "reading", title: "HTTP status codes and idempotency" },
              { type: "practice_quiz", title: "Practice Quiz: REST Controllers" },
            ],
          },
        ],
      },
      {
        title: "Data Layer and Validation",
        description: "Spring Data JPA, repository pattern, validation, exception handling, and persistence with H2 → Postgres migration walk-through.",
        duration_hours: 7,
        lessons: [
          {
            title: "Spring Data JPA and Repositories",
            videos: [
              { title: "Entities, Relationships, and the Repository Pattern", duration_minutes: 12 },
              { title: "Custom Queries with @Query and JPQL", duration_minutes: 11 },
            ],
            content_items: [
              { type: "case_study", title: "Refactoring a JDBC service to Spring Data JPA" },
              { type: "graded_quiz", title: "Graded Quiz: Persistence Layer" },
            ],
          },
        ],
      },
    ],
  },
];

/** Format examples for prompt injection. */
export function fewShotBlock(examples: ExampleTOC[] = TOC_EXAMPLES): string {
  return examples
    .map((ex, i) => `## Example ${i + 1} — input: ${ex.inputSummary}\n\n` +
      "```json\n" + JSON.stringify(ex.modules, null, 2) + "\n```")
    .join("\n\n");
}
