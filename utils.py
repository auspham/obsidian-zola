import json
import math
import os
import re
import shutil
from dataclasses import dataclass
from datetime import datetime
from fnmatch import fnmatch
from os import environ
from pathlib import Path
from pprint import PrettyPrinter
from typing import Dict, List, Optional, Tuple, Union
from unicodedata import category
from urllib.parse import quote, unquote
import hashlib
import colorsys

from slugify import slugify

site_dir = Path(__file__).parent.absolute() / "build"
raw_dir = site_dir / "__docs"
docs_dir = site_dir / "content/docs"

# ---------------------------------------------------------------------------- #
#                                 General Utils                                #
# ---------------------------------------------------------------------------- #

# Pretty printer
pp = PrettyPrinter(indent=4, compact=False).pprint


def slugify_path(path: Union[str, Path], no_suffix: bool) -> Path:
    """Slugifies every component of a path. Note that '../xxx' will get slugified to '/xxx'. Always use absolute paths. `no_suffix=True` when path is URL or directory (slugify everything including extension)."""

    path = Path(str(path).lower())
    if no_suffix:
        os_path = "/".join(slugify(item) for item in path.parts)
        name = ""
        suffix = ""
    else:
        os_path = "/".join(slugify(item) for item in str(path.parent).split("/"))
        name = ".".join(slugify(item) for item in path.stem.split("."))
        suffix = path.suffix

    if name != "" and suffix != "":
        return Path(os_path) / f"{name}{suffix}"
    elif suffix == "":
        return Path(os_path) / name
    else:
        return Path(os_path)


# ---------------------------------------------------------------------------- #
#                               Document Classes                               #
# ---------------------------------------------------------------------------- #


@dataclass
class DocLink:
    """
    A class for internal links inside a Markdown document.
    [xxxx](yyyy<.md?>#zzzz)
    """

    combined: str
    title: str
    url: str
    md: str
    header: str

    @classmethod
    def get_links(cls, line: str) -> List["DocLink"]:
        r"""
        Factory method.
        Get non-http links [xxx](<!http>yyy<.md>#zzz).

        \[(.+?)\]: Captures title part (xxx).
        (?!http)(\S+?): Captures URL part (yyy) and discard URL that starts with http.
        (\.md)?: Captures ".md" extension (if any) to identify markdown files.
        (#\S+)?: Captures header part (#zzz).

        Returns:
            _type_: _description_
        """

        # Removed starting "[" and ending ")" such that we can identify inner links [...](...)

        return [
            cls(f"[{combined})", title, url, md, header)
            for combined, title, url, md, header in re.findall(
                r"\[((.*?)\]\((?!http)(\S*?)(\.md)?(#\S+)?)\)", line
            )
            if cls.no_inner_link(combined)
        ]

    @property
    def is_md(self) -> bool:
        """Link is a Markdown link."""
        return self.md != ""

    @staticmethod
    def no_inner_link(item: str) -> bool:
        """Check that capture link does not contain inner links."""
        return re.match(r"\[.*?\]\(\S*?\)", item) is None

    def abs_url(self, doc_path: "DocPath") -> str:
        """Returns an absolute URL based on quoted relative URL from obsidian-export."""

        if self.url is None or self.url == "":
            print(f"Empty link found: {doc_path.old_rel_path}")
            return "/404"

        try:
            new_rel_path = (
                (doc_path.new_path.parent / unquote(self.url))
                .resolve()
                .relative_to(docs_dir)
            )
            new_rel_path = quote(str(slugify_path(new_rel_path, False)))

            return f"/docs/{new_rel_path}"
        except Exception:
            print(f"Invalid link found: {doc_path.old_rel_path}")
            return "/404"

    @classmethod
    def parse(cls, line: str, doc_path: "DocPath") -> Tuple[str, List[str]]:
        """Parses and fixes all internal links in a line. Also returns linked paths for knowledge graph."""

        parsed = line
        linked: List[str] = []

        for link in cls.get_links(line):
            abs_url = link.abs_url(doc_path)
            parsed = parsed.replace(
                link.combined, f"[{link.title}]({abs_url}{link.header})"
            )
            linked.append(abs_url)

        return parsed, linked


