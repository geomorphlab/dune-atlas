# Extending the atlas: layers, datasets and planets

- **Map layer**: one registry entry, usually written by a pipeline command; see [adding-a-layer.md](adding-a-layer.md).
- **Wind dataset**: a dataset folder `registry/earth/datasets/<id>/` (`dataset.yaml` plus the dataset's layer
  fragments), the stores under a new data prefix, and the dataset's facts in `app/src/core/cell/datasetinfo.ts`.
- **Planet**: the Mars atlas is built from the same app with `VITE_BODY=mars` (see [mars.md](mars.md)).

This guide is being restructured together with the code (per-planet packages under `app/src/bodies/`).
