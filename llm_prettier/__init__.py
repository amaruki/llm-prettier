"""llm-prettier: A JSON prettier and interactive HTML viewer for LLM payloads."""

from __future__ import annotations

from typing import Any, Optional

import llm_prettier.core as core

__version__ = "0.1.0"
__all__ = ["render_html", "show", "__version__"]


def render_html(data: Any, title: str = "LLM Prettier Output") -> str:
    """
    Renders the provided dictionary/JSON data to a prettified interactive HTML tree.

    Args:
        data: The dictionary, list, or other JSON-serializable value to render.
        title: The title shown in the browser tab and page header.

    Returns:
        A string containing the full HTML document.
    """
    return core.build_template(data, title)


def show(
    data: Any,
    out_name: str = "viewer_output.html",
    title: Optional[str] = None,
) -> Optional[str]:
    """
    Renders the JSON data to an interactive HTML file and saves it to disk.

    Args:
        data: The dictionary or list to render.
        out_name: The output filename. Default is 'viewer_output.html'.
        title: The title of the HTML page. If None, derived from out_name.

    Returns:
        The absolute path to the written file on success, or None on failure.
    """
    import os

    if title is None:
        title = out_name

    html = render_html(data, title)
    try:
        with open(out_name, "w", encoding="utf-8") as f:
            f.write(html)
        abs_path = os.path.abspath(out_name)
        print(f"[SUCCESS] Generated {abs_path}")
        return abs_path
    except Exception as e:
        print(f"[ERROR] Could not save {out_name}: {e}")
        return None
