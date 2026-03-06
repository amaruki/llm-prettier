# llm-prettier

A simple, generic JSON prettier and interactive HTML viewer with a killer feature for developers working with LLM APIs: it automatically detects and parses **embedded stringified JSON**, rendering it as a full interactive tree rather than a raw escaped string.

## Features

- 🌲 **Interactive tree view** — Collapsible nodes for any JSON structure
- 🔍 **Search & filter** — `Ctrl+F` search that highlights matching keys/values with `Enter`/`Shift+Enter` navigation
- 📋 **Copy to clipboard** — Hover any value or key to copy it; click any key to copy its full JSON path
- 🗺️ **JSON path breadcrumb** — Displays the full path (e.g. `$.choices[0].message.content`) on key click
- 📊 **Stats bar** — Shows total key count, max depth, and data size at a glance
- 🔢 **Depth controls** — Collapse to depth D2, D3, D4 in addition to expand/collapse all
- 🪡 **Embedded JSON parsing** — Automatically detects and renders stringified JSON, including JSON inside Markdown code blocks (`json ... `) and XML tags (`<tool_call> ... </tool_call>`)
- 💡 **Fully local** — No external dependencies; everything runs in-browser from a single HTML file

## Installation

Using `pip`:

```bash
pip install llm-prettier
```

Using `uv` (faster):

```bash
uv pip install llm-prettier
```

After installing, the `llm-prettier` CLI will be available.

## Usage

### CLI Tool

```bash
# Prettify a JSON file (saves as viewer_<name>.html)
llm-prettier path/to/response.json

# Open in browser immediately via local server
llm-prettier path/to/response.json --serve

# Specify custom output file
llm-prettier path/to/response.json -o my_output.html

# Read from stdin
cat response.json | llm-prettier -
curl https://api.example.com/data | llm-prettier - --serve

# Custom server port
llm-prettier response.json --serve --port 8080

# Print version
llm-prettier --version

# Run it without installing globally
uv run llm-prettier response.json --serve
```

### Python API

```python
import llm_prettier

my_data = {
    "model": "gemini-flash",
    "message": {
        "content": "{\"tool_call\": {\"temperature\": 0.8}}"
    }
}

# Generate HTML string
html_str = llm_prettier.render_html(my_data, title="My LLM Response")

# Save to file; returns the absolute path on success
out_path = llm_prettier.show(my_data, out_name="viewer_mydata.html")
```

## Viewer Keyboard Shortcuts

| Key           | Action                |
| ------------- | --------------------- |
| `Ctrl+F`      | Focus search bar      |
| `Enter`       | Next search match     |
| `Shift+Enter` | Previous search match |
| `Escape`      | Clear search          |

## License

[MIT](LICENSE)
