# COP31 public host — starts the app and the branded tunnel after Windows logon.
$ErrorActionPreference = "Continue"
$Root = "C:\Users\umut.agyuz\Desktop\COP31 SB hazilrk\web"
$Subdomain = "cop31saglikbakanligi"
Set-Location $Root

function Wait-Port([int]$Port, [int]$Seconds = 60) {
  $until = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $until) {
    try {
      $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { return $true }
    } catch {}
    Start-Sleep -Seconds 2
  }
  return $false
}

$dev = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "next\\dist\\server\\lib\\start-server" }
if (-not $dev) {
  Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory $Root -WindowStyle Hidden
}

$port = 3000
if (-not (Wait-Port 3000 45)) {
  if (Wait-Port 3001 15) { $port = 3001 } else { $port = 3000 }
}

$ngrok = Get-CimInstance Win32_Process | Where-Object { $_.Name -match "ngrok" }
if (-not $ngrok) {
  Start-Process -FilePath "ngrok" -ArgumentList "http","$port" -WindowStyle Hidden
}

