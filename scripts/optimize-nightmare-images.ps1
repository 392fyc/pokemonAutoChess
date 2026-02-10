Add-Type -AssemblyName System.Drawing

$folder = "app/public/src/assets/nightmare-rewards"
$sizes = @(256, 224, 192, 176, 160, 144, 136, 128, 120, 112, 104, 96, 88, 80, 72, 64)
$minBytes = 10KB
$maxBytes = 30KB

$report = @()

Get-ChildItem $folder -Filter *.png | ForEach-Object {
  if ($_.Name -like "*_test.png") { return }

  $path = $_.FullName
  $origBytes = $_.Length
  $bytesData = [System.IO.File]::ReadAllBytes($path)
  $stream = New-Object System.IO.MemoryStream(,$bytesData)
  $img = [System.Drawing.Image]::FromStream($stream)

  $chosen = $null
  $fallbackOver = $null
  $fallbackUnder = $null

  foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($img, 0, 0, $s, $s)

    $tmp = Join-Path $folder ".tmp_resize.png"
    $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = (Get-Item $tmp).Length

    if ($bytes -le $maxBytes -and $bytes -ge $minBytes) {
      $chosen = [PSCustomObject]@{ Size = $s; Bytes = $bytes }
      Remove-Item $tmp -Force
      $g.Dispose()
      $bmp.Dispose()
      break
    }

    if ($bytes -gt $maxBytes) {
      $fallbackOver = [PSCustomObject]@{ Size = $s; Bytes = $bytes }
    }
    if ($bytes -lt $minBytes -and -not $fallbackUnder) {
      $fallbackUnder = [PSCustomObject]@{ Size = $s; Bytes = $bytes }
    }

    Remove-Item $tmp -Force
    $g.Dispose()
    $bmp.Dispose()
  }

  if (-not $chosen) {
    if ($fallbackOver) {
      $chosen = $fallbackOver
    } elseif ($fallbackUnder) {
      $chosen = $fallbackUnder
    } else {
      $chosen = [PSCustomObject]@{ Size = 96; Bytes = 0 }
    }
  }

  $outBmp = New-Object System.Drawing.Bitmap $chosen.Size, $chosen.Size
  $outG = [System.Drawing.Graphics]::FromImage($outBmp)
  $outG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $outG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $outG.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $outG.DrawImage($img, 0, 0, $chosen.Size, $chosen.Size)
  $finalTmp = Join-Path $folder ".tmp_final_$($_.BaseName).png"
  $outBmp.Save($finalTmp, [System.Drawing.Imaging.ImageFormat]::Png)

  $outG.Dispose()
  $outBmp.Dispose()
  $img.Dispose()
  $stream.Dispose()

  Move-Item -Force $finalTmp $path

  $new = Get-Item $path
  $imgCheck = [System.Drawing.Image]::FromFile($new.FullName)
  $width = $imgCheck.Width
  $height = $imgCheck.Height
  $imgCheck.Dispose()

  $report += [PSCustomObject]@{
    Name   = $new.Name
    FromKB = [math]::Round($origBytes / 1KB, 1)
    ToKB   = [math]::Round($new.Length / 1KB, 1)
    Width  = $width
    Height = $height
  }
}

$report | Sort-Object Name | Format-Table -AutoSize
