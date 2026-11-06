# V5 demo media

The [V5 release](https://github.com/kilicerdal/playwright-ai-automation/releases/tag/v5.0.0) contains the short silent WebM recording and optional WebVTT chapter labels. The labels identify recorded scenes; they are not a transcript of spoken audio.

The video captures actual local UI execution at 1440 × 1000. It shows a passed authored control, a separate simulated missing-restock fault, expected stock 20 versus observed stock 18, evidence export, the curated fault matrix, and presentation mode. No live model is called.

Source screenshots are in docs/images/v5-showcase.png, docs/images/v5-fault-evidence.png and docs/images/v5-journey-matrix.png. Generated video and capture metadata are kept under ignored artifacts/showcase-recording, not in Git history.

To regenerate, start the V5 dashboard and PostgreSQL lab, then run:

```bash
npm run showcase:record
```

The script validates actual healthy and faulty outcomes before saving the video. It deliberately pauses for reading. Browser and local PostgreSQL prerequisites must already be installed; recording does not install software or invoke paid services.
