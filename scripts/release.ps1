$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
  & node scripts/package.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Package failed' }
  $package = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
  $folder = Join-Path $root "release\zhijian-resume-$($package.version)-windows"
  $zip = "$folder.zip"
  if (Test-Path -LiteralPath $zip) { throw 'Release archive already exists. Do not overwrite published artifacts.' }
  # .NET ZipFile includes dot directories such as .codex-plugin on Windows.
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::CreateFromDirectory($folder, $zip, [IO.Compression.CompressionLevel]::Optimal, $true)
  $stream = [IO.File]::OpenRead($zip)
  $sha = [Security.Cryptography.SHA256]::Create()
  try { $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
  finally { $stream.Dispose(); $sha.Dispose() }
  [IO.File]::WriteAllText("$zip.sha256", "$hash  $([IO.Path]::GetFileName($zip))`n", (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Release: $zip"
} finally { Pop-Location }
