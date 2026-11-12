[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ScreenshotDir,

  [Parameter(Mandatory = $true)]
  [string]$OutputHtmlPath,

  [Parameter(Mandatory = $false)]
  [string]$RecipientEmail = 'nikharbechan441@gmail.com'
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Convert-ImageToDataUri {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath
  )
  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $b64 = [System.Convert]::ToBase64String($bytes)
  return "data:image/png;base64,$b64"
}

$gta6Img     = Convert-ImageToDataUri -FilePath (Join-Path $ScreenshotDir 'v5_desktop_gta6.png')
$selectorImg = Convert-ImageToDataUri -FilePath (Join-Path $ScreenshotDir 'v5_game_selector_modal.png')
$mcImg       = Convert-ImageToDataUri -FilePath (Join-Path $ScreenshotDir 'v5_desktop_minecraft.png')
$codImg      = Convert-ImageToDataUri -FilePath (Join-Path $ScreenshotDir 'v5_desktop_cod.png')
$fcImg       = Convert-ImageToDataUri -FilePath (Join-Path $ScreenshotDir 'v5_mobile_eafc.png')
$safesImg    = Convert-ImageToDataUri -FilePath (Join-Path $ScreenshotDir 'v5_mobile_safes.png')
$proImg      = Convert-ImageToDataUri -FilePath (Join-Path $ScreenshotDir 'v5_mobile_pro_modal.png')

$html = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unpause (playunpause.com) — Top 10 Games Companion & Calculator Suite</title>
</head>
<body style="margin:0;padding:24px 12px;background:#F3F7FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0B2545;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;margin:0 auto;background:#FFFFFF;border:1px solid #DDE6F0;border-radius:20px;overflow:hidden;">
    <tr>
      <td style="padding:24px 28px;background:linear-gradient(120deg,#E0F4FF 0%,#E6FAF7 55%,#FFE8EA 100%);border-bottom:1px solid #DDE6F0;">
        <div style="font-size:12px;font-weight:700;color:#0077B6;margin-bottom:4px;">Prepared for $RecipientEmail · Local Preview (Not Deployed Yet)</div>
        <h1 style="margin:0;font-size:24px;line-height:1.25;color:#0B2545;">Unpause — Top 10 Worldwide Games Companion Suite</h1>
        <p style="margin:8px 0 0;font-size:15px;color:#3D5A80;line-height:1.5;">
          Upgraded from GTA 6-only into a multi-game companion hub for the top 10 global audiences (GTA 6, Minecraft, CoD: BO6/Warzone, Fortnite, EA FC 25, Roblox, CS2, Valorant, Apex Legends, GTA Online) with domain-accurate calculators, bright Coastal Daylight design, and a universal `$6.99 All-Access Pass.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;">
        <h2 style="margin:0 0 10px;font-size:17px;color:#0B2545;">1. GTA VI Flagship Suite (212 GB Preload &amp; Thermal Receipt)</h2>
        <img src="$gta6Img" alt="GTA VI Suite" style="width:100%;height:auto;border-radius:14px;border:1px solid #DDE6F0;margin-bottom:24px;display:block;" />

        <h2 style="margin:0 0 10px;font-size:17px;color:#0B2545;">2. In-App Game Switcher (10 Worldwide Titles)</h2>
        <img src="$selectorImg" alt="Game Selector Modal" style="width:100%;height:auto;border-radius:14px;border:1px solid #DDE6F0;margin-bottom:24px;display:block;" />

        <h2 style="margin:0 0 10px;font-size:17px;color:#0B2545;">3. Minecraft Nether Portal Linker (Exact 8:1 Math &amp; Collision Guard)</h2>
        <img src="$mcImg" alt="Minecraft Nether Portal Calculator" style="width:100%;height:auto;border-radius:14px;border:1px solid #DDE6F0;margin-bottom:24px;display:block;" />

        <h2 style="margin:0 0 10px;font-size:17px;color:#0B2545;">4. Call of Duty: BO6 / Warzone (Dark Matter &amp; 3-Plate Armor TTK)</h2>
        <img src="$codImg" alt="Call of Duty Suite" style="width:100%;height:auto;border-radius:14px;border:1px solid #DDE6F0;margin-bottom:24px;display:block;" />

        <h2 style="margin:0 0 10px;font-size:17px;color:#0B2545;">5. Mobile View (EA Sports FC 25 5% Market Tax Calculator)</h2>
        <img src="$fcImg" alt="EA Sports FC 25 Mobile View" style="max-width:340px;width:100%;height:auto;border-radius:16px;border:1px solid #DDE6F0;margin-bottom:24px;display:block;" />

        <h2 style="margin:0 0 10px;font-size:17px;color:#0B2545;">6. Mobile Safe Codes Keypad Vault</h2>
        <img src="$safesImg" alt="Safe Codes Mobile" style="max-width:340px;width:100%;height:auto;border-radius:16px;border:1px solid #DDE6F0;margin-bottom:24px;display:block;" />

        <h2 style="margin:0 0 10px;font-size:17px;color:#0B2545;">7. Universal All-Access `$6.99 Lifetime Pass Modal</h2>
        <img src="$proImg" alt="All-Access Pass Modal" style="max-width:340px;width:100%;height:auto;border-radius:16px;border:1px solid #DDE6F0;display:block;" />
      </td>
    </tr>
  </table>
</body>
</html>
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutputHtmlPath, $html, $utf8NoBom)

[PSCustomObject]@{
  Status         = 'OK'
  OutputHtmlPath = $OutputHtmlPath
  Recipient      = $RecipientEmail
  SizeKB         = [math]::Round(((Get-Item -LiteralPath $OutputHtmlPath).Length / 1KB), 1)
} | ConvertTo-Json -Compress
