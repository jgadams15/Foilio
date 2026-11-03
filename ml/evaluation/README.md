# ml/evaluation

`scripts/evaluate.py` measures recognition accuracy on your own photos and writes its
visual report to `reports/report.html` (gitignored, since it contains your photos). See
[ml/README.md](../README.md#test-accuracy-on-your-own-photos).

Longer-term plans for this folder:

Scripts and reports for evaluating the recognition model: accuracy against held-out card
images, common confusion cases (e.g. similar-looking cards across sets), inference
latency, and parity checks between the mobile and web exported formats.
