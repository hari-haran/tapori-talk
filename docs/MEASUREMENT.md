# Measuring savings

Do not claim that tapori-talk itself saves tokens. Separate the effects.

## Experiment arms

| Arm | User input | Claude output | Purpose |
| --- | --- | --- | --- |
| A | Normal English | Normal Claude | Baseline |
| B | Normal English | Compact English | Isolate output brevity |
| C | tapori-talk | Compact English | Measure vernacular input effect |
| D | tapori-talk | Compact tapori-talk | Measure tapori-talk output cost |
| E | tapori-talk | Compact English plus hook | Measure full system |

## Primary metric

```text
cost per successful task = total run cost / correctly completed tasks
```

Also record:

- input and output tokens
- cache read and write tokens
- task success
- test pass rate
- elapsed time
- number of turns
- follow-up clarification required
- whether the full raw tool output had to be recovered
- human reading time

## Minimum pilot

Use at least 10 tasks, five arms, and two repetitions: 100 runs.

A more credible benchmark uses 30 tasks and three repetitions: 450 runs.

Pin:

- repository commit
- Claude Code version
- model
- effort level
- maximum turns
- permissions and environment

Use automated tests or exact expected outputs as correctness oracles where possible.

## Claim rule

Publish a savings percentage only when:

1. task success does not materially decline
2. the result is stable across repeated runs
3. the benchmark inputs and scoring method are public
4. the claim names the model, Claude Code version, workload, and date
