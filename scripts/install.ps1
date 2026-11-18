[CmdletBinding()]
param(
  [ValidateSet('', 'Local', 'ChatGPT', 'Both')][string]$Target = '',
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'Programs\ZhijianResume'),
  [switch]$SkipBuild,
  [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$projectRoot = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-JsonFile($Path, $Value) {
  [IO.File]::WriteAllText($Path, ($Value | ConvertTo-Json -Depth 20), $utf8)
}
function Invoke-Checked($Command, $Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $Command" }
}
try {
  if ($env:OS -ne 'Windows_NT') { throw 'This installer requires Windows.' }
  $node = (Get-Command node.exe -ErrorAction Stop).Source
  $nodeVersion = & $node --version
  if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(\d+\.\d+\.\d+)' -or [version]$Matches[1] -lt [version]'22.13.0') { throw 'Node.js 22.13+ is required: https://nodejs.org/' }
  $browsers = @($env:CHROME_PATH, "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe")
  $browser = $browsers | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
  if (-not $browser) { throw 'Chrome or Edge is required for PDF export. Install it or set CHROME_PATH to its executable.' }
  if ($CheckOnly) { Write-Host "Prerequisites OK. Node: $node; PDF browser: $browser"; exit 0 }
  if (-not $Target) {
    Write-Host '1. Local / Doubao (no Codex required)'
    Write-Host '2. ChatGPT desktop plugin'
    Write-Host '3. Both'
    $selection = Read-Host 'Choose [1]'
    switch ($selection) { '2' { $Target = 'ChatGPT' }; '3' { $Target = 'Both' }; '' { $Target = 'Local' }; '1' { $Target = 'Local' }; default { throw 'Choose 1, 2 or 3.' } }
  }
  $codex = $null
  if ($Target -ne 'Local') {
    $codex = Get-Command codex.cmd -ErrorAction SilentlyContinue
    if (-not $codex) { $codex = Get-Command codex -ErrorAction SilentlyContinue }
    if (-not $codex) { throw 'ChatGPT registration requires Codex CLI with plugin commands. Install it or choose Local first. See docs/chatgpt.md.' }
    Invoke-Checked $codex.Source @('plugin', '--help')
  }
  Push-Location $projectRoot
  try {
    $package = Get-Content -LiteralPath 'package.json' -Raw -Encoding UTF8 | ConvertFrom-Json
    $isSource = $null -ne $package.PSObject.Properties['scripts']
    if ($isSource -and -not $SkipBuild) {
      $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
      Invoke-Checked $npm @('ci', '--no-audit', '--no-fund')
      Invoke-Checked $npm @('run', 'build')
    }
    foreach ($name in @('dist\cli.cjs', 'dist\index.html', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md')) {
      if (-not (Test-Path -LiteralPath $name -PathType Leaf)) { throw "Missing $name. Download the complete Windows release or build from source." }
    }
    $InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
    $releaseId = "$($package.version)-$([Guid]::NewGuid().ToString('N').Substring(0,8))"
    $runtime = Join-Path $InstallRoot "versions\$releaseId"
    New-Item -ItemType Directory -Path $runtime -Force | Out-Null
    foreach ($name in @('dist', 'skills', '.codex-plugin', 'docs', 'assets', 'README.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md')) {
      Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $runtime -Recurse
    }
    foreach ($name in @('CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'TEST-REPORT.md', 'third-party')) {
      if (Test-Path -LiteralPath (Join-Path $projectRoot $name)) { Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $runtime -Recurse }
    }
    $server = @{ command = $node; args = @((Join-Path $runtime 'dist\cli.cjs')); env = @{ CHROME_PATH = $browser } }
    $config = @{ mcpServers = @{ 'zhijian-resume' = $server } }
    Write-JsonFile (Join-Path $InstallRoot 'mcp-config.json') $config
    Write-JsonFile (Join-Path $runtime '.mcp.json') $config
    $marketplace = Join-Path $InstallRoot '.agents\plugins'
    New-Item -ItemType Directory -Path $marketplace -Force | Out-Null
    Write-JsonFile (Join-Path $marketplace 'marketplace.json') @{
      name = 'zhijian-local'; interface = @{ displayName = (Get-Content -LiteralPath (Join-Path $runtime '.codex-plugin/plugin.json') -Raw -Encoding UTF8 | ConvertFrom-Json).interface.displayName }
      plugins = @(@{ name = 'zhijian-resume'; source = @{ source = 'local'; path = "./versions/$releaseId" }; policy = @{ installation = 'AVAILABLE'; authentication = 'ON_INSTALL' }; category = 'Productivity' })
    }
    $instructions = @"
Doubao > Plugins > Add > Custom connector
Name: zhijian-resume
Transport: STDIO
Command: $node
Argument (one entry): $(Join-Path $runtime 'dist\cli.cjs')
Environment: CHROME_PATH=$browser

Enable the connector, start a Local computer task, and ask to use zhijian-resume.
MCP Apps support is required for the embedded editor.
Installed runtime: $runtime
Drafts: %LOCALAPPDATA%\ZhijianResume\drafts (preserved on updates)
"@
    [IO.File]::WriteAllText((Join-Path $InstallRoot 'doubao-setup.txt'), $instructions, $utf8)
    Write-JsonFile (Join-Path $InstallRoot 'installation.json') @{ version = $package.version; runtime = $runtime; target = $Target; installedAt = [DateTime]::UtcNow.ToString('o') }
    if ($Target -ne 'Local') {
      Invoke-Checked $codex.Source @('plugin', 'marketplace', 'add', $InstallRoot)
      Invoke-Checked $codex.Source @('plugin', 'add', 'zhijian-resume@zhijian-local')
      Write-Host 'ChatGPT plugin registered. Refresh connections or start a new chat.'
    }
    Write-Host "Local installation complete: $runtime"
    Write-Host "Doubao connection fields: $(Join-Path $InstallRoot 'doubao-setup.txt')"
    Write-Host 'Doubao configuration is a manual UI step; no private host settings were modified.'
    Write-Host 'No HTTP listener, firewall changes, admin rights, or public tunnel required.'
  } finally { Pop-Location }
} catch {
  Write-Error $_ -ErrorAction Continue
  exit 1
}
