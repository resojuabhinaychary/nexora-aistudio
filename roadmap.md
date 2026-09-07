# Nexora performance work

- [x] Confirm the presentation bottleneck in the current generation path.
- [x] Parallelize slide content generation with bounded concurrency.
- [x] Generate slide images with bounded concurrency after text is ready.
- [x] Remove artificial generation delays while preserving live progress.
- [x] Add bounded in-flight image reuse and development timing marks.
- [x] Isolate slide content failures so one failed request does not cancel the deck.
- [ ] Verify the build and inspect the live presentation screen.