from pathlib import Path
import re
from typing import Dict, List, Tuple

from utils import (
    DocLink,
    DocPath,
    Settings,
    parse_graph,
    pp,
    raw_dir,
    site_dir,
    write_settings,
)

EXCALIDRAW_START = "````compressed-json"
EXCALIDRAW_END = "````"
EXCALIDRAW_END_SYMBOL = "%%"
EXCALIDRAW_SEPERATOR = "||||"

def sortFiles(path: Path):
    posix_path = path.as_posix().casefold()
    return ("Home.md" not in posix_path, posix_path[:posix_path.rfind("/")], path.name.casefold())

if __name__ == "__main__":

    Settings.parse_env()
    Settings.sub_file(site_dir / "config.toml")
    Settings.sub_file(site_dir / "content/_index.md")
    Settings.sub_file(site_dir / "templates/macros/footer.html")
    Settings.sub_file(site_dir / "static/js/graph.js")

    nodes: Dict[str, str] = {}
    edges: List[Tuple[str, str]] = []
    section_count = 0

    all_paths = [raw_dir, *list(sorted(raw_dir.glob("**/*"), key=sortFiles))]

    # Filter out close source not publishing online
    all_paths = [path for path in all_paths if "close sources" not in str(path).lower()]

    for i in range(0, len(all_paths)):
        path = all_paths[i]
        doc_path = DocPath(path)
        if doc_path.is_file:
            if doc_path.is_md:
                # Page
                nodes[doc_path.abs_url] = doc_path.page_title
                content = doc_path.content
                parsed_lines: List[str] = []
                is_excalidraw = False
                excalidraw_data = []
                j = 0
                while j < len(content):
                    line = content[j]

                    parsed_line, linked = DocLink.parse(line, doc_path)

                    # Fix LaTEX new lines
                    parsed_line = re.sub(r"\\\\\s*$", r"\\\\\\\\", parsed_line)

                    edges.extend([doc_path.edge(rel_path) for rel_path in linked])
                    
                    if "EXCALIDRAW VIEW" in line:
                        is_excalidraw = True
                        parsed_lines.append(f"<div class='excalidraw-preview' id='excalidraw-{j}'><div id='loading' class='spinner-border text-primary' role='status'><span class='visually-hidden'>Loading...</span></div></div>")
                        parsed_lines.append("\n") # Empty line for markdown properly render
                    
                        # We close on the second "%%"
                        end_excalidraw_symbol_count = 2
                        
                        if excalidraw_data:
                            # Previous excalidraw data is there, append the separator
                            excalidraw_data.append(EXCALIDRAW_SEPERATOR)

                        while j < len(content):
                            line: str = content[j]
                            if EXCALIDRAW_START in line:
                                j += 1 # Skip the EXCALIDRAW_START line
                                while j < len(content):
                                    line = content[j]
                                    if EXCALIDRAW_END in line and EXCALIDRAW_START not in line:
                                        break
                                    excalidraw_data.append(line.strip())
                                    j += 1
                            
                            if EXCALIDRAW_END_SYMBOL in line:
                                end_excalidraw_symbol_count -= 1

                            j += 1
                            if end_excalidraw_symbol_count == 0:
                                break
                    else:
                        parsed_lines.append(parsed_line)
                        j += 1

                previous_md = {
                    'title': None,
                    'path': None
                }
                next_md = {
                    'title': None,
                    'path': None
                }
                
                if i > 0:
                    goBack = 1
                    previous_doc_path = DocPath(all_paths[i - goBack])
                    while not previous_doc_path.is_md:
                        goBack += 1
                        previous_doc_path = DocPath(all_paths[i - goBack])
                    previous_md = {
                        "path": previous_doc_path.abs_url,
                        "title": previous_doc_path.page_title 
                    }
                
                if i < len(all_paths) - 1:
                    goNext = 1
                    next_doc_path = DocPath(all_paths[i + goNext])
                    while not next_doc_path.is_md:
                        goNext += 1
                        next_doc_path = DocPath(all_paths[i + goNext])
                    next_md = {
                        "path": next_doc_path.abs_url,
                        "title": next_doc_path.page_title
                    }
                    
                section_count += 1

                content = [
                    "---",
                    f'title: "{doc_path.page_title}"',
                    f"date: {doc_path.modified}",
                    f"updated: {doc_path.modified}",
                    "template: docs/page.html",
                    f"weight: {section_count}",
                    "extra:",
                    f"     previous:",
                    f"         title: {previous_md['title']}",
                    f"         path: {previous_md['path']}",
                    f"     next:",
                    f"         title: {next_md['title']}",
                    f"         path: {next_md['path']}",
                    f"     is_excalidraw: {is_excalidraw}",
                    f"     excalidraw_data: {''.join(excalidraw_data)}",
                    "---",
                    # To add last line-break
                    "",
                ]
                
                # if is_excalidraw:
                #     parsed_lines = []
                
                doc_path.write(["\n".join(content), *parsed_lines])
                print(f"Found page: {doc_path.new_rel_path}, doc_path.abs: {doc_path.abs_url}, path: {path}")
            else:
                # Resource
                doc_path.copy()
                print(f"Found resource: {doc_path.new_rel_path}")
        else:
            """Section"""
            # Frontmatter
            # TODO: sort_by depends on settings
            content = [
                "---",
                f'title: "{doc_path.section_title}"',
                "template: docs/section.html",
                f"sort_by: {Settings.options['SORT_BY']}",
                f"weight: {section_count}",
                "extra:",
                f"    sidebar: {doc_path.section_sidebar}",
                "---",
                # To add last line-break
                "",
            ]
            section_count += 1000 # Why? allow 1000 subitems/items inside a section
            doc_path.write_to("_index.md", "\n".join(content))
            print(f"Found section: {doc_path.new_rel_path}")

    pp(nodes)
    pp(edges)
    parse_graph(nodes, edges)
    write_settings()
