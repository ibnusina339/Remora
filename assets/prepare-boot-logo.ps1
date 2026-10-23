# Convert the supplied white-background wordmark for the black boot screen.
# Run from the project root after replacing assets/boot-logo.png.
Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot 'boot-logo.png'
$outputPath = Join-Path $PSScriptRoot 'boot-logo-dark.png'
$source = [System.Drawing.Bitmap]::new($sourcePath)
$output = [System.Drawing.Bitmap]::new($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($output)
try {
    $graphics.DrawImageUnscaled($source, 0, 0)
    $rectangle = [System.Drawing.Rectangle]::new(0, 0, $output.Width, $output.Height)
    $bits = $output.LockBits($rectangle, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $buffer = [byte[]]::new($bits.Stride * $bits.Height)
        [System.Runtime.InteropServices.Marshal]::Copy($bits.Scan0, $buffer, 0, $buffer.Length)
        for ($i = 0; $i -lt $buffer.Length; $i += 4) {
            $blue = [int]$buffer[$i]
            $green = [int]$buffer[$i + 1]
            $red = [int]$buffer[$i + 2]
            $lightest = [Math]::Max($red, [Math]::Max($green, $blue))
            $darkest = [Math]::Min($red, [Math]::Min($green, $blue))
            $alpha = 255 - $darkest
            if ($alpha -lt 20) {
                $buffer[$i + 3] = 0
                continue
            }
            if (($lightest - $darkest) -gt 45 -and $lightest -gt 100) {
                # Recover colored accents from the white background at their soft edges.
                for ($channel = 0; $channel -lt 3; $channel++) {
                    $value = [Math]::Round(($buffer[$i + $channel] - (255 - $alpha)) * 255 / $alpha)
                    $buffer[$i + $channel] = [byte][Math]::Max(0, [Math]::Min(255, $value))
                }
            } else {
                $buffer[$i] = $buffer[$i + 1] = $buffer[$i + 2] = 255
            }
            $buffer[$i + 3] = [byte]$alpha
        }
        [System.Runtime.InteropServices.Marshal]::Copy($buffer, 0, $bits.Scan0, $buffer.Length)
    } finally {
        $output.UnlockBits($bits)
    }
    $output.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
    $graphics.Dispose()
    $output.Dispose()
    $source.Dispose()
}
