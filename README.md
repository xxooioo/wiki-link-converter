# Wiki Link Converter

[简体中文](README_ZH.md)

A plugin for converting Obsidian's Wiki-style links to custom format Markdown links.

## Features

- Auto Conversion: Monitor files in specified folders and automatically convert Wiki links to custom format
- Manual Conversion: Support converting single file through command palette or context menu
- Custom Format: Customize the target link format
- Folder Selection: Support selecting multiple folders for monitoring

## Usage

1. **Automatic Conversion**
   - Enable "Auto Convert" in settings
   - Set folders to monitor (use `/` for entire vault)
   - Wiki links will be automatically converted while editing

2. **Manual Conversion**
   - Using Command Palette: Search for "Convert Wiki Links to Custom Format" (you can also set custom hotkey)
   - Using Context Menu: Right-click on file and select "Convert Wiki Links"

## Settings

1. **Link Format**
   - Set the format for converted links
   - Use `{}` as filename placeholder
   - Example: `@/blog/{}.md` will generate `[filename](@/blog/filename.md)` (this format is suitable for zola blog internal links)

2. **Show Success Notice**
   - Control whether to show success notification in editor
   - Context menu conversion notifications are not affected by this setting

3. **Auto Convert**
   - When enabled, automatically converts Wiki links while editing
   - Only works for files in monitored folders

4. **Monitor Folders**
   - Set folders for auto-conversion
   - Support multiple folders
   - Use `/` to monitor entire vault

## License

MIT License