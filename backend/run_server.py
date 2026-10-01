"""Stable backend entrypoint for Windows development.

Use this instead of `uvicorn main:app --reload` when WatchFiles reload
causes repeated restarts or hangs on Windows.
"""

import uvicorn


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info",
    )
