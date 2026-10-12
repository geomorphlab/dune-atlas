# Local development

```bash
# 1. Build the fixture (≈150 MB, ~15 s): Namib cell store + southern-Africa field pyramids + dunes
PYTHONPATH=pipeline/src python -m dune_atlas_pipeline.cli fixture --out staging/fixture

# 2. Serve it with HTTP Range + CORS (mimics R2)
python scripts/serve_data.py staging/fixture --port 8787

# 3. Run the app against it
cd app && VITE_DATA_BASE=http://127.0.0.1:8787 npm run dev

# Decode check (no server needed; uses range reads on disk)
node app/scripts/check-decode.mjs staging/fixture staging/fixture/decode_reference.json
```