class DocPath:
    """
    A class for any path found in the exported Obsidian directory.
    Can be a section (folder), page (Markdown file) or resource (non-Markdown file).
    """

    def __init__(self, path: Path):
        """Path parsing."""
        self.old_path = path.resolve()
        self.old_rel_path = self.old_path.relative_to(raw_dir)
        new_rel_path = self.old_rel_path

        # Take care of cases where Markdown file has a sibling directory of the same name
        if self.is_md and (self.old_path.parent / self.old_path.stem).is_dir():
            print(f"Name collision with sibling folder, renaming: {self.old_rel_path}")
            new_rel_path = self.old_rel_path.parent / (
                self.old_rel_path.stem + "-nested" + self.old_rel_path.suffix
            )

        self.new_rel_path = slugify_path(new_rel_path, not self.is_file)
        self.new_path = docs_dir / str(self.new_rel_path)

    # --------------------------------- Sections --------------------------------- #

    @property
    def section_title(self) -> str:
        """Gets the title of the section."""
        title = str(self.old_rel_path).replace('"', r"\"")
        return (
            title
            if (title != "" and title != ".")
            else "main"
        )

    @property
    def section_sidebar(self) -> str:
        """Gets the title of the section."""
        sidebar = str(self.old_rel_path).split("/")[-1]
        return (
            sidebar
            if (sidebar != "" and sidebar != ".")
            else "main"
        )

    def write_to(self, child: str, content: Union[str, List[str]]):
        """Writes content to a child path under new path."""
        new_path = self.new_path / child
        new_path.parent.mkdir(parents=True, exist_ok=True)
        with open(new_path, "w") as f:
            if isinstance(content, str):
                f.write(content)
            else:
                f.write("\n".join(content))

    # ----------------------------------- Pages ---------------------------------- #

    @property
    def page_title(self) -> str:
        """Gets the title of the page."""

        # The replacement might not be necessary, filenames cannot contain double quotes
        title = " ".join(
            [
                item if item and item[0].isupper() else item.title()
                for item in self.old_path.stem.split(" ")
            ]
        ).replace('"', r"\"")
        return title

    @property
    def is_md(self) -> bool:
        """Whether path points to a Markdown file."""
        return self.is_file and self.old_path.suffix == ".md"

    @property
    def modified(self) -> datetime:
        """Gets last modified time."""
        return datetime.fromtimestamp(os.path.getmtime(self.old_path))

    @property
    def content(self) -> List[str]:
        """Gets the lines of the file."""
        return [line for line in open(self.old_path, "r").readlines()]

    def write(self, content: Union[str, List[str]]):
        """Writes content to new path."""
        if not isinstance(content, str):
            content = "".join(content)
        self.new_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.new_path, "w") as f:
            f.write(content)

    # --------------------------------- Resources -------------------------------- #

    @property
    def is_file(self) -> bool:
        """Whether path points to a file."""
        return self.old_path.is_file()

    def copy(self):
        """Copies file from old path to new path."""
        self.new_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(self.old_path, self.new_path)

    # ----------------------------------- Graph ---------------------------------- #

    @property
    def abs_url(self) -> str:
        """Returns an absolute URL to the page."""
        assert self.is_md
        return quote(f"/docs/{str(self.new_rel_path)[:-3]}")

    def edge(self, other: str) -> Tuple[str, str]:
        """Gets an edge from page's URL to another URL."""
        return tuple(sorted([self.abs_url, other]))


# ---------------------------------------------------------------------------- #
#                                   Settings                                   #
# ---------------------------------------------------------------------------- #


class Settings:
    """
    Changes to mutable class variable fields are broadcasted across all instances no matter where the change happens.
    The class object and all instances would receive the change no matter the setting method:
    - assign to Settings.default["xxx]
    - change cls.default["xxx"] inside class method
    - assign to instance.default["xxx"]
    - change self.default["xxx"] inside instance method
    """

    # Default options
    options: Dict[str, Optional[str]] = {
        "SITE_URL": None,
        "SITE_TITLE": "Someone's Second 🧠",
        "TIMEZONE": "Asia/Hong_Kong",
        "REPO_URL": None,
        "LANDING_PAGE": None,
        "LANDING_TITLE": "I love obsidian-zola! 💖",
        "SITE_TITLE_TAB": "",
        "LANDING_DESCRIPTION": "I have nothing but intelligence.",
        "LANDING_BUTTON": "Click to steal some👆",
        "GANALYTICS": "",
        "HOME_GRAPH": "y",
        "PAGE_GRAPH": "y",
        "LOCAL_GRAPH": "",
        "STRICT_LINE_BREAKS": "y",
        "SIDEBAR_COLLAPSED": "",
        "SKIP_LANDING": "",
        "SHOW_EXCALIDRAW_LABEL": "y",
        "HIDE_SIDEBAR_PATTERNS": "assets",
        "EXCLUDE_PATTERNS": "",
        "FOOTER": "",

    }

    @classmethod
    def is_true(cls, key: str) -> bool:
        """Returns whether an option's string value is true."""
        val = cls.options[key]
        if not val:
            return False

        normalized = val.lower()
        if normalized in {"y", "yes", "t", "true", "on", "1"}:
            return True
        if normalized in {"n", "no", "f", "false", "off", "0"}:
            return False
        raise ValueError(f"invalid truth value {val!r}")

    @classmethod
    def _matches_patterns(cls, rel_path: Path, key: str) -> bool:
        """Returns whether any part of the path matches the comma-separated patterns in the given option."""
        raw = cls.options.get(key, "")
        if not raw:
            return False
        patterns = [p.strip() for p in raw.split(",") if p.strip()]
        path_str = str(rel_path)
        for pattern in patterns:
            if fnmatch(path_str, pattern):
                return True
            for part in rel_path.parts:
                if fnmatch(part, pattern):
                    return True
        return False

    @classmethod
    def matches_hide_patterns(cls, rel_path: Path) -> bool:
        """Returns whether a path matches HIDE_SIDEBAR_PATTERNS."""
        return cls._matches_patterns(rel_path, "HIDE_SIDEBAR_PATTERNS")

    @classmethod
    def matches_exclude_patterns(cls, rel_path: Path) -> bool:
        """Returns whether a path matches EXCLUDE_PATTERNS."""
        return cls._matches_patterns(rel_path, "EXCLUDE_PATTERNS")

    @classmethod
    def parse_env(cls):
        """
        Checks the env variables for required settings. Also stores the set variables.
        """

        for key in cls.options.keys():
            required = cls.options[key] is None

            if key in environ:
                cls.options[key] = environ[key]
            else:
                if required:
                    raise Exception(f"FATAL ERROR: build.environment.{key} not set!")
        if cls.options["SITE_TITLE_TAB"] == "":
            cls.options["SITE_TITLE_TAB"] = cls.options["SITE_TITLE"]
        print("Options:")
        pp(cls.options)

    @classmethod
    def sub_line(cls, line: str) -> str:
        """Substitutes variable placeholders in a line."""
        for key, val in cls.options.items():
            line = line.replace(f"___{key}___", val if val else "")
        return line

    @classmethod
    def sub_file(cls, path: Path):
        """Substitutes variable placeholders in a file."""
        content = "".join([cls.sub_line(line) for line in open(path, "r").readlines()])
        open(path, "w").write(content)


