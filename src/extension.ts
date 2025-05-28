import * as vscode from 'vscode';
import ignore from 'ignore';

const { Uri, FileType } = vscode;
let ig = ignore();

// Load .gitignore patterns from workspace root
eventually
async function loadGitignore() {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    return;
  }
  const gitignoreUri = Uri.joinPath(ws.uri, '.gitignore');
  try {
    const data = await vscode.workspace.fs.readFile(gitignoreUri);
    const content = new TextDecoder('utf-8').decode(data);
    ig = ignore().add(content.split(/\r?\n/));
  } catch {
    ig = ignore();
  }
}

// Check if a URI should be ignored based on .gitignore
function shouldIgnore(uri: Uri): boolean {
  const relPath = vscode.workspace.asRelativePath(uri, false);
  return ig.ignores(relPath);
}

export async function activate(context: vscode.ExtensionContext) {
  await loadGitignore();

  // Copy selected file(s), skipping ignored
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'copyByExtension.copy',
      async (contextUri: Uri, selectedUris?: Uri[]) => {
        const uris = Array.isArray(selectedUris) && selectedUris.length
          ? selectedUris
          : [contextUri];

        // Filter out directories and ignored files
        const files: Uri[] = [];
        for (const u of uris) {
          try {
            const stat = await vscode.workspace.fs.stat(u);
            if (stat.type === FileType.File && !shouldIgnore(u)) {
              files.push(u);
            }
          } catch {
            // ignore errors
          }
        }

        if (files.length === 0) {
          vscode.window.showWarningMessage('No files selected to copy.');
          return;
        }

        await copyFiles(files);
      }
    )
  );

  // Copy plain folder
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'copyByExtension.copyPlain',
      async (contextUri: Uri, selectedUris?: Uri[]) => {
        const candidates = Array.isArray(selectedUris) && selectedUris.length
          ? selectedUris
          : [contextUri];
        const folders = await filterFolders(candidates);
        let allFiles: Uri[] = [];
        for (const folder of folders) {
          allFiles.push(...await scanFiles(folder, /*recursive=*/ false));
        }
        await copyFiles(allFiles);
      }
    )
  );

  // Copy recursive folder
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'copyByExtension.copyRecursive',
      async (contextUri: Uri, selectedUris?: Uri[]) => {
        const candidates = Array.isArray(selectedUris) && selectedUris.length
          ? selectedUris
          : [contextUri];
        const folders = await filterFolders(candidates);
        let allFiles: Uri[] = [];
        for (const folder of folders) {
          allFiles.push(...await scanFiles(folder, /*recursive=*/ true));
        }
        await copyFiles(allFiles);
      }
    )
  );
}

// Filter URIs to return only directories (not ignored)
async function filterFolders(uris: Uri[]): Promise<Uri[]> {
  const folders: Uri[] = [];
  for (const uri of uris) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === FileType.Directory && !shouldIgnore(uri)) {
        folders.push(uri);
      }
    } catch {
      // ignore
    }
  }
  return folders;
}

// Scan files under a folder, skipping ignored and optionally recursing
async function scanFiles(folder: Uri, recursive: boolean): Promise<Uri[]> {
  const entries = await vscode.workspace.fs.readDirectory(folder);
  let results: Uri[] = [];

  for (const [name, type] of entries) {
    const entry = Uri.joinPath(folder, name);
    if (type === FileType.File) {
      if (!shouldIgnore(entry)) {
        results.push(entry);
      }
    } else if (recursive && type === FileType.Directory) {
      if (!shouldIgnore(entry)) {
        results.push(...await scanFiles(entry, true));
      }
    }
  }

  return results;
}

// Copy contents of given URIs to clipboard
async function copyFiles(uris: Uri[]) {
  const decoder = new TextDecoder('utf-8');
  let output = '';

  for (const uri of uris) {
    const label = vscode.workspace.asRelativePath(uri, false);
    output += `==== ${label} ====\n`;
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      output += decoder.decode(bytes) + '\n\n';
    } catch {
      output += '[Error reading file]\n\n';
    }
  }

  if (!output) {
    vscode.window.showWarningMessage('No files found to copy.');
    return;
  }

  await vscode.env.clipboard.writeText(output);
  vscode.window.showInformationMessage(`Copied contents of ${uris.length} item(s).`);
}

export function deactivate() {}
