import * as vscode from 'vscode';
const { Uri, FileType } = vscode;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'copyByExtension.copyPlain',
      async (contextUri: vscode.Uri, selectedUris?: vscode.Uri[]) => {
        const candidates = Array.isArray(selectedUris) && selectedUris.length
          ? selectedUris
          : [contextUri];
        const folders = await filterFolders(candidates);
        let allFiles: vscode.Uri[] = [];
        for (const folder of folders) {
          allFiles.push(...await scanFiles(folder, /*recursive=*/ false));
        }
        await copyFiles(allFiles);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'copyByExtension.copyRecursive',
      async (contextUri: vscode.Uri, selectedUris?: vscode.Uri[]) => {
        const candidates = Array.isArray(selectedUris) && selectedUris.length
          ? selectedUris
          : [contextUri];
        const folders = await filterFolders(candidates);
        let allFiles: vscode.Uri[] = [];
        for (const folder of folders) {
          allFiles.push(...await scanFiles(folder, /*recursive=*/ true));
        }
        await copyFiles(allFiles);
      }
    )
  );
}

async function filterFolders(uris: vscode.Uri[]): Promise<vscode.Uri[]> {
  const folders: vscode.Uri[] = [];
  for (const uri of uris) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === FileType.Directory) {
        folders.push(uri);
      }
    } catch {
    }
  }
  return folders;
}

async function scanFiles(folder: vscode.Uri, recursive: boolean): Promise<vscode.Uri[]> {
  const entries = await vscode.workspace.fs.readDirectory(folder);
  let results: vscode.Uri[] = [];

  for (const [name, type] of entries) {
    const entry = Uri.joinPath(folder, name);
    if (type === FileType.File) {
      results.push(entry);
    } else if (recursive && type === FileType.Directory) {
      results.push(...await scanFiles(entry, true));
    }
  }

  return results;
}

async function copyFiles(uris: vscode.Uri[]) {
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

  if (output === '') {
    vscode.window.showWarningMessage('No files found to copy.');
    return;
  }

  await vscode.env.clipboard.writeText(output);
  vscode.window.showInformationMessage(`Copied contents of ${uris.length} file(s).`);
}

export function deactivate() {}
