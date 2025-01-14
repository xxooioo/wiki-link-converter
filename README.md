# Wiki Link Converter

[简体中文](README_ZH.md)

A plugin for converting Obsidian's Wiki-style links to custom format Markdown links.

## Installation

### Manual installation
You can install it by copying over `main.js` and `manifest.json` to your vault folder `VaultFolder/.obsidian/plugins/wiki-link-converter/`.

### Community Plugins (Not available yet)
1. Open Obsidian Settings
2. Go to "Community Plugins"
3. Disable "Safe Mode"
4. Click "Browse" and search for "Wiki Link Converter"
5. Install and enable the plugin

## Features

- Auto Conversion: Monitor files in specified folders and automatically convert Wiki links to custom format
- Manual Conversion: Support converting single file through command palette or context menu
- Custom Format: Customize the target link format
- Folder Selection: Support selecting multiple folders for monitoring
- Live Preview: Auto-completion support for folder selection

## Usage

### Configuration

You can configure the following settings:

1. Link Format
   - Set the format for converted links
   - Use `{}` as filename placeholder
   - Example: `@/blog/{}.md` will convert `[[filename]]` to `[filename](@/blog/filename.md)`

2. Auto Conversion
   - Enable/disable automatic conversion
   - When enabled, it will monitor file changes in specified folders

3. Folder Settings
   - Add folders to monitor
   - Use `/` to represent the entire vault
   - Support multiple folders
   - Auto-completion for folder paths

### How to Use

1. Automatic Conversion
   - Enable auto conversion in settings
   - Add folders to monitor
   - Wiki links will be converted automatically while editing

2. Manual Conversion
   - Method 1: Using Command Palette (Ctrl/Cmd + P)
     - Search for "Convert Wiki Links to Custom Format"
     - Click to execute
   - Method 2: Using Context Menu
     - Right-click on file
     - Select "Convert Wiki Links"

## Examples

1. Basic Conversion
   ```
   [[filename]] -> [filename](@/blog/filename.md)
   ```

2. Custom Format Examples
   - `content/posts/{}/index.md` -> `[filename](content/posts/filename/index.md)`
   - `docs/{}` -> `[filename](docs/filename)`
   - `assets/{}.html` -> `[filename](assets/filename.html)`

## Notes

1. Link format must include `{}` as filename placeholder
2. Using `/` as folder path will process files in the entire vault
3. Auto conversion only processes files in specified folders
4. Manual conversion works for files in any location

## License

MIT License

## Author

[xxooioo](https://github.com/xxooioo)