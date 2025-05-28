<!-- README.md -->

# Structure Copy

A VS Code extension that lets you select files or folders from the Explorer, right-click, and copy their contents (with file-path headers) straight to your clipboard—either a flat list (plain) or recursive through subfolders.

## Standard Format

```text
==== {path/to/file1} ====
{file1 contents}

==== {path/to/file2} ====
{file2 contents}
```

## Features

- **Copy File(s)**  
  Select one or more files → right-click **Structure Copy** → concatenates each file’s contents (prefixed by `==== path/to/file ====`) into your clipboard.

- **Copy Plain Folder**  
  Select one or more folders → right-click **Structure Copy Folder** → copies only the files immediately under each folder.

- **Copy Recursive Folder**  
  Select one or more folders → right-click **Structure Copy Folder Recursive** → walks every subfolder and copies all files.

## Installation

1. **From the Marketplace**  
   Install “Structure Copy” directly in VS Code

2. **Side-load the VSIX**  
   ```bash
   # after building your .vsix
   code --install-extension structure-copy-0.0.1.vsix
