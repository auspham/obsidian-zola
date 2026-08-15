#!/bin/bash

shopt -s extglob

if [[ ! -d __site/zola || ! -f __site/convert.py ]]; then
	echo "run.sh is only for the deployment workspace. Use ./local-run.sh from this repository."
	exit 1
fi

mkdir __obsidian
mv !(__obsidian|__site) __obsidian 

pip install python-slugify

pip install natsort

# Avoid copying over netlify.toml (will ebe exposed to public API)
echo "netlify.toml" >>__obsidian/.gitignore

# Sync Zola template contents
rsync -a __site/zola/ __site/build
rsync -a __site/content/ __site/build/content

# Use obsidian-export to export markdown content from obsidian
mkdir -p __site/build/content/docs __site/build/__docs
if [ -z "$STRICT_LINE_BREAKS" ]; then
	__site/bin/obsidian-export --frontmatter=never --hard-linebreaks --no-recursive-embeds --no-git __obsidian __site/build/__docs
else
	__site/bin/obsidian-export --frontmatter=never --no-recursive-embeds --no-git __obsidian __site/build/__docs
fi

# Run conversion script
python __site/convert.py

# Build Zola site
zola --root __site/build build --output-dir public