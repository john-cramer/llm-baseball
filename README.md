# LLM Baseball

LLM Baseball is a baseball fan site built as a qualitative demonstration of LLM coding capabilities.

Each site feature begins with a standard prompt and, when needed, the same set of supporting files. The package is provided independently to multiple language models, giving each model an opportunity to implement the feature. Every result is preserved so developers can inspect and compare what the models produced.

This project is intended for software developers and others interested in how LLMs approach practical frontend work. It is a showcase, not a leaderboard or a scientific benchmark.

## How It Works

1. A feature is defined by one prompt.
2. Optional supporting material is assembled, such as instructions, images, tabular data, or JSON files. A prompt may instead ask models to locate appropriate public data or media when web research is part of the capability being demonstrated.
3. The same prompt and supporting inputs are provided to each participating model.
4. Each model's implementation is stored in its own subdirectory, together with a copy of the prompt it received.
5. The feature's index page documents the runs and links to every functional implementation.

Model output is preserved as submitted, even when it is incomplete or non-functional. A non-functional result will be identified as such and will not receive a preview link, but its source will remain available in the repository.

## Feature Pages

Each feature has an index page that serves as the entry point for its implementations. When the information is available, the page will include:

- Model name, provider, and version
- Date of the run
- Coding environment or agent harness
- Capabilities and tools made available to the model
- Token usage and cost
- Relevant model or runtime specifications
- Functional status
- A preview link for functional implementations
- A link to the preserved source
- Brief factual notes about errors or other limitations

There is currently no score, ranking, or preferred model. The primary question is simply whether a model produced a functional page from the supplied inputs. The reporting format may evolve as the project develops.

## Repository Layout

The initial repository is expected to follow this general structure:

```text
llm-baseball/
|-- README.md
|-- index.html
`-- features/
    `-- feature-name/
        |-- index.html
        |-- supporting-files/
        |   `-- ...
        |-- model-name-1/
        |   |-- prompt.md
        |   `-- ...model output
        `-- model-name-2/
            |-- prompt.md
            `-- ...model output
```

The exact contents of a feature package may vary, but all models participating in a feature receive the same prompt and the same designated supporting inputs.

## Technology

LLM Baseball begins as a static site built with HTML, CSS, and JavaScript. Individual feature implementations should remain directly viewable in a browser unless a feature's prompt specifies otherwise.

Backend technologies may be introduced later as the project expands or as future features explore capabilities that require them.

## Project Principles

- **Consistent inputs:** Models participating in the same feature receive the same prompt and designated supporting files.
- **Preserved outputs:** Generated implementations remain available whether they succeed or fail.
- **Transparent context:** Available run details, costs, tools, and model specifications are documented.
- **Direct inspection:** Functional pages can be experienced in the browser, and source code can be inspected in the repository.
- **Qualitative results:** The project demonstrates outcomes without presenting them as a definitive measure of model quality.

## Project Status

LLM Baseball is in its initial design and development stage. The repository structure, reporting details, and implementation workflow will be refined as the first features are created.
