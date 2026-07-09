# STT Bake-Off

Use this workstream to choose the MVP speech-to-text provider.

## Sample Rules

- Fill all 50 rows in `samples.csv`.
- Use real Indian-English or Hinglish speech, not generated text-to-speech.
- Keep most samples between 10 and 45 seconds.
- Include at least 15 samples with domain-specific names, product terms, people names, or code identifiers.
- Store audio under `samples/` using the sample id as the file name.
- Write the exact human reference transcript before testing providers.

## Provider Rules

- Test at least two managed streaming STT providers plus one baseline.
- Enable custom vocabulary or keyword boosting where supported.
- Record cost and final-transcript latency, not just accuracy.
- Fill one row per provider per sample in `results.csv`.

## Pass Gate

The winning provider must reach at least 85% average word accuracy and at least 90% dictionary-term accuracy.

