# Doubao's current upload connector does not expand ${PLUGIN_ROOT} in commands.
# Locate only this plugin's manifest in the host's own installed-plugin folders.
# No configuration writes, downloads, global PATH changes or HTTP listeners.
$ErrorActionPreference = 'Stop'
$pluginRoots = @()
if ($env:PLUGIN_ROOT) { $pluginRoots += $env:PLUGIN_ROOT }
$userData = Join-Path $env:LOCALAPPDATA 'Doubao/User Data'
if (Test-Path -LiteralPath $userData) {
    foreach ($profile in Get-ChildItem -LiteralPath $userData -Directory -Force) {
        $plugins = Join-Path $profile.FullName '.doubao/agent_mode/workspace/plugins'
        if (Test-Path -LiteralPath $plugins) {
            $pluginRoots += @(Get-ChildItem -LiteralPath $plugins -Directory | ForEach-Object { $_.FullName })
        }
    }
}
$installedCandidates = @()
foreach ($candidate in ($pluginRoots | Select-Object -Unique)) {
    $manifestPath = Join-Path $candidate 'plugin.json'
    if (-not (Test-Path -LiteralPath $manifestPath)) { continue }
    try { $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json }
    catch { continue }
    if ($manifest.name -ne 'zhijian-resume') { continue }
    $runtime = Join-Path $candidate 'runtime/node.exe'
    $server = Join-Path $candidate 'dist/cli.cjs'
    if ((Test-Path -LiteralPath $runtime) -and (Test-Path -LiteralPath $server)) { $installedCandidates += $candidate }
}
if ($installedCandidates.Count -ne 1) {
    [Console]::Error.WriteLine('Zhijian Resume: expected one installed plugin. Finish plugin download, then restart the connector. Found: ' + $installedCandidates.Count)
    exit 1
}
$runtime = Join-Path $installedCandidates[0] 'runtime/node.exe'
$server = Join-Path $installedCandidates[0] 'dist/cli.cjs'
# Start outside the PowerShell native-command pipeline: preserve the host's
# original byte streams, including UTF-8 Chinese and long base64 PDF responses.
Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Threading.Tasks;
public static class ZhijianStdio {
    public static int Run(string runtime, string server) {
        var info = new ProcessStartInfo(runtime, "\"" + server + "\"");
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        info.RedirectStandardInput = true;
        info.RedirectStandardOutput = true;
        info.RedirectStandardError = true;
        using (var child = Process.Start(info)) {
            var input = Task.Run(() => {
                try {
                    var source = Console.OpenStandardInput();
                    var target = child.StandardInput.BaseStream;
                    var buffer = new byte[8192];
                    int count;
                    while ((count = source.Read(buffer, 0, buffer.Length)) > 0) {
                        target.Write(buffer, 0, count);
                        target.Flush();
                    }
                }
                finally { child.StandardInput.Close(); }
            });
            var output = Task.Run(() => child.StandardOutput.BaseStream.CopyTo(Console.OpenStandardOutput()));
            var error = Task.Run(() => child.StandardError.BaseStream.CopyTo(Console.OpenStandardError()));
            try {
                child.WaitForExit();
                Task.WaitAll(output, error);
                return child.ExitCode;
            } finally { if (!child.HasExited) child.Kill(); }
        }
    }
}
'@
exit [ZhijianStdio]::Run($runtime, $server)
