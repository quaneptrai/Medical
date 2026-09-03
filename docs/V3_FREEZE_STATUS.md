# V3 freeze status

V3 is paused as an **experimental training candidate**. It is not the production
runtime and the local tester must not label V3 as deployed.

Current test runtime:

- retrieval model: `models/bge-m3-medical-v2-recovered-a050-fp16`
- knowledge base: `data/diseases_expanded`
- general route: hybrid retrieval with BM25 weight `0.10`
- emergency route: deterministic regex hard override plus dense-only retrieval
- semantic emergency guardrail: advisory, not an automatic UI trigger

Resume V3 only after the independently adjudicated clinical holdout exists and
the GPU preflight gates pass. Training outputs must be written to new V3 paths,
backed up to persistent storage, and must not overwrite the V2 runtime.

The tester lives under `src/web/` and is intentionally retrieval-only. Start it
after building the persistent index once. On a CUDA host, run:

```powershell
.\venv\Scripts\python.exe scripts\build_retrieval_index.py --device cuda --batch-size 32
```

The builder commits each batch and resumes after interruption. CPU is supported
with `--device cpu`, but the first complete 652-document build can take a long
time. After the index reports `[READY]`, start the UI with:

```powershell
.\venv\Scripts\python.exe scripts\run_ui.py
```

Then open `http://127.0.0.1:8000`.
