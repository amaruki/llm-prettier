import json
import html as html_lib
import importlib.resources as pkg_resources

# Use importlib.resources to access the packaged assets
try:
    # Python 3.9+
    from importlib.resources import files

    _ASSETS_DIR = files("llm_prettier") / "assets"

    def _read_asset(filename: str) -> str:
        return (_ASSETS_DIR / filename).read_text(encoding="utf-8")

except ImportError:
    # Fallback for older Python versions
    def _read_asset(filename: str) -> str:
        return pkg_resources.read_text("llm_prettier.assets", filename)


def _sanitize(text: str) -> str:
    """Escape HTML special characters to prevent XSS."""
    return html_lib.escape(str(text))


def build_template(json_data: object, filename: str) -> str:
    """
    Reads the HTML/CSS/JS assets and injects the JSON payload
    to generate a single, standalone HTML file.
    """
    safe_filename = _sanitize(filename)

    # 1. Load assets
    template_html = _read_asset("template.html")
    style_css = _read_asset("style.css")
    script_js = _read_asset("script.js")

    # 2. Prepare the JSON payload safely
    safe_json = json.dumps(json_data).replace("</", "<\\/")

    # 3. Inject CSS
    html = template_html.replace("/* INJECTION_STYLE */", style_css)

    # 4. Inject Title
    html = html.replace("{{title}}", safe_filename)

    # 5. Inject JS and JSON payload
    script_with_data = script_js.replace('"/* INJECTION_JSON */"', safe_json)
    script_with_data = script_with_data.replace(
        '"/* INJECTION_TITLE */"', f'"{safe_filename}"'
    )

    html = html.replace("/* INJECTION_SCRIPT */", script_with_data)

    return html
