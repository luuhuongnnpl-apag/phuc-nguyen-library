# PN Voice Studio v0.1
Prototype local for Windows CPU, independent of the commercial desktop app.
Install Python 3.11, then run START.bat. First run requires internet for Python dependencies and model downloads. Open http://127.0.0.1:7861 if browser does not open. Use a clean 3–8 second reference, consent checkbox, and short Vietnamese text. No API key. Audio is generated locally; temporary files remain on the local machine. Do not publish voice samples or embeddings to this public repository. Delete temporary audio when no longer needed.
SDK documentation: https://docs.vieneu.io/docs/sdk/overview/
Status: source prototype, not tested on Windows or with real model weights. Dependency versions must be locked after successful testing. No Firebase writes, no production changes.
Future integration: separate authenticated studio UI and explicitly approved upload of final outputs; never expose local engine to public network. Existing Firebase functions and data remain unchanged.