# ---------------------------------------------------------------------------- #
#                                Knowledge Graph                               #
# ---------------------------------------------------------------------------- #


def get_pastel_color(category_string):
    """
    Generates a unique, consistent pastel hex color based on a string.
    """
    # 1. Create a stable hash of the folder name
    hash_digest = hashlib.md5(category_string.encode()).hexdigest()
    
    # 2. Convert the first few chars of hash to a Hue (0.0 to 1.0)
    # We use int(hex, 16) to turn hex into a number
    hue = int(hash_digest[:4], 16) / 65535.0
    
    # 3. Set Saturation (0.5 - 0.7) and Lightness (0.8 - 0.9) for Pastels
    saturation = 0.6 
    lightness = 0.85
    
    # 4. Convert HSL to RGB
    rgb = colorsys.hls_to_rgb(hue, lightness, saturation)
    
    # 5. Convert RGB to Hex string
    return '#%02x%02x%02x' % (int(rgb[0]*255), int(rgb[1]*255), int(rgb[2]*255))

def parse_graph(nodes: Dict[str, str], edges: List[Tuple[str, str]]):
    """
    Constructs a knowledge graph from given nodes and edges.
    """

    # Assign increasing ID value to each node
    node_ids = {k: i for i, k in enumerate(nodes.keys())}

    # Filter out edges that does not connect two known nodes (i.e. ghost pages)
    existing_edges = [
        edge for edge in set(edges) if edge[0] in node_ids and edge[1] in node_ids
    ]

    # Count the number of edges connected to each node
    edge_counts = {k: 0 for k in nodes.keys()}
    for i, j in existing_edges:
        edge_counts[i] += 1
        edge_counts[j] += 1

    # Node category if more than 2 nested level, take sub folder
    node_categories = set([ key.split("/")[2 if key.count("/") < 5 else 3] for key in nodes.keys() ])
    
    # Generate graph data
    graph_info = {
        "nodes": [
            {
                "id": node_ids[url],
                "label": title,
                "url": url,
                "color": get_pastel_color(url.split("/")[-2]),
                "value": math.log10(edge_counts[url] + 1) + 1,
                "opacity": 0.1,
            }
            for url, title in nodes.items()
        ],
        "edges": [
            {"from": node_ids[edge[0]], "to": node_ids[edge[1]]}
            for edge in set(edges)
            if edge[0] in node_ids and edge[1] in node_ids
        ],
    }
    graph_info = json.dumps(graph_info)

    with open(site_dir / "static/js/graph_info.js", "w") as f:
        is_local = "true" if Settings.is_true("LOCAL_GRAPH") else "false"
        f.write(
            "\n".join(
                [
                    f"var graph_data={graph_info}",
                    f"var graph_is_local={is_local}",
                ]
            )
        )


# ---------------------------------------------------------------------------- #
#                         Write Settings to Javascript                         #
# ---------------------------------------------------------------------------- #
def write_settings():
    """
    Writes settings to Javascript file.
    """

    with open(site_dir / "static/js/settings.js", "w") as f:
        sidebar_collapsed = "true" if Settings.is_true("SIDEBAR_COLLAPSED") else "false"
        f.write(
            "\n".join(
                [
                    f"var sidebar_collapsed={sidebar_collapsed}",
                ]
            )
        )
